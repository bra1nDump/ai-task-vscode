import * as vscode from 'vscode'

import { FileContext } from 'document-helpers/file-context'
import { streamLlm } from 'helpers/openai'
import { from } from 'ix/asynciterable'

import { startInteractiveMultiFileApplication } from 'multi-file-edit/applyResolvedChange'
import { parsePartialMultiFileEdit } from './parse'
import { makeToResolvedChangesTransformer } from './resolveTargetRange'
import { SessionContext } from 'session'
import { queueAnAppendToDocument } from 'helpers/vscode'

import { map as mapAsync } from 'ix/asynciterable/operators'
import { createMultiFileEditingMessages } from './prompt'

export async function startMultiFileEditing(
  taskPrompt: string,
  sessionContext: SessionContext,
) {
  const fileContexts = sessionContext.documentManager.getFileContexts()

  const messages = createMultiFileEditingMessages(
    fileContexts,
    taskPrompt,
    sessionContext.configuration,
  )

  const highLevelLogger = (text: string) =>
    queueAnAppendToDocument(
      sessionContext.markdownHighLevelFeedbackDocument,
      text,
    )

  const lowLevelLogger = (text: string) =>
    queueAnAppendToDocument(
      sessionContext.markdownLowLevelFeedbackDocument,
      text,
    )

  const logFilePath = (fileContext: FileContext) => {
    const path = fileContext.filePathRelativeToWorkspace
    // Assumes we are in .bread/sessions
    void highLevelLogger(`- [${path}](../../${path})\n`)
  }

  // Log files that we are submitting as context
  void highLevelLogger(`\n# Files submitted:\n`)
  for (const fileContext of fileContexts) {
    logFilePath(fileContext)
  }

  /* Provider pointer to low level log for debugging,
   * it wants a relative to workspace path for some reason The document path is
   * .bread/sessions/<id>-<weekday>.raw.md,
   * so we need to go up two levels since the markdown file we are outputing to
   * is in .bread/sessions as well Likely not windows friendly as it uses /
   */
  const relativePath = vscode.workspace.asRelativePath(
    sessionContext.markdownLowLevelFeedbackDocument.uri.path,
  )
  void highLevelLogger(
    `\n\n[Raw LLM input + response](../../${relativePath})\n`,
  )

  const [rawLlmResponseStream, abortController] = await streamLlm(
    messages,
    lowLevelLogger,
  )

  // Abort if requested
  sessionContext.sessionAbortedEventEmitter.event(() => abortController.abort())

  /* Design Shortcoming due to multi casting
     Parsing will be performed multiple times for the same payload,
     see openai.ts */
  const parsedPatchStream = from(rawLlmResponseStream).pipe(
    mapAsync(({ cumulativeResponse, delta }) => {
      /* Try parsing the xml, even if it's complete it should still be able to
         apply the diffs */
      return parsePartialMultiFileEdit(cumulativeResponse)
    }),
  )

  /* Split the stream into stream with plan and changes to apply
     Process in parallell
   * Currently has an issue where I am unable to log the delta and am forced to
   * wait until an item is fully generated Refactor:
   * Parsing should pass deltas or I need to implement local delta generation
   */
  async function showPlanAsItBecomesAvailable() {
    const planStream = parsedPatchStream.pipe(mapAsync((x) => x.task))
    let lastPlan = ''
    void highLevelLogger(`\n# Plan:\n`)
    for await (const plan of planStream) {
      const delta = plan.slice(lastPlan.length)
      void highLevelLogger(delta)
      lastPlan = plan
    }
  }

  async function startApplication() {
    const patchSteam = from(
      parsedPatchStream,
      makeToResolvedChangesTransformer(sessionContext.documentManager),
    )
    await startInteractiveMultiFileApplication(patchSteam, sessionContext)
  }

  await Promise.all([showPlanAsItBecomesAvailable(), startApplication()])
}
