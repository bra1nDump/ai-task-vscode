import * as vscode from 'vscode'
import { parsePartialMultiFileEdit } from 'multi-file-edit/v1/parse'
import { LlmGeneratedPatchXmlV1 } from 'multi-file-edit/v1/types'
import { applyChanges } from 'multi-file-edit/v1/apply'
import { streamLlm } from 'helpers/openai'
import { findAndCollectBreadedFiles } from './context'
import { buildMultiFileEditingPrompt } from '../multi-file-edit/v1/prompt'
import { getBreadIdentifier } from 'helpers/breadIdentifier'

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

  const breadIdentifier = getBreadIdentifier()

  const fileContexts = await findAndCollectBreadedFiles(breadIdentifier)
  if (!fileContexts) {
    void vscode.window.showErrorMessage(
      'No bread found, birds are getting hungry. Remember to add @bread mention to at least one file in the workspace.',
    )
    return
  }

  const messages = buildMultiFileEditingPrompt(fileContexts, breadIdentifier)

  const patchSteam = streamLlm<LlmGeneratedPatchXmlV1>(
    messages,
    parsePartialMultiFileEdit,
  )
  let lastPatch: LlmGeneratedPatchXmlV1 | undefined

  // TODO: Keep a map of files that were already opened before so we don't open them again
  //   if they are closed means the user was not interested in them
  for await (const patch of patchSteam) {
    //
    // Show the user the file we will be applying the patch later on so they can start reading
    for (const fileChange of patch.fileChanges) {
      if (!fileChange.filePathRelativeToWorkspace) {
        // Don't know the path yet, skip
        continue
      }

      const workspaceFilesWithMatchingNames = await vscode.workspace.findFiles(
        `**/${fileChange.filePathRelativeToWorkspace}`,
      )
      if (workspaceFilesWithMatchingNames.length !== 1) {
        // Still streaming the path most likely, not enough path was printed to match a single file
        continue
      }

      const fileUri = workspaceFilesWithMatchingNames[0]
      const _document = await vscode.workspace.openTextDocument(fileUri)

      // We might not want to show it
      // If the file is already open, we don't want to show it as this will disrupt the user
      // + we would constantly be switching between files as we run through this loop

      // Check if the file is already open, hmm tabs don't actually have editor references. I think these are inactive - which makes sense
      // vscode.window.tabGroups.all.find((tabGroup) => {
      //   tabGroup.tabs.find((tab) => {
      //     if (tab.) {
      // await vscode.window.showTextDocument(document)
    }

    lastPatch = patch
  }

  if (!lastPatch) {
    console.error('No patch generated, nothing to apply')
    return
  }

  // Actually apply the patch
  for (const singleFileChange of lastPatch.fileChanges) {
    if (!singleFileChange.filePathRelativeToWorkspace) {
      // Don't know the path yet, skip
      continue
    }

    const workspaceFilesWithMatchingNames = await vscode.workspace.findFiles(
      `**/${singleFileChange.filePathRelativeToWorkspace}`,
    )
    if (workspaceFilesWithMatchingNames.length !== 1) {
      // We should know the path by now, if we don't - something is wrong
      console.error(
        `Could not find file with path ${singleFileChange.filePathRelativeToWorkspace}`,
      )
      continue
    }

    const fileUri = workspaceFilesWithMatchingNames[0]
    const document = await vscode.workspace.openTextDocument(fileUri)
    const editor = await vscode.window.showTextDocument(document)
    const fileContentWithDiffApplied = await applyChanges(
      singleFileChange.changes,
      editor,
    )

    console.log(
      `Diff application results: ${fileContentWithDiffApplied
        .map((x) => x.result)
        .join('\n')}`,
    )

    // Delay so the user has a chance to see the changes and continue to the next file
    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }

  console.log('Birds released, your bread is gone')
}
