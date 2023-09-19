import * as vscode from 'vscode'
import {
  findAndCollectBreadMentionedFiles,
  findAndCollectDotBreadFiles,
} from 'document-helpers/file-search'
import { openedTabs } from 'helpers/vscode'
import { SessionContext, getBreadIdentifier } from 'session'
import { queueAnAppendToDocument } from 'helpers/vscode'
import { closeSession, startSession } from 'session'
import { startMultiFileEditing } from 'multi-file-edit/v1'
import { projectDiagnosticEntriesWithAffectedFileContext } from 'chase-bugs/diagnostics'

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
  sessionRegistry: Map<string, SessionContext>
}) {
  if (this.sessionRegistry.size !== 0) {
    console.log(`Existing session running, most likely a bug with @run + enter`)
    return
  }

  const sessionContext = await startSession()
  this.sessionRegistry.set(sessionContext.id, sessionContext)

  void queueAnAppendToDocument(
    sessionContext.markdownHighLevelFeedbackDocument,
    '> 🐦: Bread is being chased by professional crumbs elliminators\n',
  )

  // Functionality specific to bread mentions
  const breadIdentifier = getBreadIdentifier()
  const fileUrisWithBreadMentions =
    await findAndCollectBreadMentionedFiles(breadIdentifier)
  if (fileUrisWithBreadMentions.length === 0) {
    void vscode.window.showErrorMessage(
      `No bread found, birds are getting hungry. Remember to add @${breadIdentifier} mention to at least one file in the workspace.`,
    )
    await closeSession(sessionContext)
    return
  }

  await sessionContext.documentManager.addDocuments(
    'Files with bread mentions',
    fileUrisWithBreadMentions,
  )

  /* .bread files Ideally will want to signal to the document manager that this
   * file is not editable. As well as providing a way to extract these context
   * only files separately from the editable files (and blobs, we should
   * renamed document manager to be a generic context manager)
   */
  const dotBreadFileUris = await findAndCollectDotBreadFiles(breadIdentifier)
  const breadFileBlobs = await Promise.all(
    dotBreadFileUris.map(async (uri) => {
      const document = await vscode.workspace.openTextDocument(uri)
      return document.getText()
    }),
  )
  sessionContext.documentManager.addBlobContexts(breadFileBlobs)

  // Opened tabs
  const openTabsFileUris = openedTabs()

  await sessionContext.documentManager.addDocuments(
    'Open tabs',
    openTabsFileUris,
  )

  // Provide problems context
  const diagnosticsAlongWithTheirFileContexts =
    projectDiagnosticEntriesWithAffectedFileContext()
  const fileUrisWithProblems = diagnosticsAlongWithTheirFileContexts.map(
    (x) => x.uri,
  )
  await sessionContext.documentManager.addDocuments(
    'Files with problems',
    fileUrisWithProblems,
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
        `File: ${filePathRelativeToWorkspace}
  Error message: ${diagnostic.message}
  Range:
  - Line start ${diagnostic.range.start.line}
  - Line end ${diagnostic.range.end.line}
  ${
    diagnostic.relatedInformation
      ?.map((info) => `Related info: ${info.message}`)
      .join('\n') ?? ''
  }
  `,
      ]
    })
    .join('\n')

  if (problemContext.length !== 0) {
    const compilationErrorContext = `Here's a list of compilation errors in some of the files:
  ${problemContext}
  
  - Most likely this is due to a refactor user has started but not finished
  - Based on @${breadIdentifier} mentions and the errors you should guess what was the refactor in the first place
  - Collect all relevant information about the refactor that might help you fix the errors
  
  Addressing errors:
  - Often the location of the error is not the place that you want to make changes to
  - Make sure you're not masking the compile error, but rather making necessary changes to the logic of the program
  `

    sessionContext.documentManager.addBlobContexts([compilationErrorContext])
  }

  console.log('fileManager', sessionContext.documentManager.dumpState())

  await startMultiFileEditing(sessionContext)

  await queueAnAppendToDocument(
    sessionContext.markdownHighLevelFeedbackDocument,
    '\n\n> Your bread was appreciated by the birds, pleasure doing business with you - Bird representative\n',
  )

  await closeSession(sessionContext)
  this.sessionRegistry.delete(sessionContext.id)
}
