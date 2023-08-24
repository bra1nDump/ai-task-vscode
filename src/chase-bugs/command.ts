import { buildMultiFileEditingPrompt } from 'multi-file-edit/v1/prompt'
import { getDiagnosticEntriesWithFileContext } from './context'
import { getBreadIdentifier } from 'helpers/bread-identifier'
import { FileContext } from 'chase-bread/command'

import * as vscode from 'vscode'
import { streamLlm } from 'helpers/openai'
import { mapToResolvedChanges } from 'multi-file-edit/v1/resolveTargetRange'
import { parsePartialMultiFileEdit } from 'multi-file-edit/v1/parse'
import { LlmGeneratedPatchXmlV1 } from 'multi-file-edit/v1/types'
import { from } from 'ix/asynciterable'
import { continuoulyApplyPatchStream } from 'multi-file-edit/applyResolvedChange'

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

  const bugsWithContext = await getDiagnosticEntriesWithFileContext()
  console.log('bugsWithContext', bugsWithContext)

  // Adjust file contents to add inline comments with the diagnostic errors
  const fileContexts: FileContext[] = bugsWithContext.map((bugWithContext) => {
    const {
      fileUri,
      fileContent,
      diagnostic,
      diagnosticLocation: location,
    } = bugWithContext

    // Let's add the diagnostics as a comment on the line where the diagnostic applies
    // And lets modify the prompt to suggest stripping it out from the final output
    const augmentedWithProblemCommentsFileContent = fileContent

    return {
      content: augmentedWithProblemCommentsFileContent,
      filePathRelativeTooWorkspace: vscode.workspace.asRelativePath(fileUri),
    }
  })

  const messages = buildMultiFileEditingPrompt(
    fileContexts,
    getBreadIdentifier(),
  )

  const unresolvedChangeStream = await streamLlm<LlmGeneratedPatchXmlV1>(
    messages,
    parsePartialMultiFileEdit,
  )
  const resolvedChangeStream = from(
    unresolvedChangeStream,
    mapToResolvedChanges,
  )

  await continuoulyApplyPatchStream(resolvedChangeStream)

  console.log('Birds released, your bread is gone')
}
