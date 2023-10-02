import * as assert from 'assert'
import * as vscode from 'vscode'

suite('VSCode Extension Command Tests', function () {
  // Increased timeout since these are using LLM an are thus slow
  this.timeout(60_000)
  test('ai-task.completeInlineTasks command', async () => {
    /*
     *Assuming there's a file called "helloWorld.ts" in the root workspace:
     *
     *`// @bread Parametrize this function with a name
     *export function helloWorld() {
     *  console.log(`Hello World!`)
     *}
     *`
     *
     * There's also other files in the workspace that need to be modified but
     * we're not going to assert it. This is good enough of a test that the
     * most basic functionality works. The rest should be unit tested.
     *
     * Part of the task is to create readme.md file and run an ls command with
     * output to ts-test-output.txt. Lets clean them up before the test.
     */

    // Clean up files from previous runs
    const readmeUri = vscode.Uri.joinPath(
      vscode.workspace.workspaceFolders![0].uri,
      'readme.md',
    )
    const lsTestOutputUri = vscode.Uri.joinPath(
      vscode.workspace.workspaceFolders![0].uri,
      'ls-test-output.txt',
    )

    // In case previous run failed to clean up
    try {
      await vscode.workspace.fs.delete(readmeUri)
      await vscode.workspace.fs.delete(lsTestOutputUri)
    } catch (err) {
      // Ignore errors
    }

    // Testing command is registered
    const releaseCommand = await vscode.commands
      .getCommands(true)
      .then((commands) => commands.includes('ai-task.completeInlineTasks'))

    assert.ok(
      releaseCommand,
      'Command "ai-task.completeInlineTasks" is not registered.',
    )

    // Kicking off the command
    await vscode.commands.executeCommand('ai-task.completeInlineTasks')
    console.log('Command "ai-task.completeInlineTasks" finished running')

    // Wait a bit before asserting
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Test editing of existing files works
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

    // Test creation of new files works
    const readmeDocument = await vscode.workspace.openTextDocument(readmeUri)
    const readmeDocumentText = readmeDocument.getText()
    // String hardcoded in the task within main.ts file
    assert.ok(readmeDocumentText.includes(`# User greeter app`))

    // Test running of commands works
    const lsTestOutputDocument =
      await vscode.workspace.openTextDocument(lsTestOutputUri)
    assert.ok(lsTestOutputDocument.getText().includes(`helloWorld.ts`))

    /*
     * Clean up after the test (for some reason does not actually clean
     * anything up)
     */
    await vscode.workspace.fs.delete(readmeUri)
    await vscode.workspace.fs.delete(lsTestOutputUri)
  })
})
