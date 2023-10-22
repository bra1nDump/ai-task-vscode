import * as vscode from 'vscode'
import {
  findAndCollectBreadMentionedFiles,
  findAndCollectDotBreadFiles,
} from 'context/atTask'
import { getFilesContent } from 'helpers/fileSystem'
import { SessionContext, getBreadIdentifier } from 'session'
import { closeSession, startSession } from 'session'
import { startMultiFileEditing } from 'multi-file-edit/v1'
import { projectDiagnosticEntriesWithAffectedFileContext } from 'context/atErrors'
import dedent from 'dedent'
import { openedTabs } from 'context/atTabs'

/**
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
export async function completeInlineTasksCommand(
  extensionContext: vscode.ExtensionContext,
  sessionRegistry: Map<string, SessionContext>,
) {
  if (sessionRegistry.size !== 0) {
    console.log(`Existing session running, most likely a bug with @run + enter`)
    return
  }

  const sessionContext = await startSession(extensionContext)
  sessionRegistry.set(sessionContext.id, sessionContext)

  try {
    await throwingCompleteInlineTasksCommand(sessionContext)
  } catch (error) {
    console.error(error)
    if (error instanceof Error) {
      await sessionContext.highLevelLogger(`\n\n> Error: ${error.message}`)
    }
  } finally {
    await sessionContext.highLevelLogger('\n\n> Done\n')

    await closeSession(sessionContext)
    sessionRegistry.delete(sessionContext.id)
  }
}

async function throwingCompleteInlineTasksCommand(
  sessionContext: SessionContext,
) {
  void sessionContext.highLevelLogger('> Running ai-task\n')
  void sessionContext.highLevelLogger(
    '\n[Join Discord to submit feedback](https://discord.gg/D8V6Rc63wQ)\n',
  )

  ////// Compile the context, pull in task files and other context based on mentions //////
  const openTabsFileUris = openedTabs()

  /*
   * Only search for tasks in open tabs, we might want to keep the task
   * unaddressed for the time being, but don't want to errase it
   */
  const breadIdentifier = getBreadIdentifier()
  const fileUrisWithBreadMentions = await findAndCollectBreadMentionedFiles(
    breadIdentifier,
    openTabsFileUris,
  )

  /*
   * Its okay to not have any task mentions - for instance for other extension
   * adding to the context
   */
  if (fileUrisWithBreadMentions.length === 0) {
    void vscode.window.showErrorMessage(
      `No tasks found. Remember to add 
@${breadIdentifier} mention to at least one file in the workspace.`,
    )
    await closeSession(sessionContext)
    return
  }

  await sessionContext.contextManager.addDocuments(
    'Files with bread mentions',
    fileUrisWithBreadMentions,
  )

  /* .task files */
  const dotBreadFileUris = await findAndCollectDotBreadFiles(breadIdentifier)
  const breadFileBlobs = await getFilesContent(dotBreadFileUris)
  sessionContext.contextManager.addBlobContexts(breadFileBlobs)

  /*
   * Before we have proper task expression parsing,
   * we will just search all task files for a mention of special
   * sub-expressions
   */
  const breadMentionsFilesContent = await getFilesContent(
    fileUrisWithBreadMentions,
  )

  /* Include open tabs if the user requested */
  const includeTabs = [...breadMentionsFilesContent, ...breadFileBlobs].some(
    (fileContent) => fileContent.includes('@' + 'tabs'),
  )
  if (includeTabs) {
    await sessionContext.contextManager.addDocuments(
      'Open tabs',
      openTabsFileUris,
    )
  }

  /*
   * Provide problems context
   * Include files with errors if the user requested
   */
  const includeErrors = [...breadMentionsFilesContent, ...breadFileBlobs].some(
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

  await startMultiFileEditing(sessionContext)
}
