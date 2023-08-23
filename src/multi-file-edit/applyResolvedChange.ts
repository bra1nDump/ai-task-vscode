import * as vscode from 'vscode'
import { AsyncIterableX } from 'ix/asynciterable'
import { last as lastAsync } from 'ix/asynciterable'

/**
 * Various patch application implementations should map their changes to a common
 * denominator which is this type
 */
export interface ResolvedChange {
  rangeToReplace: vscode.Range
  replacement: string
  descriptionForHuman: string
}

/** Add info if the file edits are complete */
export interface ResolvedChangesForASingleFile {
  fileUri: vscode.Uri
  fileChanges: ResolvedChange[]
  isFinal: boolean
}

/**
 * This needs to be refactored and split out
 * - Looping over the stream should happen outside - in the command files most likely
 * - There should be two functions invoked on every stream item
 *   - earlyShowFileIntendedToBeModified (first for loop)
 *   - applyPartialPatch (not implements it yet)
 *     Will be hard to keep track of the target range - requires state
 *     alternatively I like the subscription model better, these helper functions will both receive
 *     the stream they can iterate over themselves so they can have state for logic.
 *
 * Each item in the stream is a more up to date set of file changes.
 * There can be multiple files in a single stream item.
 */
export async function continuoulyApplyPatchStream(
  growingSetOfFileChanges: AsyncIterableX<ResolvedChangesForASingleFile[]>,
) {
  // Noop for files already opened
  // Can use distinctUntilChanged for the fun of it :D - micro optimization
  for await (const changesForMultipleFiles of growingSetOfFileChanges)
    for (const changesForASingleFile of changesForMultipleFiles)
      await vscode.workspace.openTextDocument(changesForASingleFile.fileUri)

  // Cop out - only apply once the stream is finished
  const finalSetOfChangesToMultipleFiles =
    await growingSetOfFileChanges.pipe(lastAsync)
  if (!finalSetOfChangesToMultipleFiles) {
    console.error('No files got changed, thats strange')
    return
  }

  await applyResolvedChangesWhileShowingTheEditor(
    finalSetOfChangesToMultipleFiles,
  )
}

export type ChangeApplicationResult =
  | 'appliedSuccessfully'
  | 'failedToApplyCanRetry'

export async function applyResolvedChangesWhileShowingTheEditor(
  finalSetOfChangesToMultipleFiles: ResolvedChangesForASingleFile[],
) {
  for (const changesForASingleFile of finalSetOfChangesToMultipleFiles) {
    const document = await vscode.workspace.openTextDocument(
      changesForASingleFile.fileUri,
    )
    const editor = await vscode.window.showTextDocument(document)

    const fileContentWithDiffApplied = await applyChangesToSingleEditor(
      changesForASingleFile.fileChanges,
      editor,
    )

    await new Promise((resolve) => setTimeout(resolve, 1_000))

    console.log(
      `Diff application results: ${fileContentWithDiffApplied.join('\n')}`,
    )
  }
}

/**
 * Refactor: These changes should already have resolved locations in the code,
 *   resolution should be fully independent of application
 *   actually the only reason this file is within the multi file edit
 *   is because it depends on fine target range that is specific to the format
 */
export async function applyChangesToSingleEditor(
  changes: ResolvedChange[],
  editor: vscode.TextEditor,
): Promise<ChangeApplicationResult[]> {
  return Promise.all(
    changes.map(async (change) => {
      const successfullyApplied = await editor.edit((editBuilder) => {
        editBuilder.replace(change.rangeToReplace, change.replacement)
      })
      return successfullyApplied
        ? 'appliedSuccessfully'
        : 'failedToApplyCanRetry'
    }),
  )
}
