import { FileContext, fileContextSystemMessage } from 'helpers/file-context'
import { OpenAiMessage, streamLlm } from 'helpers/openai'
import { from } from 'ix/asynciterable'
import { map as mapAsync } from 'ix/asynciterable/operators'
import { startInteractiveMultiFileApplication } from 'multi-file-edit/applyResolvedChange'
import { parsePartialMultiFileEdit } from './parse'
import { mapToResolvedChanges } from './resolveTargetRange'
import { LlmGeneratedPatchXmlV1 } from './types'
import { multiFileEditV1FormatSystemMessage } from './prompt'
import { SessionContext } from 'execution/realtime-feedback'
import { queueAnAppendToDocument } from 'helpers/vscode'

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
You should first output a bullet list plan of action roughly describing each change you want to make. The format should be:
- Plan item one
- Item two

Next you should output changes as outlined by the format previously.
`,
  }
  const messages = [outputFormatMessage, fileContextMessage, userTaskMessage]

  const highLevelLogger = (text: string) =>
    queueAnAppendToDocument(
      sessionContext.sessionMarkdownHighLevelFeedbackDocument,
      text,
    )

  const lowLevelLogger = (text: string) =>
    queueAnAppendToDocument(
      sessionContext.sessionMarkdownLowLevelFeedbackDocument,
      text,
    )

  // Log files that we are submitting as context
  void highLevelLogger(`\n# Files submitted:\n`)
  for (const fileContext of fileContexts) {
    const path = fileContext.filePathRelativeToWorkspace
    void highLevelLogger(`- [${path}](${path})\n`)
  }

  const unresolvedChangeStream = await streamLlm<LlmGeneratedPatchXmlV1>(
    messages,
    parsePartialMultiFileEdit,
    lowLevelLogger,
  )

  // Split the stream into stream with plan and changes to apply
  // Process in parallell
  async function showPlanAsItBecomesAvailable() {
    const planStream = from(unresolvedChangeStream).pipe(
      mapAsync((x) => x.plan),
    )
    const loggedPlanItemIndexes = new Set<number>()
    void highLevelLogger(`\n# Plan:\n`)
    for await (const plan of planStream)
      for (const [index, item] of plan.entries())
        if (!loggedPlanItemIndexes.has(index)) {
          void highLevelLogger(`- ${item}\n`)
          loggedPlanItemIndexes.add(index)
        }
  }

  async function startApplication() {
    const patchSteam = from(unresolvedChangeStream, mapToResolvedChanges)
    await startInteractiveMultiFileApplication(patchSteam, sessionContext)
  }

  await Promise.all([showPlanAsItBecomesAvailable(), startApplication()])
}
