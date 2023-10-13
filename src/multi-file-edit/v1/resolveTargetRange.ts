import * as vscode from 'vscode'
import { LlmGeneratedPatchXmlV1, TargetRange } from './types'
import {
  ResolvedChange,
  ResolvedExistingFileEditChange,
  ResolvedTerminalCommandChange,
} from 'multi-file-edit/types'
import { findSingleFileMatchingPartialPath } from 'helpers/fileSystem'
import { SessionContextManager } from 'context/manager'
import { vscodeRangeToLineRange } from 'context/documentSnapshot'

/**
 * Data structure limitation:
 * Right now we are silently dropping the things that were not resolved.
 * Instead we should be returning a resolved change that is actually not
 * resolved. so return MayBeResolved type+
 *
 * Design decision notes:
 * I'm taking a slightly different approach than I was thinking before.
 * I thought the mapper to resolve changes was going to be independent from
 * version specific logic. It can still be done and probably is a better way of
 * doing this, but I'm going to start with a simpler approach. Original
 * approach would involve having two mappers.
 * The first one is version specific that will map to a resolved outdated range
 * give the file snapshots. The second mapper would adjust the ranges to the
 * current file content.
 *
 * I think this is a path to introduce more abstractions prematurely without
 * understanding the problem well enough.
 */
export const makeToResolvedChangesTransformer = (
  sessionDocumentManager: SessionContextManager,
) =>
  function (multiFileChangeSet: LlmGeneratedPatchXmlV1): ResolvedChange[] {
    const resolvedFileEditChanges = multiFileChangeSet.changes.flatMap(
      ({
        change,
        filePathRelativeToWorkspace,
        isStreamFinilized,
      }): ResolvedChange[] => {
        /*
         * Creating new files being an option throws a curveball and to find
         * single file. We might find a single file that matches the partial
         * path but it might actually be a partial path of a new file we're
         * trying to create.
         * Solution: We should only use final paths for file changes. If the
         * path is not final drop this change.
         */

        const allEditableUris = sessionDocumentManager.getEditableFileUris()
        const existingFileUri = findSingleFileMatchingPartialPath(
          allEditableUris,
          filePathRelativeToWorkspace,
        )

        /*
         * Since creating a new file
         * is very similar to making changes to existing files, let's simply
         * handle file creation on the resolution stage.
         *
         * This means we're trying to create a new file.
         * This is hacky but I don't see a simple solution with the current
         * abstractions without a major refactor.
         *
         * Multiple new files might be created for the same path, I don't think
         * it will cause any visible issues, but obviously this is a design
         * issue and the hack.
         *
         * - Create a new empty file within the workspace
         * - Add it to the session document manager, so it can later be
         * resolved - Ignore this change
         */
        if (!existingFileUri) {
          const newFileUri = vscode.Uri.joinPath(
            vscode.workspace.workspaceFolders![0].uri,
            filePathRelativeToWorkspace,
          )
          async function RACY_createNewEmptyFile() {
            console.log('Creating new file', newFileUri.fsPath)
            await vscode.workspace.fs.writeFile(newFileUri, new Uint8Array())
            // VSCode is known to be slow to update the file system
            await new Promise((resolve) => setTimeout(resolve, 50))
            await sessionDocumentManager.addDocuments(
              'Files created during session',
              [newFileUri],
            )
          }
          void RACY_createNewEmptyFile()
          return []
        }

        const documentSnapshot =
          sessionDocumentManager.getDocumentSnapshot(existingFileUri)
        if (!documentSnapshot) {
          throw new Error(
            `Document ${
              existingFileUri.fsPath
            } not found in session. Files in the session: ${sessionDocumentManager.dumpState()} Unable to modify files but were not added to the snapshot. This is most likely a bug or LLM might have produced a bogus file path to modify.`,
          )
        }

        // Collect all the result changes for this file so far

        const rangeToReplace = findTargetRangeInFileWithContent(
          change.oldChunk,
          documentSnapshot.fileSnapshotForLlm.content,
          documentSnapshot.document.eol,
        )

        if (!rangeToReplace) {
          return []
        }

        // Use the DocumentSnapshot to adjust the range to current time
        const lineRangedToReplace = vscodeRangeToLineRange(rangeToReplace)
        const rangeInCurrentDocument =
          documentSnapshot.toCurrentDocumentRange(lineRangedToReplace)

        /*
         * TODO: We really should not be throwing an error here.
         * Instead we should somehow report this change as not resolved
         */
        if (rangeInCurrentDocument.type === 'error') {
          /*
           * BUG: This seems to fail even when things are finish?
           * still a bug but lets investigate later
           * Causes an infinite loop, probably because we are shifting the
           *    array by one
           *
           * Shit, should have written down the repro when I had it :D
           */
          console.trace(
            `Range is out of bounds of the document ${existingFileUri.fsPath}\nError: ${rangeInCurrentDocument.error}`,
          )
          /*
           * HACK [resolve-after-save]
           * to avoid shifting array,
           * assumes this happens once this change was already finalized,
           * again, bad modeling symptom.
           * - we should really not be resolving changes that got finalized!
           */
          return [
            {
              type: 'ResolvedExistingFileEditChange',
              fileUri: existingFileUri,
              descriptionForHuman: change.description,
              // noop
              rangeToReplace: new vscode.Range(0, 0, 0, 0),
              rangeToReplaceIsFinal: change.oldChunk.isStreamFinalized,
              // noop
              replacement: '',
              replacementIsFinal: isStreamFinilized,
            },
          ]
        }

        const resolvedChange: ResolvedExistingFileEditChange = {
          type: 'ResolvedExistingFileEditChange',
          fileUri: existingFileUri,
          descriptionForHuman: change.description,
          rangeToReplace: rangeInCurrentDocument.value,
          rangeToReplaceIsFinal: change.oldChunk.isStreamFinalized,
          replacement: change.newChunk.content,
          replacementIsFinal: isStreamFinilized,
        }

        return [resolvedChange]
      },
    )

    return [
      ...resolvedFileEditChanges,
      ...multiFileChangeSet.terminalCommands.map(
        (terminalCommand): ResolvedTerminalCommandChange => ({
          type: 'ResolvedTerminalCommandChange',
          command: terminalCommand,
        }),
      ),
    ]
  }

