import { startMultiFileEditing } from 'multi-file-edit/v1'
import { projectDiagnosticEntriesWithAffectedFileContext } from './diagnostics'
import { getBreadIdentifier } from 'helpers/bread-identifier'
import { showRealtimeFeedbackEditor } from 'execution/realtime-feedback'
import { appendToDocument } from 'helpers/vscode'

/**
 * Gathered the problems in the code base
 * Inline comments with the diagnostic errors within the files
 *   (will mess up target range matching algorithm though)
 *   We can strip out those lines from the old chunks after they are returned
 * Alternatively we can use line ranges as the target range
 *   This we'll need refactoring to happen in the multi file edit module.
 *
 * We can use a special id for the bug fixes - @bread:compile-error
 * and strip them out before trying to find target range based on line content matching algorithm
 */
export async function chaseBugsCommand() {
  console.log('Bird watch is on the way for those pesky bugs')

  const scriptOutputDocument = await showRealtimeFeedbackEditor()
  await appendToDocument(
    scriptOutputDocument,
    '- Bread is being chased by professional birds your bread does not stand the chance\n',
  )

  const diagnosticsAlongWithTheirFileContexts =
    await projectDiagnosticEntriesWithAffectedFileContext()

  // Construct a user message similar to the one in the bread command
  // This time include whole compilation errors
  const diagnosticsPromptParts = diagnosticsAlongWithTheirFileContexts.map(
    ({ fileContext, diagnostic }) => {
      const { filePathRelativeToWorkspace } = fileContext

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

  const filesWithProblems = diagnosticsAlongWithTheirFileContexts.map(
    ({ fileContext }) => fileContext,
  )

  const breadIdentifier = getBreadIdentifier()
  await startMultiFileEditing(
    filesWithProblems,
    `Look for tasks and informational comments tagged with ${breadIdentifier} in your input files and generate changes to accomplish them.`,
    breadIdentifier,
    scriptOutputDocument,
  )

  console.log('Birds released, your bread is gone')
}

// Alternatively simply add another virtual file containing errors
// async function getFilesWithErrorsInlined(
//   shouldInlineErrorsAsComments: boolean,
// ): Promise<FileContext[]> {
//   const bugsWithContext = await getDiagnosticEntriesWithFileContext()
//   console.log('bugsWithContext', bugsWithContext)

//   // Adjust file contents to add inline comments with the diagnostic errors
//   const fileContexts: FileContext[] = bugsWithContext.map((bugWithContext) => {
//     const {
//       fileUri,
//       fileContent,
//       diagnostic,
//       diagnosticLocation: location,
//     } = bugWithContext

//     // Let's add the diagnostics as a comment on the line where the diagnostic applies
//     // And lets modify the prompt to suggest stripping it out from the final output
//     const augmentedWithProblemCommentsFileContent = fileContent

//     return {
//       content: augmentedWithProblemCommentsFileContent,
//       filePathRelativeTooWorkspace: vscode.workspace.asRelativePath(fileUri),
//     }
//   })
//   return fileContexts
// }
