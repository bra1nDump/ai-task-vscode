import { release } from 'birds/release'
import * as vscode from 'vscode'

import { bootstrapPythonServer } from './bootstrap-python-server'

export async function activate(context: vscode.ExtensionContext) {
  console.log('activating bread extension')

  bootstrapPythonServer()

  // Commands also need to be defined in package.json
  context.subscriptions.unshift(
    vscode.commands.registerCommand('birds.release', release),
  )
}

// This method is called when your extension is deactivated
export function deactivate() {
  console.log('deactivating bread extension')
}
