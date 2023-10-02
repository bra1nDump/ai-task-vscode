/*
 *The problem this is solving:
 *On we're submitting files to the LLM we're submitting a snapshot.
 * As the LLM responds with the changes to be applied to the file, the file
 * might have already changed due to user actions or other LLM edits. The
 * format that the LLM responds with is a line range in the old file.
 * Once the LLM picks range to change, it streams in the new content to be used
 * as a replacement for the original range. The way the changes are applied is
 * we replace the full range with the new content every time the new content is
 * updated.
 *
 * The idea is to take a snapshot of a document, while doing so subscribe to
 * the onDidChangeTextDocument event. Continuously collect all contentChanges
 * that happen to the document.
 * Provide a method toCurrentDocumentRange(rangeInSnapshot: LineRange) to
 * convert the line range from the original snapshot to the range in the
 * current document.
 *
 *Consider this example usage of the API:
 *
 *```
 *const documentSnapshot = new DocumentSnapshot(document)
 *const originalDocumentText = fileSnapshot.getSnapshotText
 *
 *Original text:
 *`Line 0
 *Line 1
 *Line 2
 *Line 3
 *Line 4
 *Line 5
 *`
 *```
 *
 *```ts
 * // The outer loop is responsible for getting the next range to replace
 *for await (const changeStream = await llm.changeSet()) {
 *    const rangeInSnapshot = changeStream.rangeInSnapshotToReplace
 *    for await (const newContent of changeStream.growingReplacement) {
 *        // We need to get the current range in the document, since it might have shifted due to other edits
 *        // before this point in time
 *        const currentTargetRange = fileSnapshot.toCurrentDocumentRange(rangeInSnapshot)
 *
 *        // Replaced the adjusted original range with the new newContent
 *        // This replacement will result in the documentSnapshot receiving the update from the onDidChangeTextDocument event
 *
 *        // and for future calls to toCurrentDocumentRange to return the correct range adjusted for this recent edit,
 *        // as well as all the previous edits that happened
 *        await editor.edit((editBuilder) => {
 *            editBuilder.replace(currentTargetRange, newContent)
 *        })
 *    }
 *}
 *```
 *
 *```
 *Line ranges are encoded in the following way:
 *LineRange Ls, Le - Represents the range of Range(Ls, 0, Le, lengthOfLine(Le))
 *
 *
 *Let's say the LLM responds with the following changes (infer partial states yourself)
 *
 *
 *Change 0
 *- rangeInSnapshot: LineRange 0, 0
 *- Final New Content:
 *`Line 0
 *Prepended New Line 0`
 *
 *    Iteration 0
 *    - currentTargetRange: LineRange 0, 0
 *    - newContent: ""
 *    - explanation: This replaces the 0th line with empty content overriding "Line 0", which does not change the line range within the document.
 *
 *    Iteration 1
 *    - currentTargetRange: LineRange 0, 0
 *    - newContent: "Prepended New Line 0"
 *    - explanation: Since the previous replace did not have any affect, the range is still empty, and we are adding a new line to the beginning of the document, the range is now LineRange 0, 0. Notice it changed from an empty range to a non-empty range. This is because the line content grew from empty to non-empty
 *
 *    Iteration 2
 *    - currentTargetRange: LineRange 0, 0
 *    - newContent: "Prepended New Line 0\nLine 0"
 *    - explanation: This restores the original line. Because we have added a
 *    between the pretended and the original line, the range is now LineRange 0, 1. This will result in ranges that appear after this range to be shifted down by 1 line.
 *
 *Document content after fully applying the change:
 *`Prepended Line 0
 *Line 0
 *Line 1
 *Line 2
 *Line 3
 *Line 4
 *Line 5
 *`
 *
 *Change 1
 *- rangeInSnapshot: LineRange 1, 3
 *- Final New Content:
 *`Replaced Line 1
 *Line 2
 *Replaced Line 3
 *Added Line 4`
 *
 *    Iteration 0
 *    - currentTargetRange: LineRange 2, 4
 *    - newContent: ""
 *    - explanation: This effectively removes line 1-3 (from the snapshot), or lines 2-4 (in the current document) and replaces it with empty content. This sets up the stage for the next edits to be applied. The the original range now becomes lines LineRange 2, 2 after the replacement.
 *
 *    Iteration 1
 *    - currentTargetRange: LineRange 2, 2
 *    - newContent: "Replaced Line 1"
 *    - explanation: The range after this replacement it does not change, since the new content occupies the same line range, now the line is just not empty.
 *
 *    Iteration 2
 *    - currentTargetRange: LineRange 2, 2
 *    - newContent: "Replaced Line 1\nLine 2"
 *    - explanation: Range after this replacment changes as we have added an additional line to the new content, the range is now LineRange 2, 3.
 *
 *    Iteration 2.5
 *    - currentTargetRange: LineRange 2, 3
 *    - explanation: Sometimes we might recieve not full lines, we need to make sure this gets handled.
 *    - newContent: "Replaced Line 1\nLine 2\nRe"
 *    - explanation: Range after this replacment changes as we have added an additional line to the new content, the range is now LineRange 2, 4
 *
 *    Iteration 3
 *    - currentTargetRange: LineRange 2, 4
 *    - newContent: "Replaced Line 1\nLine 2\nReplaced Line 3"
 *    - explanation: The line range has not changed since the last line simply got longer.
 *
 *    Iteration 4
 *    - currentTargetRange: LineRange 2, 4
 *    - newContent: "Replaced Line 1\nLine 2\nReplaced Line 3\nAdded Line 4"
 *    - explanation: After applying the final new content the range becomes LineRange 2, 5. We will not call toCurrentDocumentRange anymore but if we did this is the range et with output.
 *
 *- Document content after fully applying the change:
 *`Prepended New Line 0
 *Line 0
 *Replaced Line 1
 *Line 2
 *Replaced Line 3
 *Added Line 4
 *Line 4
 *Line 5
 *`
 *```
 */

