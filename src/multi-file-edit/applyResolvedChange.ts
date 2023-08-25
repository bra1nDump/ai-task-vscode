import * as vscode from 'vscode'
import { AsyncIterableX, last as lastAsync } from 'ix/asynciterable'
import { SessionContext } from 'execution/realtime-feedback'
import { appendToDocument } from 'helpers/vscode'
import { ResolvedChange } from './types'

/**
 * Currently top level extension command invokes this after applying v1
 * specific transformations to resolve the changes.
 * I think top level extension command should only call a single function from v1
 * and that function in turn will use this application function.
 */
export async function startInteractiveMultiFileApplication(
  growingSetOfFileChanges: AsyncIterableX<ResolvedChange[]>,
  context: SessionContext,
) {
  await Promise.allSettled([
    // It would be nice to have access to LLM stream here (or elsewhere )
    // so we can show the user the prompt that was used to generate the changes, along with the changes
    // This is to get more realtime feedback and for debugging
    showFilesOnceWeKnowWeWantToModifyThem(growingSetOfFileChanges, context),
    highlightTargetRangesAsTheyBecomeAvailable(
      growingSetOfFileChanges,
      context,
    ),
    applyChangesAsTheyBecomeAvailable(growingSetOfFileChanges, context),
    showWarningWhenNoFileWasModified(growingSetOfFileChanges, context),
  ])
}

export type ChangeApplicationResult =
  | 'appliedSuccessfully'
  | 'failedToApplyCanRetry'

// Refactor: abstract the iteration away alongside checking if a given change was already processed

async function applyChangesAsTheyBecomeAvailable(
  growingSetOfFileChanges: AsyncIterableX<ResolvedChange[]>,
  context: SessionContext,
) {
  const appliedChangesIndices = new Set<number>()
  for await (const changesForMultipleFiles of growingSetOfFileChanges)
    for (const [index, change] of changesForMultipleFiles.entries())
      if (!appliedChangesIndices.has(index) && change.isFinal) {
        const filePathRelativeToWorkspaceRoot = vscode.workspace.asRelativePath(
          change.fileUri,
        )
        await appendToDocument(
          context.sessionMarkdownHighLevelFeedbackDocument,
          `- Applying changes to: ${filePathRelativeToWorkspaceRoot}\n`,
        )
        await applyResolvedChangesWhileShowingTheEditor(change)

        // Add the index to the set of applied changes
        appliedChangesIndices.add(index)
      }
}

// Create a new decoration
const targetRangeHighlightingDecoration =
  vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255,255,0,0.3)',
  })

async function highlightTargetRangesAsTheyBecomeAvailable(
  growingSetOfFileChanges: AsyncIterableX<ResolvedChange[]>,
  context: SessionContext,
) {
  const processedChanges = new Set<number>()
  for await (const changesForMultipleFiles of growingSetOfFileChanges)
    for (const [index, change] of changesForMultipleFiles.entries())
      if (!processedChanges.has(index)) {
        const editor = await vscode.window.showTextDocument(change.fileUri)

        // Set the decoration
        editor.setDecorations(targetRangeHighlightingDecoration, [
          change.rangeToReplace,
        ])
        await appendToDocument(
          context.sessionMarkdownHighLevelFeedbackDocument,
          `- Highlighting range about to be edited in: ${vscode.workspace.asRelativePath(
            change.fileUri,
          )}\n`,
        )

        // Add the index to the set of applied changes
        processedChanges.add(index)
      }
}

async function showFilesOnceWeKnowWeWantToModifyThem(
  growingSetOfFileChanges: AsyncIterableX<ResolvedChange[]>,
  context: SessionContext,
) {
  const shownChangeIndexes = new Set<string>()
  for await (const changesForMultipleFiles of growingSetOfFileChanges)
    for (const change of changesForMultipleFiles)
      if (!shownChangeIndexes.has(change.fileUri.fsPath)) {
        const document = await vscode.workspace.openTextDocument(change.fileUri)
        const relativeFilepath = vscode.workspace.asRelativePath(change.fileUri)
        await appendToDocument(
          context.sessionMarkdownHighLevelFeedbackDocument,
          `- Picked a file to modify: ${relativeFilepath}\n`,
        )
        await vscode.window.showTextDocument(document)
        shownChangeIndexes.add(change.fileUri.fsPath)
      }
}

async function showWarningWhenNoFileWasModified(
  growingSetOfFileChanges: AsyncIterableX<ResolvedChange[]>,
  context: SessionContext,
) {
  const finalSetOfChangesToMultipleFiles = await lastAsync(
    growingSetOfFileChanges,
  )
  if (!finalSetOfChangesToMultipleFiles)
    await appendToDocument(
      context.sessionMarkdownHighLevelFeedbackDocument,
      '- No files got changed thats strange\n',
    )
}

export async function applyResolvedChangesWhileShowingTheEditor(
  resolvedChange: ResolvedChange,
): Promise<ChangeApplicationResult> {
  const document = await vscode.workspace.openTextDocument(
    resolvedChange.fileUri,
  )
  const editor = await vscode.window.showTextDocument(document)

  const isApplicationSuccessful = await editor.edit((editBuilder) => {
    editBuilder.replace(
      resolvedChange.rangeToReplace,
      resolvedChange.replacement,
    )
  })

  // Give the user a chance to see the results
  await new Promise((resolve) => setTimeout(resolve, 5_000))

  return isApplicationSuccessful
    ? 'appliedSuccessfully'
    : 'failedToApplyCanRetry'
}
