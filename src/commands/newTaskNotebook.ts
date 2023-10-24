import {
  createAndOpenEmptyDocument,
  findMostRecentSessionLogIndexPrefix,
  getBreadIdentifier,
} from 'session'
import * as vscode from 'vscode'

export async function newTaskNotebook() {
  const taskMagicIdentifier = getBreadIdentifier()
  const sessionsDirectory = vscode.Uri.joinPath(
    vscode.workspace.workspaceFolders![0].uri,
    `.${taskMagicIdentifier}/sessions`,
  )
  const nextIndex =
    (await findMostRecentSessionLogIndexPrefix(sessionsDirectory)) + 1

  const shortWeekday = new Date().toLocaleString('en-US', {
    weekday: 'short',
  })
  const sessionNameBeforeAddingTopicSuffix = `${nextIndex}-${shortWeekday}.task`
  const newNotebookDocument = await createAndOpenEmptyDocument(
    sessionsDirectory,
    sessionNameBeforeAddingTopicSuffix,
  )

  const notebook = await vscode.workspace.openNotebookDocument(
    newNotebookDocument.uri,
  )

  await vscode.window.showNotebookDocument(notebook, {
    viewColumn: vscode.ViewColumn.Two,
  })

  await vscode.commands.executeCommand('notebook.focusBottom')
  await vscode.commands.executeCommand('notebook.cell.insertMarkdownCellBelow')

  if (notebook.cellCount === 0) {
    void vscode.window.showErrorMessage(
      `No cells in the notebook, most likely a bug`,
    )
    throw new Error(`No cells in the notebook, most likely a bug`)
  }

  const lastCell = notebook.getCells().slice(-1)[0]

  const cellDocumentEditorMaybe = await vscode.window.showTextDocument(
    lastCell.document,
  )

  await cellDocumentEditorMaybe.edit((editBuilder) => {
    editBuilder.insert(
      new vscode.Position(0, 0),
      `Ask questions<br>
<font size="1">- Try typing a question, for example how to write a function in python?</font><br>
<font size="1">- Hit run or \`Shift+Enter\`</font><br>

Add file information<br>
<font size="1">- Visible files are included by default</font><br>
<font size="1">- Include all open tabs by including \`@${'tabs'}\` in your question</font><br>

[Beta] Edit code directly in your files<br>
<font size="1">- Open the file you want to edit and create a comment with \`@${'task'}\` in it</font><br>
<font size="1">- Explain how you want to modify your code</font><br>
<font size="1">- Hit 'Run @task' button above the comment to start editing</font><br>

<font size="2">[Join Discord to support the project and get help!](https://discord.gg/D8V6Rc63wQ)</font>`,
    )
  })

  await vscode.commands.executeCommand('notebook.cell.quitEdit')

  await vscode.commands.executeCommand('notebook.cell.insertCodeCellBelow')

  return notebook
}
