/*
The problem this is solving:
On we're submitting files to the LLM we're submitting a snapshot.
As the LLM responds with the changes to be applied to the file, the file might have already changed due to user actions or other LLM edits.
The format that the LLM responds with is a line range in the old file.
Once the LLM picks range to change, it streams in the new content to be used as a replacement for the original range. The way the changes are applied is we replace the full range with the new content every time the new content is updated.

The idea is to take a snapshot of a document, while doing so subscribe to the onDidChangeTextDocument event.
Continuously collect all contentChanges that happen to the document.
Provide a method toCurrentDocumentRange(rangeInSnapshot: LineRange) to convert the line range from the original snapshot to the range in the current document.

Consider this example usage of the API:

const documentSnapshot = new DocumentSnapshot(document)
const originalDocumentText = fileSnapshot.getSnapshotText

Original text:
`Line 0
Line 1
Line 2
Line 3
Line 4
Line 5
`

// The outer loop is responsible for getting the next range to replace
for await (const changeStream = await llm.changeSet()) {
    const rangeInSnapshot = changeStream.rangeInSnapshotToReplace
    for await (const newContent of changeStream.growingReplacement) {
        // We need to get the current range in the document, since it might have shifted due to other edits
        // before this point in time
        const currentTargetRange = fileSnapshot.toCurrentDocumentRange(rangeInSnapshot)

        // Replaced the adjusted original range with the new newContent
        // This replacement will result in the documentSnapshot receiving the update from the onDidChangeTextDocument event

        // and for future calls to toCurrentDocumentRange to return the correct range adjusted for this recent edit, 
        // as well as all the previous edits that happened
        await editor.edit((editBuilder) => {
            editBuilder.replace(currentTargetRange, newContent)
        })
    }
}

Line ranges are encoded in the following way:
StartOfLine 0 - Represents an empty range, aka an insertion point at the beginning of the document
LineRange Ls, Le - Represents the range of Range(Ls, 0, Le, lengthOfLine(Le))


Let's say the LLM responds with the following changes (infer partial states yourself)

Change 0
- rangeInSnapshot: StartOfLine 0
- Final New Content:
`Prepended New Line 0
`

    Iteration 0
    - currentTargetRange: StartOfLine 0
    - newContent: ""
    
    Iteration 1
    - currentTargetRange: StartOfLine 0
    - newContent: "Prepended New Line 0\n" 
    - explanation: Since the previous replace did not have any affect, the range is still empty, and we are adding a new line to the beginning of the document, the range is now LineRange 0, 0. Notice it changed from an empty range to a non-empty range. This is because the line content grew from empty to non-empty

Document content after fully applying the change:
`Prepended Line 0
Line 0
Line 1
Line 2
Line 3
Line 4
Line 5
`

Change 1
- rangeInSnapshot: LineRange 1, 3
- Final New Content:
`Replaced Line 1
Line 2
Replaced Line 3
Added Line 4`

    Iteration 0
    - currentTargetRange: LineRange 2, 4
    - newContent: ""
    - explanation: This effectively removes line 1-3 (from the snapshot), or lines 2-4 (in the current document) and replaces it with empty content. This sets up the stage for the next edits to be applied. The the original range now becomes lines LineRange 2, 2 after the replacement.
        
    Iteration 1
    - currentTargetRange: LineRange 2, 2
    - newContent: "Replaced Line 1"
    - explanation: The range after this replacement it does not change, since the new content occupies the same line range, now the line is just not empty.

    Iteration 2
    - currentTargetRange: LineRange 2, 2
    - newContent: "Replaced Line 1\nLine 2"
    - explanation: Range after this replacment changes as we have added an additional line to the new content, the range is now LineRange 2, 3.

    Iteration 2.5
    - currentTargetRange: LineRange 2, 3
    - explanation: Sometimes we might recieve not full lines, we need to make sure this gets handled.
    - newContent: "Replaced Line 1\nLine 2\nRe"
    - explanation: Range after this replacment changes as we have added an additional line to the new content, the range is now LineRange 2, 4

    Iteration 3
    - currentTargetRange: LineRange 2, 4
    - newContent: "Replaced Line 1\nLine 2\nReplaced Line 3"
    - explanation: The line range has not changed since the last line simply got longer.

    Iteration 4
    - currentTargetRange: LineRange 2, 4
    - newContent: "Replaced Line 1\nLine 2\nReplaced Line 3\nAdded Line 4"
    - explanation: After applying the final new content the range becomes LineRange 2, 5. We will not call toCurrentDocumentRange anymore but if we did this is the range et with output.

- Document content after fully applying the change:
`Prepended Line 0
Line 0
Replaced Line 1
Line 2
Replaced Line 3
Added Line 4
Line 4
Line 5
`

*/

import {
  workspace,
  Range,
  TextDocument,
  TextDocumentContentChangeEvent,
} from 'vscode'

export interface LineRange {
  type: 'LineRange'
  start: number
  end: number
}

export interface StartOfLine {
  type: 'StartOfLine'
  line: number
}

export type SnapshotRange = LineRange | StartOfLine

export class DocumentSnapshot {
  public getSnapshotText: string
  private contentChanges: TextDocumentContentChangeEvent[] = []

  constructor(document: TextDocument) {
    this.getSnapshotText = document.getText()

    workspace.onDidChangeTextDocument((change) => {
      if (change.document !== document) return

      this.contentChanges.push(...change.contentChanges)
    })
  }

  toCurrentDocumentRange(rangeInSnapshot: SnapshotRange): SnapshotRange {
    let currentRange: SnapshotRange

    this.contentChanges.forEach((change) => {
      if (
        change.range.start.line >= rangeInSnapshot.start &&
        change.range.end.line <= rangeInSnapshot.end
      ) {
        currentRange.start = change.range.start.line
        currentRange.end = change.range.end.line
      }
    })
    return currentRange
  }
}

/**
 * Translation requires document because we need to 1 how long the last line in the range is
 */
export function lineRangeToVscodeRange(
  lineRange: SnapshotRange,
  document: TextDocument,
): Range {
  // @crust fixes for different range types
  return new Range(
    lineRange.start,
    0,
    lineRange.end,
    document.lineAt(lineRange.end).text.length,
  )
}

/**
 * Lossy translation to line range.
 * I'm not sure when we would want to use this, but it's here if we need it.
 * I anticipate we might want to use this when we process the text document change events to converting the line ranges.
 */
export function vscodeRangeToLineRange(range: Range): SnapshotRange {
  return { type: 'LineRange', start: range.start.line, end: range.end.line }
}
