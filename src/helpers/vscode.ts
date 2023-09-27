import * as vscode from 'vscode'

/**
 * Refactor: this file has accumulated many things that are not very related,
 * the file is also called vscode which is not representative of what it does.
 */

/**
 * Previously we were reading from the file system which caused the contents to
 * be stale.
 */
export async function getDocumentText(uri: vscode.Uri): Promise<string> {
  const document = await vscode.workspace.openTextDocument(uri)
  return document.getText()
}

export async function getFileOnDiskText(uri: vscode.Uri): Promise<string> {
  const fileContentBuffer = await vscode.workspace.fs.readFile(uri)
  return fileContentBuffer.toString()
}

export async function getFilePossiblyDirtyContent(
  uri: vscode.Uri,
): Promise<string> {
  const document = await vscode.workspace.openTextDocument(uri)
  return document.getText()
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
