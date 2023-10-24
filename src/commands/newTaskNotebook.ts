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
      `#### How to ask questions:
- Try typing a question, for example how to write a function in python?
- Hit plan or \`Shift+Enter\` to get an answer from GPT-4

#### How to add file information:
- The currently visible files in the editor will be included by default
- Include open tabs by including \`@${'tabs'}\` in your question

#### [Beta] To edit code directly in your files:
- Open the file you want to edit and create a comment with \`@${'task'}\` in it
- Add details about what you want to do in the comment
- Hit 'Run @task' right above the comment to start editing

  [Join Discord to support the project and get help!](https://discord.gg/D8V6Rc63wQ)
`,
    )
  })

  await vscode.commands.executeCommand('notebook.cell.quitEdit')

  await vscode.commands.executeCommand('notebook.cell.insertCodeCellBelow')

  return notebook
}
