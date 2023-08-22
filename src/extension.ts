import { chaseBread } from 'chase-bread/command'
import * as vscode from 'vscode'

export function activate(context: vscode.ExtensionContext) {
  console.log('activating bread extension')

  // Commands also need to be defined in package.json
  context.subscriptions.unshift(
    vscode.commands.registerCommand('birds.feed', chaseBread),
  )
}

// This method is called when your extension is deactivated
export function deactivate() {
  console.log('deactivating bread extension')
}
