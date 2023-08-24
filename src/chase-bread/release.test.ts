import * as assert from 'assert'
import * as vscode from 'vscode'

suite('VSCode Extension Command Tests', function () {
  // Increased timeout since these are using LLM an are thus slow
  this.timeout(6_000_000)
  test('birds.chaseBread command', async () => {
    const releaseCommand = await vscode.commands
      .getCommands(true)
      .then((commands) => commands.includes('birds.chaseBread'))

    assert.ok(releaseCommand, 'Command "birds.chaseBread" is not registered.')

    try {
      await vscode.commands.executeCommand('birds.chaseBread')
      console.log('Command "birds.chaseBread" finished running')
    } catch (error) {
      assert.fail(
        `Command "birds.chaseBread" could not be run: ${error as any}`,
      )
    }
  })
})
