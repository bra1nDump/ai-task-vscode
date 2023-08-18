import * as assert from 'assert'
import * as vscode from 'vscode'
import { applyChanges } from './apply'
import { Change } from './types'

suite('Apply Patch Tests', () => {
  test('Apply single simple change', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: 'line1\nline2',
      language: 'plaintext',
    })
    const editor = await vscode.window.showTextDocument(document)

    const changes: Change[] = [
      {
        description: 'Change line1 to Hello World',
        oldChunk: {
          type: 'fullContentRange',
          fullContent: 'line1\nline2',
        },
        newChunk: 'Hello World\nline2',
      },
    ]

    await applyChanges(changes, editor)

    assert.strictEqual(document.getText(), 'Hello World\nline2')
  })

  test('Apply a change with truncated target range', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: 'line1\nline2\nline3\nline4\nline5',
      language: 'plaintext',
    })
    const editor = await vscode.window.showTextDocument(document)

    const changes: Change[] = [
      {
        description: 'Change line2 to Hello World',
        oldChunk: {
          type: 'prefixAndSuffixRange',
          prefixContent: 'line1',
          suffixContent: 'line4\nline4',
        },
        newChunk: 'line1\nHello World\nline4',
      },
    ]

    await applyChanges(changes, editor)

    assert.strictEqual(document.getText(), 'line1\nHello World\nline4\nline5')
  })

  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors')
  })
})
