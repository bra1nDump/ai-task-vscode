import * as assert from 'assert'
import * as vscode from 'vscode'

suite('VSCode Extension Command Tests', function () {
  // Increased timeout since these are using LLM an are thus slow
  this.timeout(10000)
  test('birds.release command', async () => {
    const releaseCommand = vscode.commands
      .getCommands(true)
      .then((commands) => {
        if (commands.includes('birds.release')) {
          return true
        } else {
          return false
        }
      })

    assert.ok(releaseCommand, 'Command "birds.release" is not registered.')

    try {
      await vscode.commands.executeCommand('birds.release')
    } catch (error) {
      assert.fail(`Command "birds.release" could not be run: ${error}`)
    }
  })
})
