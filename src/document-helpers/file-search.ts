import * as vscode from 'vscode'

import { getDocumentText } from 'helpers/vscode'
import { getBreadIdentifier } from 'session'

/**
 * Find all files in the workspace with @breadIdentifier mention
 */
export async function findAndCollectBreadMentionedFiles(
  breadIdentifier: string,
): Promise<vscode.Uri[]> {
  const allFilesInWorkspace = await safeWorkspaceQueryAllFiles()

  const fileContexts = await Promise.all(
    allFilesInWorkspace.map(
      async (fileUri): Promise<vscode.Uri | undefined> => {
        const fileText = await getDocumentText(fileUri)
        const containsBreadMention = fileText.includes(`@${breadIdentifier}`)

        if (containsBreadMention) {
          return fileUri
        } else {
          return undefined
        }
      },
    ),
  )

  const filteredFileContexts = fileContexts.filter(
    (fileContext): fileContext is vscode.Uri => fileContext !== undefined,
  )

  return filteredFileContexts
}

/**
 * Find all files in the workspace with bread sub-extension
 */
export async function findAndCollectDotBreadFiles(
  breadIdentifier: string,
): Promise<vscode.Uri[]> {
  const allFilesInWorkspace = await safeWorkspaceQueryAllFiles()

  const fileContexts = allFilesInWorkspace.flatMap((fileUri) => {
    const isBreadDotfile = fileUri.path.includes(`.${breadIdentifier}`)

    if (isBreadDotfile) {
      return [fileUri]
    } else {
      return []
    }
  })

  return fileContexts
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
 */

async function safeWorkspaceQueryAllFiles(): Promise<vscode.Uri[]> {
  const config = vscode.workspace.getConfiguration('ai-task')

  const defaultExcludedDirectories = [
    'node_modules',
    '.git',
    'out',
    'dist',
    `.${getBreadIdentifier()}`,
    '.vscode-test',
  ]
  const additionalExcludedDirectories =
    config.get<string[]>('additionalExcludedDirectories') ?? []
  const excludedDirectories = [
    ...defaultExcludedDirectories,
    ...additionalExcludedDirectories,
  ]

  const allFilesInWorkspace = await vscode.workspace.findFiles(
    '**/*.{ts,md,js,jsx,tsx,html,css,scss,less,json,yml,yaml}',
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
  return Promise.all(
    uris.map(async (uri) => {
      const document = await vscode.workspace.openTextDocument(uri)
      return document.getText()
    }),
  )
}
