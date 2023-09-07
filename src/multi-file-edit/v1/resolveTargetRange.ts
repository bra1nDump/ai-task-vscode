import * as vscode from 'vscode'
import { LlmGeneratedPatchXmlV1, TargetRange } from './types'
import { ResolvedChange } from 'multi-file-edit/types'
import { findSingleFileMatchingPartialPath } from 'helpers/vscode'
import { SessionDocumentManager } from 'document-helpers/document-manager'
import { vscodeRangeToLineRange } from 'document-helpers/document-snapshot'

/**
 * Data structure limitation:
 * Right now we are silently dropping the things that were not resolved.
 * Instead we should be returning a resolved change that is actually not resolved.
 * so return MayBeResolved type+
 *
 * Design decision notes:
 * I'm taking a slightly different approach than I was thinking before.
 * I thought the mapper to resolve changes was going to be independent from version specific logic.
 * It can still be done and probably is a better way of doing this, but I'm going to start with a simpler approach.
 * Original approach would involve having two mappers.
 * The first one is version specific that will map to a resolved outdated range give the file snapshots.
 * The second mapper would adjust the ranges to the current file content.
 *
 * I think this is a path to introduced more abstractions prematurely without understanding the problem well enough.
 */
export const makeToResolvedChangesTransformer = (
  sessionDocumentManager: SessionDocumentManager,
) =>
  async function (
    multiFileChangeSet: LlmGeneratedPatchXmlV1,
  ): Promise<ResolvedChange[]> {
    // Refactor: xml generator is already better represented with a flat set of changes
    // let's update the rest of the code including this function to reflect that
    const changesGroupedByFile = await Promise.all(
      multiFileChangeSet.changes.map(
        async ({
          change,
          filePathRelativeToWorkspace,
          isStreamFinilized,
        }): Promise<ResolvedChange[]> => {
          // Find the matching document snapshot, we need those to perform an edit with an outdated range
          if (!filePathRelativeToWorkspace) return []
          const fileUri = await findSingleFileMatchingPartialPath(
            filePathRelativeToWorkspace,
          )
          if (!fileUri) return []

          const documentSnapshot =
            sessionDocumentManager.getDocumentSnapshot(fileUri)
          if (!documentSnapshot)
            throw new Error(
              `Document ${
                fileUri.fsPath
              } not found in session. Files in the session: ${sessionDocumentManager.dumpState()} Unable to modify files but were not added to the snapshot. This is most likely a bug or LLM might have produced a bogus file path to modify.`,
            )

          // Collect all the result changes for this file so far

          const rangeToReplace = findTargetRangeInFileWithContent(
            change.oldChunk,
            documentSnapshot.snapshotContext.content,
            documentSnapshot.document.eol,
          )

          if (!rangeToReplace) return []

          // Use the DocumentSnapshot to adjust the range to current time
          const lineRangedToReplace = vscodeRangeToLineRange(rangeToReplace)
          const rangeInCurrentDocument =
            documentSnapshot.toCurrentDocumentRange(lineRangedToReplace)

          // TODO: We really should not be throwing an error here.
          // Instead we should somehow report this change as not resolved
          if (rangeInCurrentDocument.type === 'error')
            throw new Error(
              `Range is out of bounds of the document ${fileUri.fsPath}\nError: ${rangeInCurrentDocument.error}`,
            )

          const resolvedChange: ResolvedChange = {
            fileUri: fileUri,
            descriptionForHuman: change.description,
            rangeToReplace: rangeInCurrentDocument.value,
            rangeToReplaceIsFinal: change.oldChunk.isStreamFinalized,
            replacement: change.newChunk.content,
            replacementIsFinal: isStreamFinilized,
          }

          return [resolvedChange]
        },
      ),
    )

    return changesGroupedByFile.flatMap((x) => x)
  }

/**
 * Isaiah would blame me for using a third party library for this.
 * But I did simply just copy it over, though I'm also barely using it.
 *
 * Simplify to remove the dependency
 */
export function findTargetRangeInFileWithContent(
  oldChunk: TargetRange,
  documentContent: string,
  documentEndOfLine: vscode.EndOfLine,
): vscode.Range | undefined {
  const eofString = documentEndOfLine === vscode.EndOfLine.CRLF ? '\r\n' : '\n'
  const fileLines = documentContent.split(eofString)

  /**
   * Finds a line in the document that matches the given line, only if it is the only match
   */
  const searchLine = (lines: string[], line: string) => {
    const trimmedLine = line.trim()

    const firstMatchIndex = lines.findIndex((l) => l.trim() === trimmedLine)

    // Make sure its the only match
    const secondMatchIndex = lines.findIndex(
      (l, i) => i !== firstMatchIndex && l.trim() === trimmedLine,
    )
    if (secondMatchIndex !== -1) return -1

    return firstMatchIndex
  }

  // Separately handle a case with four empty files - assume we're inserting into the first line
  if (documentContent.trim() === '') return new vscode.Range(0, 0, 0, 0)

  // Separately handle a case of very simple ranges (single line)
  if (
    oldChunk.type === 'fullContentRange' &&
    // Were replacing a single line
    oldChunk.fullContent.indexOf(eofString) === -1
  ) {
    const lineIndex = searchLine(fileLines, oldChunk.fullContent)
    if (lineIndex === -1) return undefined
    else
      return new vscode.Range(
        lineIndex,
        0,
        lineIndex,
        fileLines[lineIndex].length,
      )
  }

  // Get both range formats to a common format
  let prefixLines: string[]
  let suffixLines: string[]
  if (oldChunk.type === 'fullContentRange') {
    const lines = oldChunk.fullContent.split(eofString)
    const middleIndex = Math.floor(lines.length / 2)
    prefixLines = lines.slice(0, middleIndex)
    suffixLines = lines.slice(middleIndex)
  } else {
    prefixLines = oldChunk.prefixContent.split(eofString)
    suffixLines = oldChunk.suffixContent.split(eofString)
  }

  // Find the start and end of the range
  let start = -1
  let end = -1
  // Keep track of these to adjust the start and end indices
  let prefixIndex = -1
  let suffixIndex = -1

  while (start === -1 && prefixIndex < prefixLines.length - 1)
    start = searchLine(fileLines, prefixLines[++prefixIndex])

  while (end === -1 && suffixIndex < suffixLines.length - 1)
    end = searchLine(
      fileLines,
      suffixLines[suffixLines.length - 1 - ++suffixIndex],
    )

  if (start === -1 || end === -1 || start > end) return undefined

  start -= prefixIndex
  end += suffixIndex

  return new vscode.Range(start, 0, end, fileLines[end].length)
}