import {
  workspace,
  Position,
  Range,
  TextDocument,
  TextDocumentContentChangeEvent,
  Disposable,
} from 'vscode'

import { Result, resultMap } from '../helpers/result'
import { FileContext, transformFileContextWithLineNumbers } from './types'

export interface LineRange {
  start: number
  end: number
}

export class DocumentSnapshot {
  /**
   * The snapshot could have two different formats:
   * - File context verbatim
   * - File context with line numbers
   *
   * This gets decided by the option passed to the constructor.
   *
   * Having cline numbers is useful for:
   * - Disambiguating between lines with the same
   * - Speeding up process of targeting LLM changes to specific lines
   * //  * - Splitting multi file editing into tasks of targeting and editing
   * separately
   *
   * Potential issues:
   * - Without splitting the task line targeting will most work as well. It
   * should still provide improvements in reliability but not in speed in the
   * first iteration
   * - More tokens in the input and output
   */
  public fileSnapshotForLlm: FileContext
  public documentWatchSubscription: Disposable

  private contentChanges: TextDocumentContentChangeEvent[] = []

  /**
   * We are keeping the document as reference which might be risky
   * because I'm not sure what happens if the document is closed.
   * Is it still accessible?
   * Maybe write a simple Unittest to test this similar to how I did with
   * VSCode edit apis
   */
  constructor(
    public document: TextDocument,
    public includeLineNumbers: boolean,
  ) {
    this.fileSnapshotForLlm = createFileContext(document)
    if (includeLineNumbers) {
      this.fileSnapshotForLlm = transformFileContextWithLineNumbers(
        this.fileSnapshotForLlm,
      )
    }

    this.documentWatchSubscription = workspace.onDidChangeTextDocument(
      (change) => {
        if (change.document !== document) {
          return
        }

        if (change.contentChanges.length > 1) {
          console.debug(
            'DocumentSnapshot: Received a change with multiple content changes, we might need to reverse this one to work well?',
            JSON.stringify(change.contentChanges),
          )
        }
        this.contentChanges.push(...change.contentChanges)
      },
    )
  }

