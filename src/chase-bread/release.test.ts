import * as assert from 'assert'
import * as vscode from 'vscode'

suite('VSCode Extension Command Tests', function () {
  // Increased timeout since these are using LLM an are thus slow
  this.timeout(60_000)
  test('ai-task.completeInlineTasks command', async () => {
    /*
    Assuming there's a file called "helloWorld.ts" in the root workspace:

    `// @bread Parametrize this function with a name
    export function helloWorld() {
      console.log(`Hello World!`)
    }
    `

     * There's also other files in the workspace that need to be modified but
     * we're not going to assert it. This is good enough of a test that the
     * most basic functionality works. The rest should be unit tested.
    */

    const releaseCommand = await vscode.commands
      .getCommands(true)
      .then((commands) => commands.includes('ai-task.completeInlineTasks'))

    assert.ok(
      releaseCommand,
      'Command "ai-task.completeInlineTasks" is not registered.',
    )

    await vscode.commands.executeCommand('ai-task.completeInlineTasks')
    console.log('Command "ai-task.completeInlineTasks" finished running')

    const helloWorldUri = vscode.Uri.joinPath(
      vscode.workspace.workspaceFolders![0].uri,
      'helloWorld.ts',
    )
    const helloWorldDocument =
      await vscode.workspace.openTextDocument(helloWorldUri)
    const helloWorldDocumentText = helloWorldDocument.getText()
    assert.equal(
      helloWorldDocumentText,
      `export function helloWorld(name: string) {
  console.log(\`Hello \${name}!\`)
}
`,
    )
  })
})
