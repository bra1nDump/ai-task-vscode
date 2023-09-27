import * as vscode from 'vscode'
import { AsyncIterableX, last as lastAsync } from 'ix/asynciterable'
import { map as mapAsync } from 'ix/asynciterable/operators'
import { SessionContext } from 'session'
import { queueAnAppendToDocument } from 'helpers/vscode'
import {
  ResolvedChange,
  ResolvedExistingFileEditChange,
  ResolvedTerminalCommandChange,
} from './types'
import { targetRangeHighlightingDecoration } from './targetRangeHighlightingDecoration'

/**
 * Currently top level extension command invokes this after applying v1
 * specific transformations to resolve the changes.
 * I think top level extension command should only call a single function from
 * v1 and that function in turn will use this application function.
 */
export async function startInteractiveMultiFileApplication(
  growingSetOfFileChanges: AsyncIterableX<ResolvedChange[]>,
  context: SessionContext,
) {
  const existingFileEdits = growingSetOfFileChanges.pipe(
    mapAsync((changes) =>
      changes.filter(
        (change): change is ResolvedExistingFileEditChange =>
          change.type === 'ResolvedExistingFileEditChange',
      ),
    ),
  )
  const terminalCommands = growingSetOfFileChanges.pipe(
    mapAsync((changes) =>
      changes.filter(
        (change): change is ResolvedTerminalCommandChange =>
          change.type === 'ResolvedTerminalCommandChange',
      ),
    ),
  )
  await Promise.allSettled([
    Promise.allSettled([
      /* It would be nice to have access to LLM stream here (or elsewhere )
       * so we can show the user the prompt that was used to generate the
       * changes, along with the changes This is to get more realtime feedback
       * and for debugging
       */
      showFilesOnceWeKnowWeWantToModifyThem(existingFileEdits, context),
      highlightTargetRangesAsTheyBecomeAvailable(existingFileEdits, context),
      applyChangesAsTheyBecomeAvailable(existingFileEdits, context),
      appendDescriptionsAsTheyBecomeAvailable(existingFileEdits, context),
      showWarningWhenNoFileWasModified(existingFileEdits, context),
    ]),
    runTerminalCommands(terminalCommands, context),
  ])
}

export type ChangeApplicationResult =
  | 'appliedSuccessfully'
  | 'failedToApplyCanRetry'

async function appendDescriptionsAsTheyBecomeAvailable(
  growingSetOfFileChanges: AsyncIterableX<ResolvedExistingFileEditChange[]>,
  context: SessionContext,
) {
  const changesWithFinalizedDescription = new Set<number>()
  const changeIndexToLastDescription = new Map<number, string>()
  for await (const changesForMultipleFiles of growingSetOfFileChanges) {
    for (const [index, change] of changesForMultipleFiles.entries()) {
      /* You are paying for the hack of not having a proper streaming field
         abstraction 
         We only want to start the pseudocode section once we have 
         */
      if (
        changesWithFinalizedDescription.has(index) ||
        change.descriptionForHuman === undefined ||
        change.descriptionForHuman === '' // Otherwise we need more logic in the statements below
      ) {
        continue
      }

      const lastDescription = changeIndexToLastDescription.get(index)
      // First time we see this change, append the description header
      if (lastDescription === undefined) {
        void queueAnAppendToDocument(
          context.markdownHighLevelFeedbackDocument,
          '\n### Pseudocode\n```\n',
        )
      }

      if (lastDescription !== change.descriptionForHuman) {
        // We are still streaming the description because it is been updated
        const delta = change.descriptionForHuman.slice(
          lastDescription?.length ?? 0,
        )
        void queueAnAppendToDocument(
          context.markdownHighLevelFeedbackDocument,
          delta,
        )
        changeIndexToLastDescription.set(index, change.descriptionForHuman)
      } else if (change.replacementIsFinal || change.replacement.length > 10) {
        /* Since we are trimming the description of the new line we cannot rely
         * on the equality above since it will fail on the first line break.
         * Instead we need to rely on the proxy of the replacement being non
         * empty. Yet again paying the hack tax.
         */
        void queueAnAppendToDocument(
          context.markdownHighLevelFeedbackDocument,
          '\n```',
        )
        // The description is finalized
        changesWithFinalizedDescription.add(index)
      }
    }
  }
}

