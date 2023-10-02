import * as vscode from 'vscode'
import { applyResolvedChangesWhileShowingTheEditor } from '../applyResolvedChange'
import { Change, LlmGeneratedPatchXmlV1 } from './types'
import { makeToResolvedChangesTransformer } from './resolveTargetRange'
import { SessionContextManager } from 'context/manager'
import { findSingleFileMatchingPartialPath } from 'helpers/fileSystem'
import { safeWorkspaceQueryAllFiles } from 'helpers/fileSystem'
import { startMultiFileEditing } from '.'

/**
 * This function is getting riduculous, I think its best to change testing
 * strategy to use end to end tests for changes across multiple features.
 *
 * End to end tests will run slow, we can solve this by using caching for llm
 * responses. Probably best done is a separate from openai.ts file with the
 * same interface. Maybe it would be a wrapper around openai.ts?
 * possiblyCachedOpenai.ts? Don't want prod control flow to be going through
 * this though.
 */
export async function resolveAndApplyChangesToSingleFile(
  changes: Change[],
  editor: vscode.TextEditor,
) {
  // I'm still prototyping line numbers so let's stick to falls for now
  const sessionDocumentManager = new SessionContextManager(false)
  await sessionDocumentManager.addDocuments('test', [editor.document.uri])

  const resolver = makeToResolvedChangesTransformer(sessionDocumentManager)
  const resolvedChanges = resolver({
    changes: changes.map((change) => ({
      change,
      isStreamFinilized: true,
      filePathRelativeToWorkspace: vscode.workspace.asRelativePath(
        editor.document.uri,
      ),
    })),
    terminalCommands: [],

    // Doesn't matter what we put here, plan is only for informational purposes
    task: '',
    isStreamFinalizedUnused: false,
  })

  return Promise.all(
    resolvedChanges.map(async (resolvedChange) => {
      if (resolvedChange.type === 'ResolvedExistingFileEditChange') {
        await applyResolvedChangesWhileShowingTheEditor(resolvedChange)
      }
    }),
  )
}

export async function resolveAndApplyChangesToMultipleFiles(
  patch: LlmGeneratedPatchXmlV1,
) {
  const allWorkspaceUris = await safeWorkspaceQueryAllFiles()
  const documentUris = patch.changes.map(
    (fileChange) =>
      findSingleFileMatchingPartialPath(
        allWorkspaceUris,
        fileChange.filePathRelativeToWorkspace,
      )!,
  )

  const sessionDocumentManager = new SessionContextManager(false)
  await sessionDocumentManager.addDocuments('test', documentUris)
  const resolvedChanges = makeToResolvedChangesTransformer(
    sessionDocumentManager,
  )(patch)

  /*
   * Need to apply serially to hold the application assumption that only a
   * single editor is open at the same time
   */
  for (const resolvedChange of resolvedChanges) {
    if (resolvedChange.type === 'ResolvedExistingFileEditChange') {
      await applyResolvedChangesWhileShowingTheEditor(resolvedChange)
    }
  }

  startMultiFileEditing
}

export const makeTemporaryFileWriterAndOpener = (temporaryFileName: string) => {
  const temporaryFileUri = vscode.Uri.joinPath(
    vscode.workspace.workspaceFolders![0].uri,
    temporaryFileName,
  )
  // Writes content to a temporary file and opens it in an editor
  return async (content: string) => {
    await vscode.workspace.fs.writeFile(
      temporaryFileUri,
      new TextEncoder().encode(content),
    )
    /*
     * TODO: This is a hack to make sure the file is saved to disk before we
     * read it
     */
    await new Promise((resolve) => setTimeout(resolve, 200))
    const document = await vscode.workspace.openTextDocument(temporaryFileUri)
    const editor = await vscode.window.showTextDocument(document)
    return editor
  }
}

export async function openExistingFile(relativeFilePath: string) {
  const fileUri = vscode.Uri.joinPath(
    vscode.workspace.workspaceFolders![0].uri,
    relativeFilePath,
  )
  const document = await vscode.workspace.openTextDocument(fileUri)
  const editor = await vscode.window.showTextDocument(document)
  return editor
}
