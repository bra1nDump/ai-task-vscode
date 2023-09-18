import { completeInlineTasksCommand } from 'chase-bread/command'
import * as vscode from 'vscode'

export function activate(context: vscode.ExtensionContext) {
  console.log('activating bread extension')

  // Commands also need to be defined in package.json
  context.subscriptions.unshift(
    vscode.commands.registerCommand(
      'birds.completeInlineTasks',
      completeInlineTasksCommand,
    ),
  )

  // Kickoff on @run mention
  vscode.workspace.onDidChangeTextDocument((event) => {
    /* Ideally will want to make sure we are within a comment,
       could also be multiline and bread mention can be anywhere */
    const isRunInLine = (document: vscode.TextDocument, line: number) => {
      const lineText = document.lineAt(line).text
      return lineText.endsWith('@run')
    }

    if (
      event.contentChanges.length > 0 &&
      // only trigger on new line or space
      (event.contentChanges[0].text === '\n' ||
        event.contentChanges[0].text === ' ') &&
      // only trigger if @run is in the line
      isRunInLine(event.document, event.contentChanges[0].range.start.line)
    ) {
      /* Previously I was undoing the enter change,
         but it introduces additional jitter to the user experience */
      void vscode.commands.executeCommand('birds.completeInlineTasks')
    }
  })
}
