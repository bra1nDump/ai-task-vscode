import * as assert from 'assert'
import * as vscode from 'vscode'

suite('VSCode Extension Command Tests', function () {
  // Increased timeout since these are using LLM an are thus slow
  this.timeout(120_000)
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

    /*
     * We are now only picking up tasks from open tabs.
     * Make sure all the files are opened as tabs as they would be in a real
     * scenario.
     */
    async function openAndShowFile(fileName: string) {
      const fileUri = vscode.Uri.joinPath(
        vscode.workspace.workspaceFolders![0].uri,
        fileName,
      )
      const document = await vscode.workspace.openTextDocument(fileUri)
      const editor = await vscode.window.showTextDocument(
        document,
        // To ensure all tabs remain open
        vscode.ViewColumn.Beside,
      )
      // Sleep a bit to make sure the file is opened
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    /*
     * Open and show required files
     * All files need to be open to be considered for modification were only
     * searching four tasks within open tabs
     */
    await openAndShowFile('main.ts')
    await openAndShowFile('environment.ts')
    await openAndShowFile('helloWorld.ts')

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

    // Wait a execution from controller
    await new Promise((resolve) => setTimeout(resolve, 100_000))

    // Test editing of existing files works
    const helloWorldUri = vscode.Uri.joinPath(
      vscode.workspace.workspaceFolders![0].uri,
      'helloWorld.ts',
    )
    const helloWorldDocument =
      await vscode.workspace.openTextDocument(helloWorldUri)
    const helloWorldDocumentText = helloWorldDocument.getText()

    const endOfLine =
      helloWorldDocument.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n'

    assert.equal(
      helloWorldDocumentText,
      `export function helloWorld(name: string) {${endOfLine}  console.log(\`Hello \${name}!\`)${endOfLine}}${endOfLine}`,
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
