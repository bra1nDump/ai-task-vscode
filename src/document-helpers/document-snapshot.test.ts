import * as vscode from 'vscode'
import * as assert from 'assert'

import { DocumentSnapshot, vscodeRangeToLineRange } from './document-snapshot'

suite.only('DocumentSnapshot', () => {
  setup(async () => {
    // Close all editors prior to opening new ones
    await vscode.commands.executeCommand('workbench.action.closeAllEditors')
  })

  test('Works correctly on a simple example from the API design', async function () {
    const initialContent = `Line 0
Line 1
Line 2
Line 3
Line 4
Line 5
`
    const expectedContentAfterEdits = `Prepended New Line 0
Line 0
Replaced Line 1
Line 2
Replaced Line 3
Added Line 4
Line 4
Line 5
`
    const doc = await vscode.workspace.openTextDocument({
      content: initialContent,
    })
    const editor = await vscode.window.showTextDocument(doc)
    const documentSnapshot = new DocumentSnapshot(editor.document)

    // See more details on this example in header for DocumentSnapshot
    const changes = [
      {
        rangeInSnapshot: { start: 0, end: 0 },
        rangeInCurrentDocumentBeforeApplying: { start: 0, end: 0 },
        content: '',
      },
      {
        rangeInSnapshot: { start: 0, end: 0 },
        rangeInCurrentDocumentBeforeApplying: { start: 0, end: 0 },
        content: 'Prepended New Line 0',
      },
      {
        rangeInSnapshot: { start: 0, end: 0 },
        rangeInCurrentDocumentBeforeApplying: { start: 0, end: 0 },
        content: 'Prepended New Line 0\nLine 0',
      },
      {
        rangeInSnapshot: { start: 1, end: 3 },
        rangeInCurrentDocumentBeforeApplying: { start: 2, end: 4 },
        content: '',
      },
      {
        rangeInSnapshot: { start: 1, end: 3 },
        rangeInCurrentDocumentBeforeApplying: { start: 2, end: 2 },
        content: 'Replaced Line 1',
      },
      {
        rangeInSnapshot: { start: 1, end: 3 },
        rangeInCurrentDocumentBeforeApplying: { start: 2, end: 2 },
        content: 'Replaced Line 1\nLine 2',
      },
      {
        rangeInSnapshot: { start: 1, end: 3 },
        rangeInCurrentDocumentBeforeApplying: { start: 2, end: 3 },
        content: 'Replaced Line 1\nLine 2\nRe',
      },
      {
        rangeInSnapshot: { start: 1, end: 3 },
        rangeInCurrentDocumentBeforeApplying: { start: 2, end: 4 },
        content: 'Replaced Line 1\nLine 2\nReplaced Line 3',
      },
      {
        rangeInSnapshot: { start: 1, end: 3 },
        rangeInCurrentDocumentBeforeApplying: { start: 2, end: 4 },
        content: 'Replaced Line 1\nLine 2\nReplaced Line 3\nAdded Line 4',
      },
    ]

    for (const change of changes) {
      const rangeInSnapshot = change.rangeInSnapshot
      const content = change.content

      await new Promise((resolve) => setTimeout(resolve, 10)) // Artificial delay

      const currentTargetRange =
        documentSnapshot.toCurrentDocumentRange(rangeInSnapshot)

      if (currentTargetRange.type === 'error')
        assert.fail(currentTargetRange.error)
      else {
        const lineRangeToBeReplaced = vscodeRangeToLineRange(
          currentTargetRange.value,
        )
        assert.deepStrictEqual(
          lineRangeToBeReplaced,
          change.rangeInCurrentDocumentBeforeApplying,
        )
        await editor.edit((editBuilder) => {
          editBuilder.replace(currentTargetRange.value, content)
        })

        // console.log(
        //   `\n\nDocument after replacing line range ${lineRangeToBeReplaced.start}-${lineRangeToBeReplaced.end} with '${content}':`,
        // )
        // console.log(editor.document.getText())
      }
    }

    assert.equal(editor.document.getText(), expectedContentAfterEdits)
  })
})
