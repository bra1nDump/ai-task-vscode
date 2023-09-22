import { completeInlineTasksCommand } from 'chase-bread/command'
import { SessionContext } from 'session'
import * as vscode from 'vscode'

export function activate(context: vscode.ExtensionContext) {
  console.log('activating bread extension')

  // Poor men's dependency injection
  const sessionRegistry = new Map<string, SessionContext>()
  const commandWithBoundSession = completeInlineTasksCommand.bind({
    extensionContext: context,
    sessionRegistry,
  })

  // Commands also need to be defined in package.json
  context.subscriptions.unshift(
    vscode.commands.registerCommand(
      'ai-task.completeInlineTasks',
      commandWithBoundSession,
    ),
  )

  context.subscriptions.unshift(
    /* Not sure how to register a command on enter,
     * markdown formatter extension I believe does have this key binding and it
     * inserts - if the previous line was a list item
     */
    /* vscode.commands.registerCommand(
         'ai-task.onEnterKey',
         (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit) => {
           // Insert a line of text at the current cursor position
           const position = textEditor.selection.active
           edit.insert(position, 'You pressed the enter key!')
         },
       ), */

    // Kickoff on @run mention
    vscode.workspace.onDidChangeTextDocument((event) => {
      /* Ideally will want to make sure we are within a comment,
       could also be multiline and bread mention can be anywhere */
      const isRunInLine = (document: vscode.TextDocument, line: number) => {
        const lineText = document.lineAt(line).text
        return lineText.includes('@run')
      }

      if (
        event.contentChanges.length > 0 &&
        /* only trigger on new line or space
         * I use starts with because some extensions might modify the text
         * before the edit, for example in typescript doc string it will add
         * another * to the new line
         */
        (event.contentChanges[0].text.startsWith('\n') ||
          event.contentChanges[0].text === ' ') &&
        // only trigger if @run is in the line
        isRunInLine(event.document, event.contentChanges[0].range.start.line)
      ) {
        console.log('triggering command trough @run mention')
        /* Previously I was undoing the enter change,
         but it introduces additional jitter to the user experience */
        void commandWithBoundSession()
      }
    }),
  )
}
