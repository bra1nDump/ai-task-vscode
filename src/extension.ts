import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('activating bread extension')

	// Commands also need to be defined in package.json
	context.subscriptions.unshift(
		vscode.commands.registerCommand('bread.run', run)
	)
}

// This method is called when your extension is deactivated
export function deactivate() {}

/**
 * Collect all files with @bread mention
 * Pack the files along with the diff generation prompts
 * Call openai api (through langchain)
 * Parse the diffs and apply them to the files (in place for now)
 */
async function run() {
	console.log('running bread')

	
}
