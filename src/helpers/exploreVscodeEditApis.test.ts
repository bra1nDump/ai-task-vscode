/*
 * For historical purposes, I'm keeping the prompts that helped generate the
 * file.

 * I'm trying to explore the api for
 * vscode.workspace.OnDidChangeTextDocumentEvent And how it interacts with the
 * edit events. I'm also trying to explore various ways of performing edits
 * Create a test suite similar to parse test in style that showcases how
 * various events are handled.
Edits to try performing and observing:
- Inserting a new line
- Inserting a new line with a prefix
- Changing the same range twice in the same edit builder
- Changing the same range twice in different edit builders
- Deleting a range of lines

Start out with the same editor contents for all tests:
Line 1
Line 2
Line 3
Line 4
Line 5


 * Add more test cases: merge two lines, perform two edits on different lines
 * indifferent order in two different test cases and observe on did change
 * event and assert the order of the contentChanges in both cases. Expected is
 * an reverse document order, no matter the order in the edit builder. You
 * probably need to create a promise that you will resolve once the correct
 * change event was fired.

 * TODO later: create a helper that will close all other editors and open a new
 * editor with an array of lines instead of having a setup function. Inline all
 * of that within each individual test.

 * Side note - this is a good test case for multi-editing in a single file
 * without a full replace.

Its helpful to think about how VSCode addresses empty lines.
 * Say we have an empty 0th line in the editor - Position(0, 0) will be a
 * position at the end of the line. It does not include the newline character
 * tho. If the next line is not empty "Next Line", making a replace of Range
 * Position(0, 0), Position(1, 0) with let's say a , will result the first
 * empty line being merged with the second empty line, reducing to number of
 * lines in the file by one and the first line will now be "Next Line,". It
 * seems that the range is not inclusive on the right side.
*/

import * as vscode from 'vscode'
import * as assert from 'assert'

