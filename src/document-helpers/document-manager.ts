import * as vscode from 'vscode'
import { DocumentSnapshot } from './document-snapshot'
import { FileContext } from './file-context'

/**
 * This is a document manager that will help us backdate edits throughout a session.
 * All the edits that will be suggested by the LLM are relative to the file content at the time the request was made.
 *
 * The heavy lifting is really done by DocumentSnapshot, this simply manages all the documents for the session.
 */
export class SessionDocumentManager {
  // Using strength so get lookup succeeds even if the uri is different object
  private uriToDocumentsSnapshots: Map<string, DocumentSnapshot>

  constructor() {
    this.uriToDocumentsSnapshots = new Map()
  }

  async addDocuments(source: string, uris: vscode.Uri[]) {
    const newUris = uris.filter(
      (uri) => !this.uriToDocumentsSnapshots.has(uri.path),
    )

    const tasks = newUris.map(async (uri) => {
      const document = await vscode.workspace.openTextDocument(uri)
      const documentSnapshot = new DocumentSnapshot(document)
      this.uriToDocumentsSnapshots.set(uri.path, documentSnapshot)
    })

    // TODO: add logging so the user sees which documents were added. This would create a circular dependency if we pass the context though... Maybe we should simply return the files that were added and log outside.
    // We can also modify file context to include it's source and log outside similar to how we do it now.

    await Promise.all(tasks)
  }

  getDocumentSnapshot(uri: vscode.Uri): DocumentSnapshot | undefined {
    return this.uriToDocumentsSnapshots.get(uri.path)
  }

  /**
   * Doesn't really belong here by this the most convenient place to put it in the meantime
   */
  getFileContexts(): FileContext[] {
    return Array.from(this.uriToDocumentsSnapshots.values()).map(
      (documentSnapshot) => documentSnapshot.snapshotContext,
    )
  }

  // Debugging
  dumpState() {
    return Array.from(this.uriToDocumentsSnapshots.keys()).join('\n')
  }
}