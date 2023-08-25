import * as vscode from 'vscode'

import { FileContext, fileContextSystemMessage } from 'helpers/file-context'
import { OpenAiMessage, streamLlm } from 'helpers/openai'
import { from } from 'ix/asynciterable'
import { startInteractiveMultiFileApplication } from 'multi-file-edit/applyResolvedChange'
import { parsePartialMultiFileEdit } from './parse'
import { mapToResolvedChanges } from './resolveTargetRange'
import { LlmGeneratedPatchXmlV1 } from './types'
import { multiFileEditV1FormatSystemMessage } from './prompt'

export async function startMultiFileEditing(
  fileContexts: FileContext[],
  taskPrompt: string,
  breadIdentifier: string,
  scriptOutputDocument: vscode.TextDocument,
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
  const unresolvedChangeStream = await streamLlm<LlmGeneratedPatchXmlV1>(
    messages,
    parsePartialMultiFileEdit,
  )
  const patchSteam = from(unresolvedChangeStream, mapToResolvedChanges)
  await startInteractiveMultiFileApplication(patchSteam, {
    // realtimeProgressFeedbackEditor:
    realtimeProgressFeedbackDocument: scriptOutputDocument,
  })
}
