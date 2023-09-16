import { chaseBreadCommand } from 'chase-bread/command'
import * as vscode from 'vscode'

export function activate(context: vscode.ExtensionContext) {
  console.log('activating bread extension')

  // Commands also need to be defined in package.json
  context.subscriptions.unshift(
    vscode.commands.registerCommand('birds.chaseBread', chaseBreadCommand),
  )

  // Kickoff on @run mention
  vscode.workspace.onDidChangeTextDocument((event) => {
    /* Ideally will want to make sure we are within a comment,
       could also be multiline and bread mention can be anywhere */
    const isRunInLine = (document: vscode.TextDocument, line: number) => {
      const lineText = document.lineAt(line).text
      // const breadIdentifier = getBreadIdentifier()

      return lineText.endsWith('@run')
    }

    if (
      event.contentChanges.length > 0 &&
      event.contentChanges[0].text !== '' && // not a delete
      // event.contentChanges.every((change) => change.text === '\n') &&
      isRunInLine(event.document, event.contentChanges[0].range.start.line)
    ) {
      // await undoInsertChanges([event])
      void vscode.commands.executeCommand('birds.chaseBread')
    }
  })
}
