import * as vscode from 'vscode'

/**
 * Most likely a major issue: if the file is not saved, the contents will be stale.
 * How can I instead read from the editor?
 * Do I need to keep track of all editors and their contents?
 *
 * Note: Contents might be stale
 * due to fs writing using workspace.fs.writeFile being not done even though the promise resolves
 * Opening document for some reason results different contents than what's on disk
 */
export async function getFileText(uri: vscode.Uri): Promise<string> {
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
    // @crust read file using workspace fs if it's not in the map
    let currentContent = documentContents.get(document.uri.toString())
    if (!currentContent) {
      const fileData = await vscode.workspace.fs.readFile(document.uri)
      currentContent = new TextDecoder().decode(fileData)
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
 */
export async function saveCurrentEditorsHackToEnsureTheFreshestContents() {
  for (const editor of vscode.window.visibleTextEditors) {
    // This will prompt the user if the editor is not currently backed by a file
    const success = await editor.document.save()
    console.log(success)
  }
}
