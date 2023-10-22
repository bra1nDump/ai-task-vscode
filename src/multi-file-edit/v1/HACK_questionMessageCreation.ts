import * as vscode from 'vscode'

import { FileContext } from 'context/types'
import { OpenAiMessage, streamLlm } from 'helpers/openai'
import { from } from 'ix/asynciterable'

import { SessionContext } from 'session'

import { map as mapAsync } from 'ix/asynciterable/operators'
import { createQuestionAnsweringWithContext } from './HACK_questionAnsweringPrompt'

export async function startQuestionAnsweringStreamWIthContext(
  sessionContext: SessionContext,
  messagesInput: OpenAiMessage[],
) {
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

  const messages = createQuestionAnsweringWithContext(
    fileContexts,
    blobContexts,
    sessionContext.configuration,
  ).concat(messagesInput)

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

  const streamResult = await streamLlm(
    messages,
    sessionContext.lowLevelLogger,
    sessionContext,
  )
  if (streamResult.type === 'error') {
    void sessionContext.highLevelLogger(`\n\n${streamResult.error.message}\n`)
    sessionContext.sessionAbortedEventEmitter.fire()
    throw streamResult.error
  }

  const [rawLlmResponseStream, abortController] = streamResult.value

  // Abort if requested
  sessionContext.sessionAbortedEventEmitter.event(() => abortController.abort())

  /*
   * Design Shortcoming due to multi casting
   * Parsing will be performed multiple times for the same payload,
   * see openai.ts
   */
  const partialResultsStream = from(rawLlmResponseStream).pipe(
    mapAsync(({ cumulativeResponse, delta }) => {
      /*
       * Try parsing the xml, even if it's complete it should still be able to
       * apply the diffs
       */
      return cumulativeResponse
    }),
  )

  return partialResultsStream
}
