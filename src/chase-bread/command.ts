import * as vscode from 'vscode'
import { findAndCollectBreadedFiles } from 'document-helpers/file-context'
import { openedTabs } from 'helpers/vscode'
import { getBreadIdentifier } from 'helpers/bread-identifier'
import { queueAnAppendToDocument } from 'helpers/vscode'
import { closeSession, startSession } from 'session'
import { startMultiFileEditing } from 'multi-file-edit/v1'
import { projectDiagnosticEntriesWithAffectedFileContext } from 'chase-bugs/diagnostics'

/**
 * Generates and applies diffs to files in the workspace containing @bread mention.
 *
 * Collect all files in workspace with @bread mention
 * Pack the files along with the diff generation prompts
 * Call openai api (through langchain)
 * Parse the diffs
 * Apply them to the current file in place
 */
export async function chaseBreadCommand() {
  const sessionContext = await startSession()
  void queueAnAppendToDocument(
    sessionContext.markdownHighLevelFeedbackDocument,
    '> 🐦: Bread is being chased by professional crumbs elliminators\n',
  )

  // Functionality specific to bread mentions
  const breadIdentifier = getBreadIdentifier()
  const breadFileUris = await findAndCollectBreadedFiles(breadIdentifier)
  if (!breadFileUris) {
    void vscode.window.showErrorMessage(
      'No bread found, birds are getting hungry. Remember to add @bread mention to at least one file in the workspace.',
    )
    return
  }

  await sessionContext.documentManager.addDocuments(
    'Bread files',
    breadFileUris,
  )

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

  console.log('fileManager', sessionContext.documentManager.dumpState())

  // Provide optional problem context + prompt
  const problemContext = diagnosticsAlongWithTheirFileContexts
    .flatMap(({ uri, diagnostic }) => {
      if (diagnostic.severity !== vscode.DiagnosticSeverity.Error) return []
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

  const compilationErrorContextAndPrompt =
    problemContext.length === 0
      ? undefined
      : `Here's a list of compilation errors in some of the files:
${problemContext}

Most likely this is due to a refactor user has started but not finished.
Based on @${breadIdentifier} mentions, and the errors you should first infer what was the refactor in the first place.
Collect all relevant information about the refactor that might help you fix the errors.
Keep in mind oftentimes the location of the error is not the place that you want to make changes to, but rather it is a hint another part of the code needs changing to accommodate the refactor.
`

  await startMultiFileEditing(
    `${
      compilationErrorContextAndPrompt ?? ''
    }Your task is spread out across multiple files and usually tagged with @${breadIdentifier}. First collect all of the information relevant to the tasks. It can be anywhere within the files. Output your understanding of the task to be accomplished as part of your thoughts. It's essential you understand the task and any suggestions the user gives you about how to accomplish the task`,
    breadIdentifier,
    sessionContext,
  )

  await queueAnAppendToDocument(
    sessionContext.markdownHighLevelFeedbackDocument,
    '\n\n> Your bread was appreciated by the birds, pleasure doing business with you - Bird representative\n',
  )

  await closeSession(sessionContext)
}
