import * as vscode from 'vscode'
import { findAndCollectBreadedFiles } from 'document-helpers/file-context'
import { openedTabs } from 'helpers/vscode'
import { getBreadIdentifier } from 'helpers/bread-identifier'
import { queueAnAppendToDocument } from 'helpers/vscode'
import { closeSession, startSession } from 'session'
import { startMultiFileEditing } from 'multi-file-edit/v1'

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
    '> Bread is being chased by professional birds your bread does not stand the chance\n\n',
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

  // I imagine chasing bugs will be almost simply calling this code
  // The main issue is in enriching the files with comments, or line numbers
  // Actually passing the breaded identifier should be replaced with passing the entire task prompt
  // this is currently generated within this function.
  //
  // To begin with I can simply dump all the compilation errs into a separate file!
  // as well as update the prompt to not pay attention to breaded files but instead try to fix compilation errors
  await startMultiFileEditing(
    `Look for tasks and informational comments tagged with ${breadIdentifier} in your input files and generate changes to accomplish them.`,
    breadIdentifier,
    sessionContext,
  )

  await queueAnAppendToDocument(
    sessionContext.markdownHighLevelFeedbackDocument,
    '\n\n> Your bread was appreciated by the birds, pleasure doing business with you - Bird representative\n',
  )

  await closeSession(sessionContext)
}
