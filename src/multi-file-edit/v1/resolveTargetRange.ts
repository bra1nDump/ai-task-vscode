import * as vscode from 'vscode'
import { LlmGeneratedPatchXmlV1, TargetRange } from './types'
import { LinesAndColumns } from 'helpers/lines-and-columns'
import { ResolvedChangesForASingleFile } from 'multi-file-edit/applyResolvedChange'
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
): Promise<ResolvedChangesForASingleFile[]> {
  const changesGroupedByFile = await Promise.all(
    multiFileChangeSet.changes.flatMap(
      async ({
        changes,
        filePathRelativeToWorkspace,
        isStreamFinilized,
      }): Promise<ResolvedChangesForASingleFile[]> => {
        if (!filePathRelativeToWorkspace) return []
        const fileUri = await findSingleFileMatchingPartialPath(
          filePathRelativeToWorkspace,
        )
        if (!fileUri) return []

        const fileContent = await getFileText(fileUri)

        const resolvedChanges = changes
          .map((change) => {
            // This is what does the bulk of the work
            // everything else is just plumbing around it
            const rangeToReplace = findTargetRangeInFileWithContent(
              change.oldChunk,
              fileContent,
            )
            if (!rangeToReplace) return []

            return [
              {
                fileUri: fileUri,
                rangeToReplace,
                replacement: change.newChunk.content,
                descriptionForHuman: change.description,
              },
            ]
          })
          .flatMap((x) => x)

        return [
          {
            fileUri: fileUri,
            fileChanges: resolvedChanges,
            isFinal: isStreamFinilized,
          },
        ]
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
