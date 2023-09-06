import * as vscode from 'vscode'

/**
 * Previously we were reading from the file system which caused the contents to be stale.
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

export function getFullFileRange(fileText: string): vscode.Range {
  return new vscode.Range(
    0,
    0,
    fileText.split('\n').length - 1,
    fileText.length,
  )
}

export async function findFilesMatchingPartialPath(
  path: string,
): Promise<vscode.Uri[]> {
  const workspaceFilesWithMatchingNames = await vscode.workspace.findFiles(
    `**/${path}`,
  )

  return workspaceFilesWithMatchingNames
}

export async function findSingleFileMatchingPartialPath(
  path: string,
): Promise<vscode.Uri | undefined> {
  const matchingFiles = await findFilesMatchingPartialPath(path)
  if (matchingFiles.length > 1) return undefined

  return matchingFiles[0]
}

/**
 * Guarantees that the text will be appended to the document in the order it was called.
 */
const pendingEdits = new Map<string, Promise<void>>()
const documentContents = new Map<string, string>()
export async function queueAnAppendToDocument(
  document: vscode.TextDocument,
  text: string,
) {
  const previousEdit = pendingEdits.get(document.uri.toString())
  const applyEdit = async () => {
    let currentContent = documentContents.get(document.uri.toString())
    if (!currentContent) {
      currentContent = document.getText()
      documentContents.set(document.uri.toString(), currentContent)
    }
    const newContent = currentContent + text
    documentContents.set(document.uri.toString(), newContent)
    const data = new TextEncoder().encode(newContent)
    await vscode.workspace.fs.writeFile(document.uri, data)
  }

  const editPromise = previousEdit ? previousEdit.then(applyEdit) : applyEdit()
  pendingEdits.set(document.uri.toString(), editPromise)

  await editPromise
}

/**
 * We don't want the content on disk to be stale for the currently opened editors
 * because this is where we're reading the context from
 * Hack :( first of the day lol
 * More details in @mapToResolvedChanges
 * Does not actually save all the editors.
 * See extension.ts for beginning of work towards fixing this
 *
 * Undesired side effect:
 * Will prompt the user if the editor is not currently backed by a file on disk
 * to pick a name and save it in some location
 *
 * No longer necessary when we're reading from the document instead of the file system
 */
// export async function saveCurrentEditorsHackToEnsureTheFreshestContents() {
//   for (const editor of vscode.window.visibleTextEditors)
//     await editor.document.save()
// }
