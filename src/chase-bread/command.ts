import * as vscode from 'vscode'
import { parsePartialMultiFileEdit } from 'multi-file-edit/v1/parse'
import { LlmGeneratedPatchXmlV1 } from 'multi-file-edit/v1/types'
import { streamLlm } from 'helpers/openai'
import { findAndCollectBreadedFiles } from './context'
import { buildMultiFileEditingPrompt } from '../multi-file-edit/v1/prompt'
import { getBreadIdentifier } from 'helpers/bread-identifier'
import { continuoulyApplyPatchStream } from 'multi-file-edit/applyResolvedChange'
import { from } from 'ix/asynciterable'
import { mapToResolvedChanges } from 'multi-file-edit/v1/resolveTargetRange'

export interface FileContext {
  filePathRelativeTooWorkspace: string
  content: string
}

/**
 * Generates and applies diffs to files in the workspace containing @bread mention.
 *
 *
 * Collect all files in workspace with @bread mention
 * Pack the files along with the diff generation prompts
 * Call openai api (through langchain)
 * Parse the diffs
 * Apply them to the current file in place
 */
export async function chaseBreadCommand() {
  console.log('Releasing the birds, your bread stands no chance')

  // We don't want the content on disk to be stale for the currently opened editors
  // because this is where we're reading the context from
  // Hack :( first of the day lol
  // More details in @mapToResolvedChanges
  // Does not actually save all the editors.
  // See extension.ts for beginning of work towards fixing this
  for (const editor of vscode.window.visibleTextEditors) {
    // This will prompt the user if the editor is not currently backed by a file
    const success = await editor.document.save()
    console.log(success)
  }

  const breadIdentifier = getBreadIdentifier()

  const fileContexts = await findAndCollectBreadedFiles(breadIdentifier)
  if (!fileContexts) {
    void vscode.window.showErrorMessage(
      'No bread found, birds are getting hungry. Remember to add @bread mention to at least one file in the workspace.',
    )
    return
  }

  const messages = buildMultiFileEditingPrompt(fileContexts, breadIdentifier)

  const unresolvedChangeStream = await streamLlm<LlmGeneratedPatchXmlV1>(
    messages,
    parsePartialMultiFileEdit,
  )
  const patchSteam = from(unresolvedChangeStream, mapToResolvedChanges)

  await continuoulyApplyPatchStream(patchSteam)

  console.log('Birds released, your bread is gone')
}
