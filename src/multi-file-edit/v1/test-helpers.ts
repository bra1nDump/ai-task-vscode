import * as vscode from 'vscode'
import { applyResolvedChangesWhileShowingTheEditor } from '../applyResolvedChange'
import { Change } from './types'
import { mapToResolvedChanges } from './resolveTargetRange'

export async function resolveAndApplyChanges(
  changes: Change[],
  editor: vscode.TextEditor,
) {
  const resolvedChanges = await mapToResolvedChanges({
    changes: [
      {
        changes: changes,
        isStreamFinilized: true,
        filePathRelativeToWorkspace: vscode.workspace.asRelativePath(
          editor.document.uri,
        ),
      },
    ],
    isStreamFinalizedUnused: false,
  })

  return Promise.all(
    resolvedChanges.map(async (resolvedChange) => {
      return await applyResolvedChangesWhileShowingTheEditor(resolvedChange)
    }),
  )
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
    // TODO: This is a hack to make sure the file is saved to disk before we read it
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