async function applyChangesAsTheyBecomeAvailable(
  growingSetOfFileChanges: AsyncIterableX<ResolvedExistingFileEditChange[]>,
  context: SessionContext,
) {
  const appliedChangesIndices = new Set<number>()
  for await (const changesForMultipleFiles of growingSetOfFileChanges) {
    for (const [index, change] of changesForMultipleFiles.entries()) {
      if (
        !appliedChangesIndices.has(index) &&
        /* We only want to start applying once we know the range we are
           replacing */
        change.rangeToReplaceIsFinal &&
        /* Avoid deleting old range before we have anything to display.
         * Refactor: Ideally we will have some abstraction that will tell us
         * that the field started streaming, is currently streaming and is
         * finalized.
         */
        (change.replacementIsFinal || change.replacement.length > 10)
      ) {
        await applyResolvedChangesWhileShowingTheEditor(change)

        /* Add the index to the set of applied changes once the change we
           applied is final */
        if (change.replacementIsFinal) {
          appliedChangesIndices.add(index)
        }
      }
    }
  }
}

async function highlightTargetRangesAsTheyBecomeAvailable(
  growingSetOfFileChanges: AsyncIterableX<ResolvedExistingFileEditChange[]>,
  context: SessionContext,
) {
  const shownEditorAndRevealedRange = new Set<number>()
  const highlightedChanges = new Set<number>()
  const finalizedChanges = new Set<number>()
  const highlightingRemovalTimeouts = new Map<number, NodeJS.Timeout>()
  for await (const changesForMultipleFiles of growingSetOfFileChanges) {
    for (const [index, change] of changesForMultipleFiles.entries()) {
      const findMatchingVisibleEditor = () =>
        vscode.window.visibleTextEditors.find(
          (editor) => editor.document.uri.path === change.fileUri.path,
        )

      // Show the editor if it is not already shown
      if (!shownEditorAndRevealedRange.has(index)) {
        // Decorations can only be set on active editors
        const editor = await vscode.window.showTextDocument(change.fileUri)

        // We want to show the user the area we're updating
        editor.revealRange(
          change.rangeToReplace,
          vscode.TextEditorRevealType.InCenter,
        )

        shownEditorAndRevealedRange.add(index)
      }

      /* As long as the change is not finalized (or we have not cancelled the
         session) we want to keep highlighting alive.
       * This code continuously clears out that old timer and creates a new one
       * for every time a change updates.
       */
      if (!finalizedChanges.has(index)) {
        // Clear the timeout if it exists
        const previousTimeout = highlightingRemovalTimeouts.get(index)
        if (previousTimeout) {
          clearTimeout(previousTimeout)
        }

        /* Set a new timeout to clear the highlighting,
           this implementation also handles when we abort the session
           Assumption: LLM produces at least a token a second */
        const timeout = setTimeout(() => {
          // Only dehighlight of the editor is visible
          const editor = findMatchingVisibleEditor()
          editor?.setDecorations(targetRangeHighlightingDecoration, [])
        }, 3000)
        highlightingRemovalTimeouts.set(index, timeout)

        /* Mark as finalized only once the replacement stopped changing.
         * This effectively starts the timer to remove the highlighting.
         */
        if (change.replacementIsFinal) {
          finalizedChanges.add(index)
        }
      }

      // Highlight the range if it was not already highlighted, only done once
      if (!highlightedChanges.has(index) && change.rangeToReplace) {
        const editor = findMatchingVisibleEditor()
        editor?.setDecorations(targetRangeHighlightingDecoration, [
          change.rangeToReplace,
        ])

        /* First  we will replace the old range with empty content,
         * effectively removing the decoration Once we have added nonempty
         * content, or the changes final we no longer need to update the
         * decoration since subsequent inserts will extended the decoration by
         * vscode natively
         */
        if (
          /* Warning: Not sure why it was not working,
             keeping redundant decoration updates for now
             change.replacement.length > 10 || */
          change.replacementIsFinal
        ) {
          highlightedChanges.add(index)
        }
      }
    }
  }
}

async function showFilesOnceWeKnowWeWantToModifyThem(
  growingSetOfFileChanges: AsyncIterableX<ResolvedExistingFileEditChange[]>,
  context: SessionContext,
) {
  const shownChangeIndexes = new Set<string>()
  for await (const changesForMultipleFiles of growingSetOfFileChanges) {
    for (const change of changesForMultipleFiles) {
      if (!shownChangeIndexes.has(change.fileUri.fsPath)) {
        const document = await vscode.workspace.openTextDocument(change.fileUri)
        const relativeFilepath = vscode.workspace.asRelativePath(change.fileUri)
        void queueAnAppendToDocument(
          context.markdownHighLevelFeedbackDocument,
          `\n### Modifying ${relativeFilepath}\n`,
        )
        await vscode.window.showTextDocument(document)
        shownChangeIndexes.add(change.fileUri.fsPath)
      }
    }
  }
}

