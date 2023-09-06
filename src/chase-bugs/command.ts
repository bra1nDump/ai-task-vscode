import * as vscode from 'vscode'
import { startMultiFileEditing } from 'multi-file-edit/v1'
import { projectDiagnosticEntriesWithAffectedFileContext } from './diagnostics'
import { getBreadIdentifier } from 'helpers/bread-identifier'
import { closeSession, startSession } from 'execution/realtime-feedback'
import { queueAnAppendToDocument } from 'helpers/vscode'

/**
 * Gathered the problems in the code base
 * [Probably more accurate results] Inline comments with the diagnostic errors within the files
 *   (will mess up target range matching algorithm though)
 *   We can strip out those lines from the old chunks after they are returned
 * [Current approach] Alternatively we can use line ranges as the target range
 *   This we'll need refactoring to happen in the multi file edit module.
 *
 * We can use a special id for the bug fixes - @bread:compile-error
 * and strip them out before trying to find target range based on line content matching algorithm
 */
export async function chaseBugsCommand() {
  console.log('Bird watch is on the way for those pesky bugs')

  const sessionContext = await startSession()
  await queueAnAppendToDocument(
    sessionContext.markdownHighLevelFeedbackDocument,
    "- Bugs is being chased by professional birds your bugs don't not stand a chance\n",
  )

  const diagnosticsAlongWithTheirFileContexts =
    projectDiagnosticEntriesWithAffectedFileContext()

  // Construct a user message similar to the one in the bread command
  // This time include whole compilation errors
  const diagnosticsPromptParts = diagnosticsAlongWithTheirFileContexts.map(
    ({ uri, diagnostic }) => {
      const filePathRelativeToWorkspace = vscode.workspace.asRelativePath(uri)

      return `File: ${filePathRelativeToWorkspace}
Error message: ${diagnostic.message}
Range:
- Line start ${diagnostic.range.start.line}
- Line end ${diagnostic.range.end.line}
${
  diagnostic.relatedInformation
    ?.map((info) => `Related info: ${info.message}`)
    .join('\n') ?? ''
}
`
    },
  )

  const fileUrisWithProblems = diagnosticsAlongWithTheirFileContexts.map(
    (x) => x.uri,
  )
  await sessionContext.documentManager.addDocuments(
    'Files with problems',
    fileUrisWithProblems,
  )

  const breadIdentifier = getBreadIdentifier()
  await startMultiFileEditing(
    `Fix these problems: ${diagnosticsPromptParts.join('\n')}}`,
    breadIdentifier,
    sessionContext,
  )

  await queueAnAppendToDocument(
    sessionContext.markdownHighLevelFeedbackDocument,
    '> You snitching on your bugs was appreciated by the birds, pleasure doing business with you - Bird representative\n',
  )

  await closeSession(sessionContext)
}
