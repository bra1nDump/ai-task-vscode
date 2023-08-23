import * as vscode from 'vscode'
import { getFileText, getFullFileRange } from '../helpers/vscode'

/**
 * Getting ready to create a task for each compilation air along with the context around it.
 * It will return the instance of the diagnostic, location in the file and the file content.
 * I'm debating whether I should also extract the suggested edit target range
 * I think I will just return the entire file for now for simplicity
 * There's a question of separation of concerns here as well, what is the best home for this edit locating?
 */
export async function getDiagnosticEntriesWithFileContext() {
  const diagnostics = vscode.languages.getDiagnostics()
  const diagnosticEntries = []

  for (const [uri, fileDiagnostics] of diagnostics) {
    const fileContent = await getFileText(uri)

    for (const fileDiagnostic of fileDiagnostics) {
      diagnosticEntries.push({
        fileUri: uri,
        fileContent: fileContent,
        diagnostic: fileDiagnostic,
        diagnosticLocation: fileDiagnostic.range,
        suggestedEditTargetRange: getFullFileRange(fileContent),
      })
    }
  }

  return diagnosticEntries
}