  toCurrentDocumentLineRange(
    rangeInSnapshot: LineRange,
  ): Result<LineRange, string> {
    /*
     * We need to continuously update the range as we apply the changes
     * since the changes that have arrived are valid for the newest version of
     * the document at the time
     */
    const currentRange: LineRange = { ...rangeInSnapshot }

    /*
     * There are 3 cases we need to handle:
     * 1. The contentChange is strictly before the range we're looking to
     * adjust
     * - Most likely this isn't edit by hand in a different part of the file or
     * this is an LLM changing a different part of the file for cases when
     * we're changing multiple ranges.
     *
     * - We need to find line displacement (difference from new line count to
     * old line count for a given content change). We might need to record this
     * information at the time of the change, since it might need us to access
     * the document. - We need to adjust the range by the line displacement by
     * adding the displacement to the start and end of the currentRangeb
     *
     * 2. The contentChange is strictly after the range we're looking to adjust
     * - This will not effect the range we're looking to adjust, so we can
     * ignore it
     *
     * 3. The contentChange exactly matches the range we're looking to adjust
     * - The most common case. This will constantly happen as the LLM updates
     * the same range with more and more content as it becomes available. -
     * Idea to simplify: I'm now thinking applying only deltas instead of the
     * entire content because we would only need to keep track of a single
     * position where to insert the text. Is will also allow us to edit the
     * code that LLM has already printed out and we might want to change by
     * hand already while it's still working on the rest of that same change.
     *
     * - This is kind of similar to the first case because we also need to find
     * the line displacement. The only differences we only add thus to the end
     * range, because the range is strictly expanding or staying the same when
     * we are simply adding more characters to the last line in the range.
     *
     * 4. Change is an insert in the end of the tracked range. In this case we
     * want to extend the range by an extra line if necessary. Please explain
     * this case similar to the cases above. Please add another case to the if
     * statements below to handle this case.
     *
     * default. The contentChange is partially overlapping the range we're
     * looking to adjust.
     * - This is a complex case that we should not encounter with basic usage.
     * Simply return and error.
     */
    for (const contentChange of this.contentChanges) {
      const lineDisplacement =
        contentChange.text.split('\n').length -
        // Off by one
        1 -
        contentChange.range.end.line +
        contentChange.range.start.line
      if (
        contentChange.range.end.isBefore(new Position(currentRange.start, 0))
      ) {
        // Case 1: contentChange is strictly before the range
        currentRange.start += lineDisplacement
        currentRange.end += lineDisplacement
      } else if (contentChange.range.start.line > currentRange.end) {
        // Case 2: contentChange is strictly after the range
        continue
      } else if (
        /*
         * Not using isEqual because for it to work we would need to know the
         * length of the last line in the range at the time that this
         * contentChange was applied
         */
        contentChange.range.start.isEqual(
          new Position(currentRange.start, 0),
        ) &&
        contentChange.range.end.line === currentRange.end
      ) {
        // Case 3: contentChange exactly matches the range
        currentRange.end += lineDisplacement
      } else if (
        contentChange.range.start.line === currentRange.end
        /*
         * We don't store document stayed at that point and time,
         * so we can't check this. Let's just assume it's true for now. The
         * assumption is broken if the user edits the overlapping ranch within
         * document while the LLM is running.
         * && contentChange.range.start.character ===
         * document.lineAt(currentRange.end).text.length
         */
      ) {
        /*
         * Case 4: contentChange is an insert in the end of the tracked range
         * Extend the range by an extra line if necessary
         */
        currentRange.end += lineDisplacement
      } else if (lineDisplacement === 0) {
        /*
         * Case 5:
         *
         * HACK [resolve-after-save]
         * Works in tandem with the hack in resolveTargetRange.ts, which
         * returns noop changes when the range is not found.
         *
         * Currently this happens when we are saving the file after the llm
         * changes. The formatter usually is invoked and it can make
         * unanticipated changes. Usually these changes are single line, but
         * could result in displacement as well. These will mess up the
         * resolutions for the changes that are final and were already applied,
         * but the resolve stage does not care - it keeps trying to resolve old
         * changes that were already applied.
         *
         * We really are only scared of the edits that change line
         * count, as we address by lines only (not characters).
         * We might even want to move this case to the top of the if.
         *
         * So if the edit does not change line count, we can safely ignore it.
         * I suspect there might be some cases when we were throwing an error
         * after some automated change is made by vscode extensions, like
         * adding a * on the new line in the comment. We should be able to
         * ignore those changes. Anyways its been crashing sometimes and I am
         * not sure why. This is my best guess.
         */
        continue
      }
      // Default: contentChange is partially overlapping the range
      else {
        return { type: 'error', error: 'Range is partially overlapping' }
      }
    }

    return { type: 'success', value: currentRange }
  }

  toCurrentDocumentRange(rangeInSnapshot: LineRange): Result<Range, string> {
    return resultMap(
      (lineRange) => lineRangeToVscodeRange(lineRange, this.document),
      this.toCurrentDocumentLineRange(rangeInSnapshot),
    )
  }
}

/**
 * Translation requires document because we need to 1 how long the last line in
 * the range is
 */
export function lineRangeToVscodeRange(
  lineRange: LineRange,
  document: TextDocument,
): Range {
  return new Range(
    lineRange.start,
    0,
    lineRange.end,
    document.lineAt(lineRange.end).text.length,
  )
}

export function createFileContext(document: TextDocument): FileContext {
  const documentContent = document.getText()
  const path = workspace.asRelativePath(document.uri)

  return {
    filePathRelativeToWorkspace: path,
    content: documentContent,
  }
}

/**
 * Lossy translation to line range.
 * I'm not sure when we would want to use this, but it's here if we need it.
 * I anticipate we might want to use this when we process the text document
 * change events to converting the line ranges.
 */
export function vscodeRangeToLineRange(range: Range): LineRange {
  return { start: range.start.line, end: range.end.line }
}
