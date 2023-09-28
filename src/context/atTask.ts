import * as vscode from 'vscode'

import { getDocumentText } from '../helpers/fileSystem'
import { safeWorkspaceQueryAllFiles } from '../helpers/fileSystem'

/**
 * Find all files in the workspace with @breadIdentifier mention
 */
export async function findAndCollectBreadMentionedFiles(
  breadIdentifier: string,
): Promise<vscode.Uri[]> {
  const allFilesInWorkspace = await safeWorkspaceQueryAllFiles()

  const fileContexts = await Promise.all(
    allFilesInWorkspace.map(
      async (fileUri): Promise<vscode.Uri | undefined> => {
        const fileText = await getDocumentText(fileUri)
        const containsBreadMention = fileText.includes(`@${breadIdentifier}`)

        if (containsBreadMention) {
          return fileUri
        } else {
          return undefined
        }
      },
    ),
  )

  const filteredFileContexts = fileContexts.filter(
    (fileContext): fileContext is vscode.Uri => fileContext !== undefined,
  )

  return filteredFileContexts
}

/**
 * Find all files in the workspace with bread sub-extension
 */
export async function findAndCollectDotBreadFiles(
  breadIdentifier: string,
): Promise<vscode.Uri[]> {
  const allFilesInWorkspace = await safeWorkspaceQueryAllFiles()

  const fileContexts = allFilesInWorkspace.flatMap((fileUri) => {
    const isBreadDotfile = fileUri.path.includes(`.${breadIdentifier}`)

    if (isBreadDotfile) {
      return [fileUri]
    } else {
      return []
    }
  })

  return fileContexts
}