/**
 * Isaiah would blame me for using a third party library for this.
 * But I did simply just copy it over, though I'm also barely using it.
 *
 * Simplify to remove the dependency
 *
 * documentContent on windows will have clrf BUT oldChunk is created by the LLM
 * and all new line characters are \n!!!!
 *
 * So we need to handle file contents with \r\n and \n but always treat llm
 * response as \n
 *
 */
export function findTargetRangeInFileWithContent(
  oldChunk: TargetRange,
  documentContent: string,
  documentEndOfLine: vscode.EndOfLine,
): vscode.Range | undefined {
  const eofString = documentEndOfLine === vscode.EndOfLine.CRLF ? '\r\n' : '\n'
  const fileLines = documentContent.split(eofString)

  /**
   * Finds a line in the document that matches the given line, only if it is
   * the only match
   */
  const searchLine = (lines: string[], line: string) => {
    const trimmedLine = line.trim()

    const firstMatchIndex = lines.findIndex((l) => l.trim() === trimmedLine)

    // Make sure its the only match
    const secondMatchIndex = lines.findIndex(
      (l, i) => i !== firstMatchIndex && l.trim() === trimmedLine,
    )
    if (secondMatchIndex !== -1) {
      return -1
    }

    return firstMatchIndex
  }

  /*
   * Separately handle a case with four empty files - assume we're inserting
   * into the first line
   */
  if (documentContent.trim() === '') {
    return new vscode.Range(0, 0, 0, 0)
  }

  // Separately handle a case of very simple ranges (single line)
  if (
    oldChunk.type === 'fullContentRange' &&
    // Were replacing a single line
    oldChunk.fullContent.indexOf(eofString) === -1
  ) {
    const lineIndex = searchLine(fileLines, oldChunk.fullContent)
    if (lineIndex === -1) {
      return undefined
    } else {
      return new vscode.Range(
        lineIndex,
        0,
        lineIndex,
        fileLines[lineIndex].length,
      )
    }
  }

  // Get both range formats to a common format
  let prefixLines: string[]
  let suffixLines: string[]
  if (oldChunk.type === 'fullContentRange') {
    //
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

  while (start === -1 && prefixIndex < prefixLines.length - 1) {
    start = searchLine(fileLines, prefixLines[++prefixIndex])
  }

  while (end === -1 && suffixIndex < suffixLines.length - 1) {
    end = searchLine(
      fileLines,
      suffixLines[suffixLines.length - 1 - ++suffixIndex],
    )
  }

  if (start === -1 || end === -1 || start > end) {
    return undefined
  }

  start -= prefixIndex
  end += suffixIndex

  return new vscode.Range(start, 0, end, fileLines[end].length)
}
