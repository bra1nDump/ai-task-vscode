import * as vscode from 'vscode'

export async function openTutorialProject(
  context: vscode.ExtensionContext,
  isProduction: boolean,
) {
  const extensionPath = context.extensionPath
  console.log(`Extension is installed at: ${extensionPath}`)

  /*
   * Let's try opening a new window with the extension itself opened in the
   * route Alternatively we can adding a folder to the current workspace,
   * although I would like to avoid that.
   * Actually that's fine let's try doing that first.
   */
  const uri = vscode.Uri.joinPath(
    vscode.Uri.file(extensionPath),
    'example-projects',
    'apollo-server-bigint-issue-main',
  )

  // https://code.visualstudio.com/api/references/commands
  const openInNewWindow = isProduction
  await vscode.commands.executeCommand('vscode.openFolder', uri, {
    noRecentEntry: true,
    /*
     * In production we don't want to reuse the window - the user will be
     * confused as this will override whatever they're working on
     * Switching to a new window also sucks, but it's better than overriding
     *
     * In development we want to reuse the window so we don't lose the
     * debugging session by opening a new vscode instance.
     */
    forceNewWindow: openInNewWindow,
    forceReuseWindow: !openInNewWindow,
  })
}
