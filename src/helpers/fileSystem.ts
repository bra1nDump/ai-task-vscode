import { getBreadIdentifier } from 'session'
import * as vscode from 'vscode'
import { Result, resultMap, resultWithDefault } from './result'
import { throwingPromiseToResult } from './catchAsync'

export async function openTextDocument(
  uri: vscode.Uri,
): Promise<Result<vscode.TextDocument, unknown>> {
  return await throwingPromiseToResult(vscode.workspace.openTextDocument(uri))
}

/**
 * Previously we were reading from the file system which caused the contents to
 * be stale.
 */
export async function getDocumentText(
  uri: vscode.Uri,
): Promise<Result<string, unknown>> {
  return resultMap(
    (document) => document.getText(),
    await openTextDocument(uri),
  )
}

export async function getFileOnDiskText(uri: vscode.Uri): Promise<string> {
  const fileContentBuffer = await vscode.workspace.fs.readFile(uri)
  return fileContentBuffer.toString()
}

export function findFilesMatchingPartialPath(
  allPossibleUris: vscode.Uri[],
  path: string,
): vscode.Uri[] {
  return allPossibleUris.filter((uri) => uri.path.includes(path))
}

export function findSingleFileMatchingPartialPath(
  allPossibleUris: vscode.Uri[],
  path: string,
): vscode.Uri | undefined {
  const matchingFiles = findFilesMatchingPartialPath(allPossibleUris, path)
  if (matchingFiles.length > 1 || matchingFiles.length === 0) {
    return undefined
  }

  return matchingFiles[0]
}

/**
 * Guarantees that the text will be appended to the document in the order it
 * was called. Usually should not be awaited, use void operator to explicitly
 * not await.
 */
const pendingEdits = new Map<string, Promise<void>>()
const documentContents = new Map<string, string>()
export async function queueAnAppendToDocument(
  document: vscode.TextDocument,
  text: string,
) {
  const path = document.uri.path
  const previousEdit = pendingEdits.get(path)
  const applyEdit = async () => {
    let currentContent = documentContents.get(path)
    if (!currentContent) {
      currentContent = document.getText()
      documentContents.set(path, currentContent)
    }
    const newContent = currentContent + text
    documentContents.set(path, newContent)
    const data = new TextEncoder().encode(newContent)

    /* Pretty sure this causes a flicker
     * Previously we were using workplace edits but that has caused unnecessary
     * tabs to open. Potential workaround is to right to the file system for
     * the detailed log file and workplace edits for high level markdown file
     * while also opening it in the same tab group as the preview ? We do want
     * to keep the same queue abstraction to avoid races for both Honestly just
     * duplicate the code, it's super small
     */
    await vscode.workspace.fs.writeFile(document.uri, data)
  }

  const editPromise = previousEdit ? previousEdit.then(applyEdit) : applyEdit()
  pendingEdits.set(document.uri.toString(), editPromise)

  await editPromise
}

/**
 * Improvement ideas:
 * Find a package that does glob and respects .gitignore
 *
 * Uggh, it will be kinda tough to create the correct glob pattern
 * Tests for this functionality https://github.com/microsoft/vscode/blob/69b2435e14e5dbd442df58efcc72c28ad81e1ac2/extensions/configuration-editing/src/test/completion.test.ts#L204
 * On top of that finding findFiles only accepts a single negative glob
 * pattern, which is not enough for us Glob pattern docs
 * https://code.visualstudio.com/api/references/vscode-api#GlobPattern
 * Note findFiles does not respect the exclude search.exclude, only
 * filesexclude by default this has caused node_modules to be included in the
 * search :(
 *
 * Relative path match https://code.visualstudio.com/api/references/vscode-api#RelativePattern
 * Do so for each folder in the workspace
 * For now lets just hardcode the src folder
 * I probably should just use a different finder at this point - ignore files
 * in .gitignore
 *   this also needs recursive search so ... later
 *
 * Fix: does not include documents when its not saved
 */
export async function safeWorkspaceQueryAllFiles(): Promise<vscode.Uri[]> {
  const config = vscode.workspace.getConfiguration('ai-task')

  const defaultExcludedDirectories = [
    'node_modules',
    '.git',
    'out',
    'dist',
    `.${getBreadIdentifier()}`,
    '.vscode-test',
  ]
  const ignorePatterns = config.get<string[]>('ignorePatterns') ?? []
  const excludedDirectories = [...defaultExcludedDirectories, ...ignorePatterns]

  /* WARNING: We want to limit the files to text files only,
   * we are making a pretty hard assumption that all the files we're trying to
   * open are text files. This has crashed the extension previously */
  const allFilesInWorkspace = await vscode.workspace.findFiles(
    '**/*.{ts,md,js,jsx,tsx,html,css,scss,less,json,yml,yaml,txt}',
    `**/{${excludedDirectories.join(',')}}`,
    1000,
  )

  if (allFilesInWorkspace.length === 0) {
    throw new Error('No files in workspace')
  } else if (allFilesInWorkspace.length > 200) {
    throw new Error(`Too many files matched: ${allFilesInWorkspace.length}`)
  }

  return allFilesInWorkspace
}

export async function getFilesContent(uris: vscode.Uri[]): Promise<string[]> {
  const fileContents = await Promise.all(
    uris.map(async (uri) => {
      return resultWithDefault<undefined | string>(
        undefined,
        await getDocumentText(uri),
      )
    }),
  )
  return fileContents.filter((x): x is string => x !== undefined)
}
