import { SessionDocumentManager } from 'document-helpers/document-manager'
import * as vscode from 'vscode'

export interface SessionContext {
  /**
   * This will be open to the side to show real time feedback of what is happening in the session.
   */
  markdownHighLevelFeedbackDocument: vscode.TextDocument

  /**
   * This is the document where raw LLM request is logged. This is mostly for development.
   */
  markdownLowLevelFeedbackDocument: vscode.TextDocument

  documentManager: SessionDocumentManager
}

export async function startSession(): Promise<SessionContext> {
  const {
    sessionMarkdownHighLevelFeedbackDocument,
    sessionMarkdownLowLevelFeedbackDocument,
  } = await createSessionLogDocuments()

  const cachedActiveEditor = vscode.window.activeTextEditor

  // Since we're opening to the side the focus is not taken
  await vscode.commands.executeCommand(
    'markdown.showPreviewToSide',
    sessionMarkdownHighLevelFeedbackDocument.uri,
  )

  // Restore the focus
  if (cachedActiveEditor)
    await vscode.window.showTextDocument(
      cachedActiveEditor.document,
      cachedActiveEditor.viewColumn,
    )

  // Great document manager that will help us backdate edits throughout this sessiong
  const documentManager = new SessionDocumentManager()

  return {
    markdownHighLevelFeedbackDocument: sessionMarkdownHighLevelFeedbackDocument,
    markdownLowLevelFeedbackDocument: sessionMarkdownLowLevelFeedbackDocument,
    documentManager,
  }
}

/** Persist session logs */
export async function closeSession(
  sessionContext: SessionContext,
): Promise<void> {
  await sessionContext.markdownHighLevelFeedbackDocument.save()
  await sessionContext.markdownLowLevelFeedbackDocument.save()
}

async function createSessionLogDocuments() {
  const prettyPrintedDateWithTimeShort = new Date()
    .toLocaleString('en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
    // Replace : and / with - to make it a valid file name, otherwise it will create a bunch of nested directories
    .replace(/[:/]/g, '-')
  const sessionsDirectory = vscode.Uri.joinPath(
    vscode.workspace.workspaceFolders![0].uri,
    '.bread/sessions',
  )

  // High level feedback
  const sessionMarkdownHighLevelFeedbackDocument =
    await createAndOpenEmptyDocument(
      sessionsDirectory,
      `${prettyPrintedDateWithTimeShort}.md`,
    )
  // Low level feedback
  const sessionMarkdownLowLevelFeedbackDocument =
    await createAndOpenEmptyDocument(
      sessionsDirectory,
      `${prettyPrintedDateWithTimeShort}.raw.md`,
    )

  return {
    sessionMarkdownHighLevelFeedbackDocument,
    sessionMarkdownLowLevelFeedbackDocument,
  }
}

async function createAndOpenEmptyDocument(
  sessionsDirectory: vscode.Uri,
  name: string,
) {
  const highLevelFeedbackPath = vscode.Uri.joinPath(sessionsDirectory, name)
  await vscode.workspace.fs.writeFile(highLevelFeedbackPath, new Uint8Array())
  // VSCode is known to be slow to update the file system
  await new Promise((resolve) => setTimeout(resolve, 100))

  const sessionMarkdownHighLevelFeedbackDocument =
    await vscode.workspace.openTextDocument(highLevelFeedbackPath)
  return sessionMarkdownHighLevelFeedbackDocument
}
