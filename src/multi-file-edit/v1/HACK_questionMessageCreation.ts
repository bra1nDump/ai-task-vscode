import * as vscode from 'vscode'

import { FileContext } from 'context/types'
import { OpenAiMessage, streamLlm } from 'helpers/openai'

import { SessionContext } from 'session'

import { createQuestionAnsweringWithContext } from './HACK_questionAnsweringPrompt'

/**
 * Refactor: Largely duplicated from completeInlineTasks
 * Don't really know what a good abstraction is here
 */
export async function startQuestionAnsweringStreamWIthContext(
  sessionContext: SessionContext,
  messagesInput: OpenAiMessage[],
) {
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
    `\n\n[Raw LLM input + response](../../${relativePath}) [Debug]\n\n`,
  )

  return await streamLlm(
    messages,
    sessionContext.lowLevelLogger,
    sessionContext.userId,
    sessionContext.llmCredentials,
  )
}
