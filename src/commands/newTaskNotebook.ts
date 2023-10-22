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
    return
  }

  const lastCell = notebook.getCells().slice(-1)[0]

  const cellDocumentEditorMaybe = await vscode.window.showTextDocument(
    lastCell.document,
  )

  await cellDocumentEditorMaybe.edit((editBuilder) => {
    editBuilder.insert(
      new vscode.Position(0, 0),
      `## Working with task notebook

### Create a cell with \`+Code\` button
    
##### Communicating with GPT  
  You can easily communicate with GPT by creating a cell and asking it a question.
      
##### Editing Code   
  If you wish to start editing code, simply type the command \`@run\` in your cell.
      
##### Creating Notes
  You can also create notes for yourself using Markdown capabilities. Just create a new cell and start writing your note, using the Markdown syntax for formatting.

  [Join Discord to submit feedback](https://discord.gg/D8V6Rc63wQ)
`,
    )
  })

  await vscode.commands.executeCommand('notebook.cell.quitEdit')
}