suite('vscode.workspace.OnDidChangeTextDocumentEvent', () => {
  const initialContent = [
    'Line 1',
    'Line 2',
    'Line 3',
    'Line 4',
    'Line 5',
  ].join('\n')

  setup(async () => {
    // Close all editors prior to opening new ones
    await vscode.commands.executeCommand('workbench.action.closeAllEditors')
    const doc = await vscode.workspace.openTextDocument({
      content: initialContent,
    })
    await vscode.window.showTextDocument(doc)
  })

  test('Inserting a new line', async () => {
    const editor = vscode.window.activeTextEditor
    assert.ok(editor)
    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), 'New Line\n')
    })
    assert.equal(editor.document.lineAt(0).text, 'New Line')
  })

  test('Second change will fail because overlapping ranges are not allowed', async () => {
    const editor = vscode.window.activeTextEditor
    assert.ok(editor)
    try {
      await editor.edit((editBuilder) => {
        editBuilder.replace(new vscode.Range(0, 0, 0, 5), 'Changed')
        editBuilder.replace(new vscode.Range(0, 0, 0, 5), 'Second change')
      })
      assert.fail('Expected error was not thrown')
    } catch (error) {
      assert.ok(error instanceof Error)
    }
  })

  test('Changing the same range twice in different edit builders', async () => {
    const editor = vscode.window.activeTextEditor
    assert.ok(editor)
    await editor.edit((editBuilder) => {
      editBuilder.replace(new vscode.Range(0, 0, 0, 6), 'Changed')
    })

    await editor.edit((editBuilder) => {
      editBuilder.replace(new vscode.Range(0, 0, 0, 7), 'Twice Changed')
    })
    assert.equal(editor.document.lineAt(0).text, 'Twice Changed')
  })

  test('Deleting a range of lines', async () => {
    const editor = vscode.window.activeTextEditor
    assert.ok(editor)
    await editor.edit((editBuilder) => {
      /* Notice how we are technically deleting up until the first character on
       * the third line. I guess rangers are not closed on the right side.
       */
      editBuilder.delete(new vscode.Range(0, 0, 2, 0))
    })
    assert.equal(editor.document.lineAt(0).text, 'Line 3')
  })

  test('Deleting one character past the last character on the line', async () => {
    const editor = vscode.window.activeTextEditor
    assert.ok(editor)
    await editor.edit((editBuilder) => {
      // Deleting one character past the last character on the line
      editBuilder.delete(new vscode.Range(0, 5, 0, 6))
    })
    assert.equal(editor.document.lineAt(0).text, 'Line ')
  })

  test('Deleting an empty range succeeds but has no affect', async () => {
    const editor = vscode.window.activeTextEditor
    assert.ok(editor)
    await editor.edit((editBuilder) => {
      editBuilder.delete(new vscode.Range(0, 0, 0, 0))
    })
    assert.equal(editor.document.lineAt(0).text, 'Line 1')
  })

  test('Replacing an empty range succeeds', async () => {
    const editor = vscode.window.activeTextEditor
    assert.ok(editor)
    await editor.edit((editBuilder) => {
      editBuilder.replace(new vscode.Range(0, 0, 0, 0), 'Suffix')
    })
    assert.equal(editor.document.lineAt(0).text, 'SuffixLine 1')
  })

  test('Insert newline at end of line zero', async () => {
    const editor = vscode.window.activeTextEditor
    assert.ok(editor)
    const changes: vscode.TextDocumentContentChangeEvent[] = []
    vscode.workspace.onDidChangeTextDocument((event) => {
      changes.push(...event.contentChanges)
    })
    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 6), '\n')
    })
    assert.equal(editor.document.lineAt(0).text, 'Line 1')
    assert.equal(changes.length, 1)
    assert.equal(changes[0].text, '\n')
    assert.deepEqual(changes[0].range, new vscode.Range(0, 6, 0, 6))
  })

  test('Merge two lines', async () => {
    const editor = vscode.window.activeTextEditor
    assert.ok(editor)
    const changes: vscode.TextDocumentContentChangeEvent[] = []
    vscode.workspace.onDidChangeTextDocument((event) => {
      changes.push(...event.contentChanges)
    })
    await editor.edit((editBuilder) => {
      editBuilder.delete(new vscode.Range(0, 6, 1, 0))
    })
    assert.equal(editor.document.lineAt(0).text, 'Line 1Line 2')

    assert.equal(changes.length, 1)
    assert.equal(changes[0].text, '')
    assert.deepEqual(changes[0].range, new vscode.Range(0, 6, 1, 0))
  })

  /* The edits are reported starting with the parts in the file that come later
   * in the file. This is done so if we replayed the edits in the same order,
   * we would get the same result. Otherwise we would need to keep track of
   * changing ranges (because they're pushed down or pushed up) as we apply
   * edits.
   */
  test('Assert the order of the contentChanges is in file reverse order, no matter the order of the', () => {
    test('Baseline order', async () => {
      const editor = vscode.window.activeTextEditor
      assert.ok(editor)
      const changes: string[] = []
      vscode.workspace.onDidChangeTextDocument((event) => {
        changes.unshift(...event.contentChanges.map((x) => x.text))
      })
      await editor.edit((editBuilder) => {
        editBuilder.replace(new vscode.Range(0, 0, 0, 5), 'Changed Line 1')
        editBuilder.replace(new vscode.Range(1, 0, 1, 5), 'Changed Line 2')
      })
      assert.deepEqual(changes, ['Changed Line 2', 'Changed Line 1'])
    })

    test('Reversed order', async () => {
      const editor = vscode.window.activeTextEditor
      assert.ok(editor)
      const changes: string[] = []
      vscode.workspace.onDidChangeTextDocument((event) => {
        changes.unshift(...event.contentChanges.map((x) => x.text))
      })
      await editor.edit((editBuilder) => {
        editBuilder.replace(new vscode.Range(1, 0, 1, 5), 'Changed Line 2')
        editBuilder.replace(new vscode.Range(0, 0, 0, 5), 'Changed Line 1')
      })
      assert.deepEqual(changes, ['Changed Line 2', 'Changed Line 1'])
    })
  })
})
