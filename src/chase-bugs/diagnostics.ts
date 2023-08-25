import * as vscode from 'vscode'
import { getFileText } from '../helpers/vscode'
import { FileContext } from 'helpers/file-context'

export interface DiagnosticEntry {
  fileContext: FileContext
  diagnostic: vscode.Diagnostic
  // suggestedEditTargetRange: vscode.Range
}

/**
 * Getting ready to create a task for each compilation air along with the context around it.
 * It will return the instance of the diagnostic, location in the file and the file content.
 * I'm debating whether I should also extract the suggested edit target range
 * I think I will just return the entire file for now for simplicity
 * There's a question of separation of concerns here as well, what is the best home for this edit locating?
 */
export async function projectDiagnosticEntriesWithAffectedFileContext(): Promise<
  DiagnosticEntry[]
> {
  const diagnostics = vscode.languages.getDiagnostics()
  const diagnosticEntries: DiagnosticEntry[] = []

  for (const [uri, fileDiagnostics] of diagnostics)
    for (const fileDiagnostic of fileDiagnostics) {
      const fileContent = await getFileText(uri)
      diagnosticEntries.push({
        fileContext: {
          filePathRelativeToWorkspace: vscode.workspace.asRelativePath(uri),
          content: fileContent,
        } as FileContext,
        diagnostic: fileDiagnostic,
        // suggestedEditTargetRange: getFullFileRange(fileContent),
      })
    }

  return diagnosticEntries
}
