import * as vscode from 'vscode'
import { LlmGeneratedPatchXmlV1, TargetRange } from './types'
import { LinesAndColumns } from 'helpers/lines-and-columns'
import { ResolvedChange } from 'multi-file-edit/types'
import { findSingleFileMatchingPartialPath, getFileText } from 'helpers/vscode'

/**
 * Data structure limitation:
 * Right now we are silently dropping the things that were not resolved.
 * Instead we should be returning a resolved change that is actually not resolved.
 * so return MayBeResolved type
 *
 * Limitation: resolution is performed relative to file contents
 * on disk. Often editor contents - which is what the user expects to be referenced
 * should be used instead. Check all opened editors and if there is one
 * matching the file path - get the content from there.
 *
 * Hack: save all editors before sending the request? :D
 *
 * Even that solution would still have a bug - llm is recommending the changes
 * based on the snapshot it was sent, by the time the changes are resolved the file
 * or editor might have been updated.
 *
 * Hack: check if file isDirty is set - ignore the file. The idea is you
 * are observing the llm doing the work so you should not be modifying files yourself :D
 */
export async function mapToResolvedChanges(
  multiFileChangeSet: LlmGeneratedPatchXmlV1,
): Promise<ResolvedChange[]> {
  const changesGroupedByFile = await Promise.all(
    multiFileChangeSet.changes.map(
      async ({
        changes,
        filePathRelativeToWorkspace,
        isStreamFinilized,
      }): Promise<ResolvedChange[]> => {
        if (!filePathRelativeToWorkspace) return []
        const fileUri = await findSingleFileMatchingPartialPath(
          filePathRelativeToWorkspace,
        )
        if (!fileUri) return []

        const fileContent = await getFileText(fileUri)

        /*
          Bug: Downstream assumption of set of changes being growing is violated.
          Let's say we're modifying two files, A, B
          Once we have applied the changes to the first file, 
          If get text file will return the updated content of the file 
          The old edit range will not be found in the updated file content (we are using the old content to search for the range)

          We do want to use the I updated content though, because this is how we enable multiple edits to the same file as well as editing unsaved files.

          Related tissues:
          - How would this interact if we refactor ranges to be based on lines instead of contents?
          - How does this interact with partial application?

          Possible solutions:
          - Change range resolution to be stateful, and stop updating a range once it has been resolved fully
            - Now for partial applications to work more work would being needed on the application side for range tracking. This is related logic so it will be two places to make mistakes for the same thing roughly.
          - [Selected] Create and intermediate target range that is a discriminated union between two types: RangedToReplaceContentBased or to be added later RangedToReplaceLineBased
            - Rename resolved change to Change and switch range to replace to be the intermediate type
            - Instead of this file doing full resolution to VS called range it should simply bring v1 specific Xml patch type two a common Change type
            - Final change resolution should be performed on the application side, it should cach the initial target range, and update it on subsequent partial edits. 
        */
        const resolvedChanges = changes.reduce((acc, change) => {
          const rangeToReplace = findTargetRangeInFileWithContent(
            change.oldChunk,
            fileContent,
          )
          if (!rangeToReplace) return acc

          const resolvedChange: ResolvedChange = {
            fileUri: fileUri,
            descriptionForHuman: change.description,
            rangeToReplace,
            rangeToReplaceIsFinal: change.oldChunk.isStreamFinalized,
            replacement: change.newChunk.content,
            replacementIsFinal: isStreamFinilized,
          }

          return [...acc, resolvedChange]
        }, [] as ResolvedChange[])

        return resolvedChanges
      },
    ),
  )

  return changesGroupedByFile.flatMap((x) => x)
}

export function findTargetRangeInFileWithContent(
  oldChunk: TargetRange,
  fileContent: string,
): vscode.Range | undefined {
  const fileLines = fileContent.split('\n')
  const linesAndColumns = new LinesAndColumns(fileContent)

  /**
   * Finds a line in the document that matches the given line, only if it is the only match
   */
  const searchLine = (lines: string[], line: string) => {
    const trimmedLine = line.trim()

    // Never match empty lines
    if (trimmedLine === '') return -1

    const firstMatchIndex = lines.findIndex((l) => l.trim() === trimmedLine)

    // Make sure its the only match
    const secondMatchIndex = lines.findIndex(
      (l, i) => i !== firstMatchIndex && l.trim() === trimmedLine,
    )
    if (secondMatchIndex !== -1) return -1

    return firstMatchIndex
  }

  // Separately handle a case of very simple / empty files
  // Search for entire content in the document
  if (oldChunk.type === 'fullContentRange') {
    const fullContentIndex = fileContent.indexOf(oldChunk.fullContent)
    if (fullContentIndex !== -1) {
      const fullContentLines = oldChunk.fullContent.split('\n')
      const startLine = linesAndColumns.locationForIndex(fullContentIndex)!.line
      const endLine = startLine + fullContentLines.length - 1
      return new vscode.Range(
        startLine,
        0,
        endLine,
        linesAndColumns.lengthOfLine(endLine),
      )
    }
  }

  // Get both range formats to a common format
  let prefixLines: string[]
  let suffixLines: string[]
  if (oldChunk.type === 'fullContentRange') {
    const lines = oldChunk.fullContent.split('\n')
    const middleIndex = Math.floor(lines.length / 2)
    prefixLines = lines.slice(0, middleIndex)
    suffixLines = lines.slice(middleIndex)
  } else {
    prefixLines = oldChunk.prefixContent.split('\n')
    suffixLines = oldChunk.suffixContent.split('\n')
  }

  // Find the start and end of the range
  let start = -1
  let end = -1
  // Keep track of these to adjust the start and end indices
  let prefixIndex = 0
  let suffixIndex = 0

  while (start === -1 && prefixIndex < prefixLines.length) {
    start = searchLine(fileLines, prefixLines[prefixIndex])
    prefixIndex++
  }

  while (end === -1 && suffixIndex < suffixLines.length) {
    end = searchLine(
      fileLines,
      suffixLines[suffixLines.length - 1 - suffixIndex],
    )
    suffixIndex++
  }

  if (start === -1 || end === -1 || start > end) {
    console.error('Could not find range', start, end)
    return undefined
  }

  start -= prefixIndex - 1
  end += suffixIndex - 1

  return new vscode.Range(start, 0, end, linesAndColumns.lengthOfLine(end))
}
