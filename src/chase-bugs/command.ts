import * as vscode from 'vscode'
import { projectDiagnosticEntriesWithAffectedFileContext } from './diagnostics'
import { closeSession, startSession } from 'session'
import { openedTabs, queueAnAppendToDocument } from 'helpers/vscode'
import { startMultiFileEditing } from 'multi-file-edit/v1'
import { getBreadIdentifier } from 'helpers/bread-identifier'
import { findAndCollectBreadedFiles } from 'document-helpers/file-context'

/**
 * Gathered the problems in the code base
 * [Probably more accurate results] Inline comments with the diagnostic errors
 * within the files
 *   (will mess up target range matching algorithm though)
 *   We can strip out those lines from the old chunks after they are returned
 * [Current approach] Alternatively we can use line ranges as the target range
 *   This we'll need refactoring to happen in the multi file edit module.
 *
 * We can use a special id for the bug fixes - @bread:compile-error
 * and strip them out before trying to find target range based on line content
 * matching algorithm
 *
 * WARNING: I have decided to deprecate the command for the time being, because
 * I also want to use guidance from bread mentions one fixing these compile
 * errors and the command is mostly duplicative of the bread command
 *
 * Removed from the package.json
 * {
 *   "command": "birds.chaseBugs",
 *   "title": "Code Birds: Chase files with problems and fix them"
 * }
 */
export async function chaseBugsCommand() {
  console.log('Bird watch is on the way for those pesky bugs')

  const breadIdentifier = getBreadIdentifier()
  const sessionContext = await startSession()
  await queueAnAppendToDocument(
    sessionContext.markdownHighLevelFeedbackDocument,
    '> 🐦: Your bugs are being chased by the best in the flock\n',
  )

  const diagnosticsAlongWithTheirFileContexts =
    projectDiagnosticEntriesWithAffectedFileContext()

  /* Construct a user message similar to the one in the bread command
     This time include whole compilation errors */
  const diagnosticsPromptParts = diagnosticsAlongWithTheirFileContexts.flatMap(
    ({ uri, diagnostic }) => {
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
    },
  )

  const fileUrisWithProblems = diagnosticsAlongWithTheirFileContexts.map(
    (x) => x.uri,
  )
  await sessionContext.documentManager.addDocuments(
    'Files with problems',
    fileUrisWithProblems,
  )

  /* We also want to add all files with bread + all open tabs (copied over from
     chase bread command) */
  const breadFileUris = await findAndCollectBreadedFiles(breadIdentifier)
  await sessionContext.documentManager.addDocuments(
    'Bread files',
    breadFileUris ?? [],
  )

  const openTabsFileUris = openedTabs()

  await sessionContext.documentManager.addDocuments(
    'Open tabs',
    openTabsFileUris,
  )

  console.log('diagnosticsPromptParts', diagnosticsPromptParts)
  console.log('fileUrisWithProblems', fileUrisWithProblems)
  console.log('fileManager', sessionContext.documentManager.dumpState())

  /* Let's create a new context provider similar to document manager to provide
   * the diagnostic errors I don't really like mixing in the errors and the
   * user task itself. I will also need a separate system message to show
   * things like other non editable context files (.md) as well as webpage
   * content and terminal outputs
   */
  await startMultiFileEditing(
    `Here's a list of compilation errors:
${diagnosticsPromptParts.join('\n')}


`,
    breadIdentifier,
    sessionContext,
  )

  await queueAnAppendToDocument(
    sessionContext.markdownHighLevelFeedbackDocument,
    '\n> You snitching on your bugs was appreciated by the birds, pleasure doing business with you - Bird representative\n',
  )

  await closeSession(sessionContext)
}
