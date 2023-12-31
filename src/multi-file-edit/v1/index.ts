import * as vscode from 'vscode'

import { FileContext } from 'context/types'
import { makeOpenAiInstance, streamLlm } from 'helpers/openai'
import { from, last } from 'ix/asynciterable'

import { startInteractiveMultiFileApplication } from 'multi-file-edit/applyResolvedChange'
import { parsePartialMultiFileEdit } from './parse'
import { makeToResolvedChangesTransformer } from './resolveTargetRange'
import { SessionContext } from 'session'

import { flatMap, map as mapAsync } from 'ix/asynciterable/operators'
import { createMultiFileEditingMessages } from './prompt'
import { explainErrorToUserAndOfferSolutions } from 'session/errorHandling'

export async function startMultiFileEditing(sessionContext: SessionContext) {
  /*
   * WARNING - dependin on plaform line separators might be different!!!
   * \n, on windows we want to convert to that at some point??
   *
   * Figure out how to write some tests to trigger the current bugs more
   * locally?
   * Tests for context manager to make sure it normalizes line endings
   * Tests for find ranges
   */
  const fileContexts = sessionContext.contextManager.getEditableFileContexts()
  const blobContexts = sessionContext.contextManager.getBlobContexts()

  const messages = createMultiFileEditingMessages(
    fileContexts,
    blobContexts,
    sessionContext.configuration,
  )

  const logFilePath = (fileContext: FileContext) => {
    const path = fileContext.filePathRelativeToWorkspace
    // Assumes we are in .task/sessions
    void sessionContext.highLevelLogger(`- [${path}](../../${path})\n`)
  }

  // Log files that we are submitting as context
  void sessionContext.highLevelLogger(`\n### Files submitted:\n`)
  for (const fileContext of fileContexts) {
    logFilePath(fileContext)
  }

  /*
   * Provider pointer to low level log for debugging,
   * it wants a relative to workspace path for some reason The document path is
   * .task/sessions/<id>-<weekday>.raw.md,
   * so we need to go up two levels since the markdown file we are outputing to
   * is in .task/sessions as well Likely not windows friendly as it uses /
   */
  const relativePath = vscode.workspace.asRelativePath(
    sessionContext.markdownLowLevelFeedbackDocument.uri.path,
  )
  void sessionContext.highLevelLogger(
    `\n\n[Raw LLM input + response](../../${relativePath}) [Debug]\n`,
  )

  const openai = makeOpenAiInstance(
    sessionContext.llmCredentials,
    sessionContext.userId,
  )

  const streamResult = await streamLlm(
    messages,
    sessionContext.lowLevelLogger,
    sessionContext.userId,
    openai,
  )
  if (streamResult.type === 'error') {
    await explainErrorToUserAndOfferSolutions(
      sessionContext,
      streamResult.error,
    )
    return
  }

  const [rawLlmResponseStream, abortController] = streamResult.value

  // Abort if
  sessionContext.sessionAbortedEventEmitter.event(() => abortController.abort())

  /*
   * Design Shortcoming due to multi casting
   * Parsing will be performed multiple times for the same payload,
   * see openai.ts
   */
  const parsedPatchStream = from(rawLlmResponseStream).pipe(
    flatMap((item) => {
      if (item.type === 'chunk') {
        /*
         * Try parsing the xml, even if it's complete it should still be able to
         * apply the diffs
         */
        return [parsePartialMultiFileEdit(item.cumulativeResponse)]
      } else {
        return []
      }
    }),
  )

  /*
   * Split the stream into stream with plan and changes to apply
   * Process in parallell
   * Currently has an issue where I am unable to log the delta and am forced to
   * wait until an item is fully generated
   * Refactor: Parsing should pass deltas because it is used all over the place
   */
  async function showPlanAsItBecomesAvailable() {
    const planStream = parsedPatchStream.pipe(mapAsync((x) => x.task))
    let lastPlan = ''
    void sessionContext.highLevelLogger(`\n### Task:\n`)
    for await (const plan of planStream) {
      const delta = plan.slice(lastPlan.length)
      void sessionContext.highLevelLogger(delta)
      lastPlan = plan
    }
  }

  async function startApplication() {
    const patchSteam = from(
      parsedPatchStream,
      makeToResolvedChangesTransformer(sessionContext.contextManager),
    )
    void last(patchSteam).then((value) => {
      console.log(JSON.stringify(value, null, 2))
    })
    await startInteractiveMultiFileApplication(patchSteam, sessionContext)
  }

  await Promise.all([showPlanAsItBecomesAvailable(), startApplication()])
}
