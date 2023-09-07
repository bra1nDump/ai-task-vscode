import * as vscode from 'vscode'

// Create a new decoration
export const targetRangeHighlightingDecoration =
  vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255,255,0,0.3)',
  })
