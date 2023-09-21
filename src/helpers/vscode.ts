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
  if (matchingFiles.length > 1) {
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
 * Read all documents opened as tabs in vscode.
 * Useful when the setting suggests to include all open files in the workspace
 * on performing tasks
 *
 * Bug: does not respect ignored files, hack - ignore markdown files.
 * Proper fix - we want to have a registry of files in the project we consider
 * to be included in context. Currently we do a safeWorkspaceSearch for that
 * but we don't want to do it every time.
 *
 * Intermediate solution: store the uris of 'good' files in the session context.
 */

export function openedTabs(): vscode.Uri[] {
  const tabs = vscode.window.tabGroups.all.flatMap((tabGroup) => tabGroup.tabs)
  return tabsToUris(tabs)
}

export function tabsToUris(tabs: readonly vscode.Tab[]): vscode.Uri[] {
  return tabs.flatMap((tab) => {
    if (
      tab.input instanceof vscode.TabInputText &&
      tab.input.uri.scheme === 'file' &&
      !tab.input.uri.path.includes('.task/sessions')
    ) {
      return [tab.input.uri]
    } else {
      return []
    }
  })
}
