import { FileContext, fileContextSystemMessage } from 'helpers/file-context'
import { OpenAiMessage, streamLlm } from 'helpers/openai'
import { from } from 'ix/asynciterable'
import { startInteractiveMultiFileApplication } from 'multi-file-edit/applyResolvedChange'
import { parsePartialMultiFileEdit } from './parse'
import { mapToResolvedChanges } from './resolveTargetRange'
import { LlmGeneratedPatchXmlV1 } from './types'
import { multiFileEditV1FormatSystemMessage } from './prompt'
import { SessionContext } from 'execution/realtime-feedback'
import { appendToDocument } from 'helpers/vscode'

export async function startMultiFileEditing(
  fileContexts: FileContext[],
  taskPrompt: string,
  breadIdentifier: string,
  sessionContext: SessionContext,
) {
  const outputFormatMessage =
    multiFileEditV1FormatSystemMessage(breadIdentifier)
  const fileContextMessage = fileContextSystemMessage(fileContexts)
  const userTaskMessage: OpenAiMessage = {
    role: 'user',
    content: `Your task: ${taskPrompt}
You should first output a bullet list plan of action roughly describing each change you want to make. Use - to start a bullet point.
Next you should output changes as outlined by the format previously.
`,
  }
  const messages = [outputFormatMessage, fileContextMessage, userTaskMessage]

  async function logger(text: string) {
    await appendToDocument(
      sessionContext.sessionMarkdownLowLevelFeedbackDocument,
      text,
    )
  }

  const unresolvedChangeStream = await streamLlm<LlmGeneratedPatchXmlV1>(
    messages,
    parsePartialMultiFileEdit,
    logger,
  )
  const patchSteam = from(unresolvedChangeStream, mapToResolvedChanges)
  await startInteractiveMultiFileApplication(patchSteam, sessionContext)
}
