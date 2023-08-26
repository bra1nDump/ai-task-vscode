import * as vscode from 'vscode'

export async function getFileText(uri: vscode.Uri): Promise<string> {
  const document = await vscode.workspace.fs.readFile(uri)
  return document.toString()
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

const pendingEdits = new Map<string, Promise<void>>()
/**
 * Guarantees that the text will be appended to the document in the order it was called
 */
export async function queueAnAppendToDocument(
  document: vscode.TextDocument,
  text: string,
) {
  const previousEdit = pendingEdits.get(document.uri.toString())
  const applyEdit = async () => {
    const edit = new vscode.WorkspaceEdit()
    const end = new vscode.Position(document.lineCount + 1, 0)
    edit.insert(document.uri, end, text)
    await vscode.workspace.applyEdit(edit)
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
