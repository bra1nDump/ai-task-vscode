import { chaseBreadCommand } from 'chase-bread/command'
import * as vscode from 'vscode'

export function activate(context: vscode.ExtensionContext) {
  console.log('activating bread extension')

  // Commands also need to be defined in package.json
  context.subscriptions.unshift(
    vscode.commands.registerCommand('birds.chaseBread', chaseBreadCommand),
    // WARNING: The command was deprecated because it is overlapping with the chasing bread too much
    // I have decided to include the compile errors in the chasing bread command to consolidate the code
    // vscode.commands.registerCommand('birds.chaseBugs', chaseBugsCommand),
    vscode.window.onDidChangeTextEditorSelection(changedEditorSelection),
  )
}

export function changedEditorSelection(
  event: vscode.TextEditorSelectionChangeEvent,
) {
  // Remove any decorations that were added by the extension, potentially the user is interacting with the file
  // we should remove the decorations to avoid any distractions
  //
  // Not so simple, selection gets changed when we use edit builder to apply changes produced by the LLM
  // I think we should individually subscribe somewhere within the multi file edit code to the selection change event
  // where we can only clear selection once the selection changes for the file which has already stopped editing
  //
  // Alternatively we can simply set a timeout to clear the highlight. I'm opting for the solution.
  // Though this will not work for multiple options in the future
  // event.textEditor.setDecorations(targetRangeHighlightingDecoration, [])
}
