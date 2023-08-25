import * as vscode from 'vscode'

export async function showRealtimeFeedbackEditor(): Promise<vscode.TextDocument> {
  const prettyPrintedDateWithTimeShort = new Date()
    .toLocaleString('en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
    // Replace : and / with - to make it a valid file name, otherwise it will create a bunch of nested directories
    .replace(/[:/]/g, '-')
  const newSessionPath = vscode.Uri.joinPath(
    vscode.workspace.workspaceFolders![0].uri,
    '.bread/sessions',
    `${prettyPrintedDateWithTimeShort}.session.md`,
  )
  await vscode.workspace.fs.writeFile(newSessionPath, new Uint8Array())
  // VSCode is known to be slow to update the file system
  await new Promise((resolve) => setTimeout(resolve, 100))

  // Capture currently active editor to then restore its focus
  // otherwise all files we open we'll get opened in the second editor group
  // it has the session preview
  // Alternatively I can force open in first column
  const cachedActiveEditor = vscode.window.activeTextEditor
  const scriptOutputDocument =
    await vscode.workspace.openTextDocument(newSessionPath)

  // Instead of writing out
  // await vscode.window.showTextDocument(
  //   scriptOutputDocument,
  //   vscode.ViewColumn.Two,
  // )
  // VSCode open preview for markdown file
  await vscode.commands.executeCommand(
    'markdown.showPreview',
    newSessionPath,
    cachedActiveEditor ? vscode.ViewColumn.Beside : vscode.ViewColumn.Two,
  )
  // I wonder how cold represents the markdown preview.
  // I assume it similar to output we'll show up within the visible editor list
  // For now ignore
  // Start listening to closed files, this is how I will know to interrupt the session
  // Restore the old editor if necessary
  if (cachedActiveEditor)
    await vscode.window.showTextDocument(
      cachedActiveEditor.document,
      cachedActiveEditor.viewColumn,
    )
  return scriptOutputDocument
}
