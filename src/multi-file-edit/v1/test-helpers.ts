import * as vscode from 'vscode'
import { applyResolvedChangesWhileShowingTheEditor } from '../applyResolvedChange'
import { Change, LlmGeneratedPatchXmlV1 } from './types'
import { makeToResolvedChangesTransformer } from './resolveTargetRange'
import { SessionDocumentManager } from 'document-helpers/document-manager'
import { findSingleFileMatchingPartialPath } from 'helpers/vscode'

export async function resolveAndApplyChangesToSingleFile(
  changes: Change[],
  editor: vscode.TextEditor,
) {
  const sessionDocumentManager = new SessionDocumentManager()
  await sessionDocumentManager.addDocuments('test', [editor.document.uri])

  const resolver = makeToResolvedChangesTransformer(sessionDocumentManager)
  const resolvedChanges = await resolver({
    changes: changes.map((change) => ({
      change,
      isStreamFinilized: true,
      filePathRelativeToWorkspace: vscode.workspace.asRelativePath(
        editor.document.uri,
      ),
    })),

    // Doesn't matter what we put here, plan is only for informational purposes
    plan: [],
    isStreamFinalizedUnused: false,
  })

  return Promise.all(
    resolvedChanges.map(async (resolvedChange) => {
      return await applyResolvedChangesWhileShowingTheEditor(resolvedChange)
    }),
  )
}

export async function resolveAndApplyChangesToMultipleFiles(
  patch: LlmGeneratedPatchXmlV1,
) {
  const documentUris = await Promise.all(
    patch.changes.map((fileChange) =>
      findSingleFileMatchingPartialPath(
        fileChange.filePathRelativeToWorkspace!,
      ).then((x) => x!),
    ),
  )
  const sessionDocumentManager = new SessionDocumentManager()
  await sessionDocumentManager.addDocuments('test', documentUris)
  const resolvedChanges = await makeToResolvedChangesTransformer(
    sessionDocumentManager,
  )(patch)

  /* Need to apply serially to hold the application assumption that only a
     single editor is open at the same time */
  for (const resolvedChange of resolvedChanges) {
    await applyResolvedChangesWhileShowingTheEditor(resolvedChange)
  }
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
    /* TODO: This is a hack to make sure the file is saved to disk before we
       read it */
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
