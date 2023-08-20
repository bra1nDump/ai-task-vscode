import * as assert from 'assert'
import * as vscode from 'vscode'

suite('VSCode Extension Command Tests', function () {
  // Increased timeout since these are using LLM an are thus slow
  this.timeout(10_000)
  test('birds.feed command', async (done) => {
    const releaseCommand = await vscode.commands
      .getCommands(true)
      .then((commands) => {
        if (commands.includes('birds.feed')) {
          return true
        } else {
          return false
        }
      })

    assert.ok(releaseCommand, 'Command "birds.feed" is not registered.')

    try {
      await vscode.commands.executeCommand('birds.feed')
      console.log('Command "birds.feed" finished running')
    } catch (error) {
      assert.fail(`Command "birds.feed" could not be run: ${error as any}`)
    }
  })
})
