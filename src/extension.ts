import { chaseBreadCommand } from 'chase-bread/command'
import { chaseBugsCommand } from 'chase-bugs/command'
import * as vscode from 'vscode'

export function activate(context: vscode.ExtensionContext) {
  console.log('activating bread extension')

  // Commands also need to be defined in package.json
  context.subscriptions.unshift(
    vscode.commands.registerCommand('birds.chaseBread', chaseBreadCommand),
    vscode.commands.registerCommand('birds.chaseBugs', chaseBugsCommand),
    vscode.window.onDidChangeActiveTextEditor(visibleTextEditorWatcher),
    vscode.window.onDidChangeTextEditorSelection(changedEditorSelection),
  )
}

// This method is called when your extension is deactivated
export function deactivate() {
  console.log('deactivating bread extension')
}

/*
These fucntions are to keep track of the content in editor to use it as source of truth
even when editors become invisible (aka become inactive tabs)

ON a second though, I think that using tabs api you can get uris and you can call workspace.openDocument(uri)
which will not do anything if its already opened - and say dirty in the editor. The point is you can get the 
dirty text from it!

So I need to stop using fs.readFile and open documents document.getText() instead
*/
export function visibleTextEditorWatcher(
  editor: vscode.TextEditor | undefined,
) {
  // console.log('Visible text editor changed')
}

export function changedEditorSelection(
  event: vscode.TextEditorSelectionChangeEvent,
) {
  const editorThatChanged = event.textEditor
  const cachedContent = editorThatChanged.document.getText()

  // console.log('editorSelectionChanged, new content: ', cachedContent)
}
