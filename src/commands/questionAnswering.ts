import * as vscode from 'vscode'
import { findAndCollectDotBreadFiles } from 'context/atTask'
import { getFilesContent } from 'helpers/fileSystem'
import { SessionContext, getBreadIdentifier } from 'session'
import { closeSession, startSession } from 'session'
import { projectDiagnosticEntriesWithAffectedFileContext } from 'context/atErrors'
import dedent from 'dedent'
import { openedTabs } from 'context/atTabs'
import { OpenAiMessage } from 'helpers/openai'
import { startQuestionAnsweringStreamWIthContext } from 'multi-file-edit/v1/HACK_questionMessageCreation'
import { explainErrorToUserAndOfferSolutions } from 'session/errorHandling'

//////////////////// THIS ENTIRE FILE IS A HACK - COPIED OVER FROM comleteInlineTasks ////////////////////

/**
 * This will now only get invoked from the notebook controller
 *
 * Generates and applies diffs to files in the workspace containing task
 * mention.
 *
 * Collect all files in workspace with task mention
 * Pack the files along with the diff generation prompts
 * Call openai api (through langchain)
 * Parse the diffs
 * Apply them to the current file in place
 */
export async function answerQuestionCommand(
  extensionContext: vscode.ExtensionContext,
  sessionRegistry: Map<string, SessionContext>,
  execution: vscode.NotebookCellExecution,
  previousMessages: OpenAiMessage[],
) {
  if (sessionRegistry.size !== 0) {
    console.log(`Existing session running, most likely a bug with @run + enter`)
    return
  }

  const sessionContext = await startSession(extensionContext, execution)
  sessionRegistry.set(sessionContext.id, sessionContext)

  const cleanupSession = async () => {
    await closeSession(sessionContext)
    sessionRegistry.delete(sessionContext.id)
  }

  /*
   * This works differently from the completeInlineTasksCommand because it
   * returns before we are done with the stream - it returns the stream
   * itself
   */
  const streamResult = await throwingQuestionAnswering(
    sessionContext,
    previousMessages,
  )

  if (streamResult.type === 'error') {
    await explainErrorToUserAndOfferSolutions(
      sessionContext,
      streamResult.error,
    )
    await cleanupSession()
    return
  }

  const [rawLlmResponseStream, abortController] = streamResult.value

  // Only aboard on user requested session termination
  sessionContext.sessionAbortedEventEmitter.event(() => {
    if (abortController.signal.aborted) {
      return
    }
    return abortController.abort()
  })

  for await (const answerString of rawLlmResponseStream) {
    switch (answerString.type) {
      case 'chunk':
        void sessionContext.highLevelLogger(answerString.delta)
        break
      case 'streamEndedAbonormally':
        void sessionContext.highLevelLogger(
          answerString.errorMessageForUser ?? 'Unknown error',
        )
        break
      case 'streamEndedNormally':
        break
    }
  }

  // For last output write
  await new Promise((resolve) => setTimeout(resolve, 100))

  await cleanupSession()
}

async function throwingQuestionAnswering(
  sessionContext: SessionContext,
  previousMessages: OpenAiMessage[],
) {
  // Only use most recent message to pull in context
  const mostRecentUserMessageText =
    previousMessages.filter(({ role }) => role === 'user').at(-1)?.content ?? ''

  ////// Compile the context, pull in task files and other context based on mentions //////
  const openTabsFileUris = openedTabs()

  /*
   * Only search for tasks in open tabs, we might want to keep the task
   * unaddressed for the time being, but don't want to errase it
   */
  const breadIdentifier = getBreadIdentifier()

  /* .task files */
  const dotBreadFileUris = await findAndCollectDotBreadFiles(breadIdentifier)
  const breadFileBlobs = await getFilesContent(dotBreadFileUris)
  sessionContext.contextManager.addBlobContexts(breadFileBlobs)

  /* Include open tabs if the user requested */
  const includeTabs = [...breadFileBlobs, mostRecentUserMessageText].some(
    (fileContent) => fileContent.includes('@' + 'tabs'),
  )
  if (includeTabs) {
    await sessionContext.contextManager.addDocuments(
      'Open tabs',
      openTabsFileUris,
    )
  }

  /*
   * Always include active text editor as the questions are likely to be
   * related to it
   */
  if (vscode.window.visibleTextEditors.length) {
    await sessionContext.contextManager.addDocuments(
      'Visible text editor',
      vscode.window.visibleTextEditors
        .filter(
          (editor) =>
            /*
             * Don't return files with .task in them,
             * they are probably a notebook
             */
            !editor.document.uri.path.includes('.task') &&
            /*
             * Things like terminal and output in debug console also show up as
             * visible editors. Ignore them
             */
            editor.document.uri.scheme === 'file',
        )
        .map((editor) => editor.document.uri),
    )
  }

  /*
   * Provide problems context
   * Include files with errors if the user requested
   */
  const includeErrors = [...breadFileBlobs, mostRecentUserMessageText].some(
    (fileContent) => fileContent.includes('@' + 'errors'),
  )
  if (includeErrors) {
    const diagnosticsAlongWithTheirFileContexts =
      projectDiagnosticEntriesWithAffectedFileContext()
    const filesWithErrors = diagnosticsAlongWithTheirFileContexts.map(
      (x) => x.uri,
    )
    await sessionContext.contextManager.addDocuments(
      'Files with errors',
      filesWithErrors,
    )

    /*
     * Provide optional problem context + prompt
     * Refactor: This should move to a static context provider
     */
    const problemContext = diagnosticsAlongWithTheirFileContexts
      .flatMap(({ uri, diagnostic }) => {
        if (diagnostic.severity !== vscode.DiagnosticSeverity.Error) {
          return []
        }
        const filePathRelativeToWorkspace = vscode.workspace.asRelativePath(uri)

        return [
          dedent(`
            File: ${filePathRelativeToWorkspace}
            Error message: ${diagnostic.message}
            Range:
            - Line start ${diagnostic.range.start.line}
            - Line end ${diagnostic.range.end.line}
            ${
              diagnostic.relatedInformation
                ?.map((info) => `Related info: ${info.message}`)
                .join('\n') ?? ''
            }
            `),
        ]
      })
      .join('\n')

    if (problemContext.length !== 0) {
      const compilationErrorContext = dedent(`
        Here's a list of compilation errors in some of the files:
        ${problemContext}

        - Most likely this is due to a refactor user has started but not finished
        - Based on @${breadIdentifier} mentions and the errors you should guess what was the refactor in the first place
        - Collect all relevant information about the refactor that might help you fix the errors

        Addressing errors:
        - Often the location of the error is not the place that you want to make changes to
        - Make sure you're not masking the compile error, but rather making necessary changes to the logic of the program
        `)

      sessionContext.contextManager.addBlobContexts([compilationErrorContext])
    }
  }

  console.log('fileManager', sessionContext.contextManager.dumpState())

  return await startQuestionAnsweringStreamWIthContext(
    sessionContext,
    previousMessages,
  )
}
