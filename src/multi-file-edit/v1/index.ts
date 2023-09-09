import * as vscode from 'vscode'

import {
  FileContext,
  fileContextSystemMessage,
} from 'document-helpers/file-context'
import { OpenAiMessage, streamLlm } from 'helpers/openai'
import { from } from 'ix/asynciterable'

import { startInteractiveMultiFileApplication } from 'multi-file-edit/applyResolvedChange'
import { parsePartialMultiFileEdit } from './parse'
import { makeToResolvedChangesTransformer } from './resolveTargetRange'
import { multiFileEditV1FormatSystemMessage } from './prompt'
import { SessionContext } from 'session'
import { queueAnAppendToDocument } from 'helpers/vscode'

import { map as mapAsync } from 'ix/asynciterable/operators'

export async function startMultiFileEditing(
  taskPrompt: string,
  breadIdentifier: string,
  sessionContext: SessionContext,
) {
  const outputFormatMessage =
    multiFileEditV1FormatSystemMessage(breadIdentifier)

  const fileContexts = sessionContext.documentManager.getFileContexts()
  const fileContextMessage = fileContextSystemMessage(fileContexts)

  const userTaskMessage: OpenAiMessage = {
    role: 'user',
    content: `Your task: ${taskPrompt}
You should first output a bullet list plan of action roughly describing each change you want to make. The format should be:
- Plan item one
- Item two

Next you should output changes if nessesary as outlined by the format previously.
`,
  }
  const messages = [outputFormatMessage, fileContextMessage, userTaskMessage]

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
  for (const fileContext of fileContexts) logFilePath(fileContext)

  // Provider pointer to low level log for debugging, it wants a relative to workspace path for some reason
  // The document path is .bread/sessions/<id>-<weekday>.raw.md, so we need to go up two levels since the
  // markdown file we are outputing to is in .bread/sessions as well
  // Likely not windows friendly as it uses /
  const relativePath = vscode.workspace.asRelativePath(
    sessionContext.markdownLowLevelFeedbackDocument.uri.path,
  )
  void highLevelLogger(`## [Raw LLM input + response](../../${relativePath})\n`)

  const [rawLlmResponseStream, abortController] = await streamLlm(
    messages,
    lowLevelLogger,
  )

  // Abort if requested
  sessionContext.sessionAbortedEventEmitter.event(() => abortController.abort())

  // Design Shortcoming due to multi casting
  // Parsing will be performed multiple times for the same payload, see openai.ts
  const parsedPatchStream = from(rawLlmResponseStream).pipe(
    mapAsync(({ cumulativeResponse, delta }) => {
      // Try parsing the xml, even if it's complete it should still be able to apply the diffs
      return parsePartialMultiFileEdit(cumulativeResponse)
    }),
  )

  // Split the stream into stream with plan and changes to apply
  // Process in parallell
  // Currently has an issue where I am unable to log the delta and am forced to wait until an item is fully generated
  // Refactor: Parsing should pass deltas or I need to implement local delta generation
  async function showPlanAsItBecomesAvailable() {
    const planStream = parsedPatchStream.pipe(mapAsync((x) => x.plan))
    const loggedPlanIndexWithSuffix = new Set<string>()
    void highLevelLogger(`\n# Plan:\n`)
    for await (const plan of planStream)
      for (const [index, item] of plan.entries()) {
        // Find the last suffix that was logged
        const latestVersion = `${index}: ${item}`
        const lastLoggedVersion = [...loggedPlanIndexWithSuffix]
          .filter((x) => x.startsWith(`${index}:`))
          .sort((a, b) => b.length - a.length)[0]
        // Only logged the delta or the first version including the item separator
        if (lastLoggedVersion) {
          const delta = latestVersion.slice(lastLoggedVersion.length)
          void highLevelLogger(delta)
        } else void highLevelLogger(`\n- ${item}`)

        loggedPlanIndexWithSuffix.add(latestVersion)
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
