import * as vscode from 'vscode'
import {
  findAndCollectBreadMentionedFiles,
  findAndCollectDotBreadFiles,
  getFilesContent,
} from 'document-helpers/file-search'
import { openedTabs } from 'helpers/vscode'
import { SessionContext, getBreadIdentifier } from 'session'
import { queueAnAppendToDocument } from 'helpers/vscode'
import { closeSession, startSession } from 'session'
import { startMultiFileEditing } from 'multi-file-edit/v1'
import { projectDiagnosticEntriesWithAffectedFileContext } from 'helpers/diagnostics'
import dedent from 'dedent'

/**
 * Generates and applies diffs to files in the workspace containing @bread
 * mention.
 *
 * Collect all files in workspace with @bread mention
 * Pack the files along with the diff generation prompts
 * Call openai api (through langchain)
 * Parse the diffs
 * Apply them to the current file in place
 */
export async function completeInlineTasksCommand(this: {
  extensionContext: vscode.ExtensionContext
  sessionRegistry: Map<string, SessionContext>
}) {
  if (this.sessionRegistry.size !== 0) {
    console.log(`Existing session running, most likely a bug with @run + enter`)
    return
  }

  const sessionContext = await startSession(this.extensionContext)
  this.sessionRegistry.set(sessionContext.id, sessionContext)

  void queueAnAppendToDocument(
    sessionContext.markdownHighLevelFeedbackDocument,
    '> Running ai-task\n',
  )

  // Functionality specific to bread mentions
  const breadIdentifier = getBreadIdentifier()
  const fileUrisWithBreadMentions =
    await findAndCollectBreadMentionedFiles(breadIdentifier)
  if (fileUrisWithBreadMentions.length === 0) {
    void vscode.window.showErrorMessage(
      `No bread found, ai-task are getting hungry. Remember to add @${breadIdentifier} mention to at least one file in the workspace.`,
    )
    await closeSession(sessionContext)
    return
  }

  await sessionContext.documentManager.addDocuments(
    'Files with bread mentions',
    fileUrisWithBreadMentions,
  )

  /* .task files */
  const dotBreadFileUris = await findAndCollectDotBreadFiles(breadIdentifier)
  const breadFileBlobs = await getFilesContent(dotBreadFileUris)
  sessionContext.documentManager.addBlobContexts(breadFileBlobs)

  /* Before we have proper task expression parsing,
   * we will just search all task files for a mention of special
   * sub-expressions
   */
  const breadMentionsFilesContent = await getFilesContent(
    fileUrisWithBreadMentions,
  )

  /* Include open tabs if the user requested */
  const includeTabs = breadMentionsFilesContent.some((fileContent) =>
    fileContent.includes('@tabs'),
  )
  if (includeTabs) {
    const openTabsFileUris = openedTabs()
    await sessionContext.documentManager.addDocuments(
      'Open tabs',
      openTabsFileUris,
    )
  }

  /* Provide problems context
    /* Include files with errors if the user requested */
  const includeErrors = breadMentionsFilesContent.some((fileContent) =>
    fileContent.includes('@errors'),
  )
  if (includeErrors) {
    const diagnosticsAlongWithTheirFileContexts =
      projectDiagnosticEntriesWithAffectedFileContext()
    const fileUrisWithProblems = diagnosticsAlongWithTheirFileContexts.map(
      (x) => x.uri,
    )
    const filesWithErrors = diagnosticsAlongWithTheirFileContexts.map(
      (x) => x.uri,
    )
    await sessionContext.documentManager.addDocuments(
      'Files with errors',
      filesWithErrors,
    )

    /* Provide optional problem context + prompt
       Refactor: This should move to a static context provider */
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

      sessionContext.documentManager.addBlobContexts([compilationErrorContext])
    }
  }

  console.log('fileManager', sessionContext.documentManager.dumpState())

  await startMultiFileEditing(sessionContext)

  await queueAnAppendToDocument(
    sessionContext.markdownHighLevelFeedbackDocument,
    '\n\n> Done\n',
  )

  await closeSession(sessionContext)
  this.sessionRegistry.delete(sessionContext.id)
}
