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
          isStreamFinalized: true,
        },
        newChunk: { content: 'Hello World\nline2', isStreamFinalized: true },
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
          suffixContent: 'line4',
          isStreamFinalized: true,
        },
        newChunk: {
          content: 'line1\nHello World\nline4',
          isStreamFinalized: true,
        },
      },
    ]

    await applyChanges(changes, editor)

    assert.strictEqual(document.getText(), 'line1\nHello World\nline4\nline5')
  })

  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors')
  })

  test('Change can be applied even with wrong spacing', async () => {
    const document = await vscode.workspace.openTextDocument({
      // Mismatching spacing in the content itself
      content: '    line1  \nline2',
      language: 'plaintext',
    })
    const editor = await vscode.window.showTextDocument(document)

    const changes: Change[] = [
      {
        description: 'Change line1 to Hello World with trimming',
        oldChunk: {
          type: 'prefixAndSuffixRange',
          prefixContent: 'line1',
          suffixContent: '    line2   ', // mismatching spacing in range suffix
          isStreamFinalized: true,
        },
        newChunk: { content: 'Hello World\nline2', isStreamFinalized: true },
      },
    ]

    await applyChanges(changes, editor)

    assert.strictEqual(document.getText(), 'Hello World\nline2')
  })

  test('Range fails to apply when there is no match', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: 'line1\nline2\nline3',
      language: 'plaintext',
    })
    const editor = await vscode.window.showTextDocument(document)

    const changes: Change[] = [
      {
        description: 'Change non-existent line to Hello World',
        oldChunk: {
          type: 'prefixAndSuffixRange',
          prefixContent: 'non-existent line',
          suffixContent: 'line3',
          isStreamFinalized: true,
        },
        newChunk: { content: 'Hello World\nline3', isStreamFinalized: true },
      },
    ]

    const [applicationResult] = await applyChanges(changes, editor)
    assert.ok(applicationResult.result === 'failedToFindTargetRange')
  })

  test('Apply change to a fully empty file', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: '',
      language: 'plaintext',
    })
    const editor = await vscode.window.showTextDocument(document)

    const changes: Change[] = [
      {
        description: 'Add Hello World to empty file',
        oldChunk: {
          type: 'fullContentRange',
          fullContent: '',
          isStreamFinalized: true,
        },
        newChunk: { content: 'Hello World', isStreamFinalized: true },
      },
    ]

    await applyChanges(changes, editor)

    assert.strictEqual(document.getText(), 'Hello World')
  })

  test('Apply change to a file with new lines only', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: '\n\n',
      language: 'plaintext',
    })
    const editor = await vscode.window.showTextDocument(document)

    const changes: Change[] = [
      {
        description: 'Change empty line to Hello World',
        oldChunk: {
          type: 'fullContentRange',
          fullContent: '\n\n',
          isStreamFinalized: true,
        },
        newChunk: { content: 'Hello World', isStreamFinalized: true },
      },
    ]

    await applyChanges(changes, editor)

    assert.strictEqual(document.getText(), 'Hello World')
  })

  test('Empty lines are not used to match target range', async () => {
    const document = await vscode.workspace.openTextDocument({
      // Notice empty line between line2 and line3
      content: 'line1\nline2\n\nline3\n',
      language: 'plaintext',
    })
    const editor = await vscode.window.showTextDocument(document)

    // empty first line, will match many characters in the document and should be ignored
    // the matching should happen based on the second line
    const changes: Change[] = [
      {
        description: 'Change line2 to Hello World',
        oldChunk: {
          type: 'prefixAndSuffixRange',
          prefixContent: '\nline2',
          suffixContent: 'line3',
          isStreamFinalized: true,
        },
        newChunk: {
          content: 'line1\nHello World\nline3',
          isStreamFinalized: true,
        },
      },
    ]

    const [_applicationResult] = await applyChanges(changes, editor)

    assert.strictEqual(document.getText(), 'line1\nHello World\nline3\n')
  })

  test('Match on a line with more than one apperance should not match based on that line', async () => {
    // In this case matching should happen based on line 1

    const document = await vscode.workspace.openTextDocument({
      content: '{\nline1\n{\nline3',
      language: 'plaintext',
    })
    const editor = await vscode.window.showTextDocument(document)

    const changes: Change[] = [
      {
        description: 'Change line with { to Hello World',
        oldChunk: {
          type: 'prefixAndSuffixRange',
          prefixContent: '{\nline1',
          suffixContent: 'line3',
          isStreamFinalized: true,
        },
        newChunk: {
          content: 'removing brace on first line\nHello World\nline3',
          isStreamFinalized: true,
        },
      },
    ]

    await applyChanges(changes, editor)

    assert.strictEqual(
      document.getText(),
      'removing brace on first line\nHello World\nline3',
    )
  })
})
