import * as vscode from 'vscode'
import * as assert from 'assert'

import { DocumentSnapshot, vscodeRangeToLineRange } from './document-snapshot'

suite('DocumentSnapshot', () => {
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

      if (currentTargetRange.type === 'error') {
        assert.fail(currentTargetRange.error)
      } else {
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

        /* console.log(
         * `\n\nDocument after replacing line range
         * ${lineRangeToBeReplaced.start}-${lineRangeToBeReplaced.end} with
         * '${content}':`,
           )
           console.log(editor.document.getText()) */
      }
    }

    assert.equal(editor.document.getText(), expectedContentAfterEdits)
  })

  /* We first replace it with the line with different content. Next we insert a
     new line character and the content for the next line. Asserted the
     original line range 0-0 expanded to include the second line because the
     insert extended the range. */
  test('Inserts at the end of the track range extend it', async function () {
    const initialContent = `Original Line`
    const expectedContentAfterEdits = `New Line\nAdded Line Dummy`

    const doc = await vscode.workspace.openTextDocument({
      content: initialContent,
    })
    const editor = await vscode.window.showTextDocument(doc)
    const documentSnapshot = new DocumentSnapshot(editor.document)

    const changes = [
      {
        rangeInSnapshot: { start: 0, end: 0 },
        rangeInCurrentDocumentBeforeApplying: { start: 0, end: 0 },
        content: 'New Line',
      },
      {
        rangeInSnapshot: { start: 0, end: 0 },
        rangeInCurrentDocumentBeforeApplying: { start: 0, end: 0 },
        content: 'New Line\nAdded Line',
      },
      /* This loss change is simply to assert the range after applying the
         previous change */
      {
        rangeInSnapshot: { start: 0, end: 0 },
        /* The range is expanded to include the second line because the insert
           extended the range. */
        rangeInCurrentDocumentBeforeApplying: { start: 0, end: 1 },
        content: 'New Line\nAdded Line Dummy',
      },
    ]

    for (const change of changes) {
      const rangeInSnapshot = change.rangeInSnapshot
      const content = change.content

      await new Promise((resolve) => setTimeout(resolve, 10)) // Artificial delay

      const currentTargetRange =
        documentSnapshot.toCurrentDocumentRange(rangeInSnapshot)

      if (currentTargetRange.type === 'error') {
        assert.fail(currentTargetRange.error)
      } else {
        const lineRangeToBeReplaced = vscodeRangeToLineRange(
          currentTargetRange.value,
        )
        assert.deepStrictEqual(
          lineRangeToBeReplaced,
          change.rangeInCurrentDocumentBeforeApplying,
        )
        /* Check if the current text within the range we are replacing is a
         * suffix of the new content. If that is the case find the delta and
         * insert it at the end of the range instead of replacing the full
         * range. We are emulating the optimization we're doing on the apply
         * edits where we convert a replacement to an insertat
         */
        await editor.edit((editBuilder) => {
          const currentContent = editor.document.getText(
            currentTargetRange.value,
          )
          if (content.startsWith(currentContent)) {
            const delta = content.slice(currentContent.length)

            editBuilder.insert(currentTargetRange.value.end, delta)
          } else {
            editBuilder.replace(currentTargetRange.value, content)
          }
        })
      }
    }
    assert.equal(editor.document.getText(), expectedContentAfterEdits)
  })
})