async function showWarningWhenNoFileWasModified(
  growingSetOfFileChanges: AsyncIterableX<ResolvedExistingFileEditChange[]>,
  context: SessionContext,
) {
  const finalSetOfChangesToMultipleFiles = await lastAsync(
    growingSetOfFileChanges,
  )
  if (!finalSetOfChangesToMultipleFiles) {
    void queueAnAppendToDocument(
      context.markdownHighLevelFeedbackDocument,
      '\n## No files got changed thats strange\n',
    )
  }
}

export async function applyResolvedChangesWhileShowingTheEditor(
  resolvedChange: ResolvedExistingFileEditChange,
): Promise<ChangeApplicationResult> {
  /* WARNING: The editor has to be shown before we can apply the changes!
     This is not very nice for parallelization.
   * We should migrate to workspace edits for documents not currently visible.
   */
  const document = await vscode.workspace.openTextDocument(
    resolvedChange.fileUri,
  )
  const editor = await vscode.window.showTextDocument(document)

  /*
  This will throw if the editor has been de allocated! 
   * This is likely to happen if the user switches tabs while we are applying
   * the changes We don't want everything to fail simply because the user
   * switched tabs or closed it.

   * The issue was discovered when awaiting all the changes to be applied
   * creating a race condition for the active editor. For the time being I will
   * basically do serial applications similar to how we do it in the
   * extension()

  Ideally we should support two ways of applying changes:
  1. Apply changes to the current editor
  2. Apply changes to the document in the background

   * We can try to perform the edit on the editor, and if fails we will perform
   * it on the document. Ideally we also want to prevent opening the same
   * editor multiple times within the session. This most likely will require
   * another abstraction to keep track of things we have already shown to the
   * user.
  */

  debug('Applying change to editor')
  debug('Document before replacement', document.getText())
  const { start, end } = resolvedChange.rangeToReplace
  debug(
    `Replacing range: ${start.line}, ${start.character} - ${end.line}, ${end.character}`,
  )
  debug('Replacing content:', document.getText(resolvedChange.rangeToReplace))
  debug('With:', resolvedChange.replacement)

  /* Applied the most recent change to the editor.
   * Optimized to use an insert operation at the end of the range if existing
   * contents partially match the replacement.
   * Done to avoid the flickering of the code highlighting when the same range
   * is repeatedly replaced
   */
  let isApplicationSuccessful
  const oldContent = document.getText(resolvedChange.rangeToReplace)
  if (resolvedChange.replacement.startsWith(oldContent)) {
    const delta = resolvedChange.replacement.substring(oldContent.length)
    debug(
      `Delta: ${delta}, oldContent: ${oldContent}, position: ${end.line}, ${end.character}`,
    )
    isApplicationSuccessful = await editor.edit(
      (editBuilder) => {
        editBuilder.insert(resolvedChange.rangeToReplace.end, delta)
      },
      /* https://stackoverflow.com/a/71787983/5278310
       * Make it possible to undo all the session changes in one go by avoiding
       * undo checkpoints
       */
      { undoStopBefore: false, undoStopAfter: false },
    )
  } else {
    isApplicationSuccessful = await editor.edit(
      (editBuilder) => {
        editBuilder.replace(
          resolvedChange.rangeToReplace,
          resolvedChange.replacement,
        )
      },
      /* Checkpoint before the the first edit to this range,
         usually replacing old content with empty string */
      { undoStopBefore: true, undoStopAfter: false },
    )
  }

  debug('Document after replacement', document.getText())

  return isApplicationSuccessful
    ? 'appliedSuccessfully'
    : 'failedToApplyCanRetry'
}

async function runTerminalCommands(
  terminalCommands: AsyncIterableX<ResolvedTerminalCommandChange[]>,
  context: SessionContext,
) {
  const runCommands = new Set<number>()
  for await (const changesForMultipleFiles of terminalCommands) {
    for (const [index, change] of changesForMultipleFiles.entries()) {
      if (!runCommands.has(index)) {
        void queueAnAppendToDocument(
          context.markdownHighLevelFeedbackDocument,
          `\n### Running ${change.command}\n`,
        )
        vscode.window
          .createTerminal('AI-Task Extension')
          .sendText(change.command)
        runCommands.add(index)
      }
    }
  }
}

function debug(...args: any[]) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  // console.log(...args)
}
