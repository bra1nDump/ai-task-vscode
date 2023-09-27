import * as vscode from 'vscode'

export interface DiagnosticEntry {
  uri: vscode.Uri
  diagnostic: vscode.Diagnostic
  // suggestedEditTargetRange: vscode.Range
}

/**
 * Getting ready to create a task for each compilation air along with the
 * context around it. It will return the instance of the diagnostic, location
 * in the file and the file content. I'm debating whether I should also extract
 * the suggested edit target range
 * I think I will just return the entire file for now for simplicity
 * There's a question of separation of concerns here as well, what is the best
 * home for this edit locating?
 */
export function projectDiagnosticEntriesWithAffectedFileContext(): DiagnosticEntry[] {
  const diagnostics = vscode.languages.getDiagnostics()
  const diagnosticEntries: DiagnosticEntry[] = []

  for (const [uri, fileDiagnostics] of diagnostics) {
    for (const fileDiagnostic of fileDiagnostics) {
      // Unless it's an error or a warning we don't care
      if (
        fileDiagnostic.severity !== vscode.DiagnosticSeverity.Error &&
        fileDiagnostic.severity !== vscode.DiagnosticSeverity.Warning
      ) {
        continue
      }

      // If it comes from a linter we don't care
      if (fileDiagnostic.source !== 'typescript') {
        console.log(`fileDiagnostic.source ${fileDiagnostic.source}`)
        continue
      }

      diagnosticEntries.push({
        uri,
        diagnostic: fileDiagnostic,
        // suggestedEditTargetRange: getFullFileRange(fileContent),
      })
    }
  }

  return diagnosticEntries
}
