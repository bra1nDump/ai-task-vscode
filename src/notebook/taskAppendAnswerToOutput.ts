import * as vscode from 'vscode'

export function taskAppendAnswerToOutput(
  execution: vscode.NotebookCellExecution,
  text: string,
) {
  void execution.clearOutput()
  void execution.appendOutput(
    new vscode.NotebookCellOutput([
      vscode.NotebookCellOutputItem.text(text, 'text/markdown'),
    ]),
  )
}

/*
 * ALright, we need to re-write the whole thing ...
 * that sucks ...
 */
export function taskAppendWithoutErasing(
  execution: vscode.NotebookCellExecution,
  text: string,
) {
  void execution.appendOutput(
    new vscode.NotebookCellOutput([
      vscode.NotebookCellOutputItem.text(text, 'text/markdown'),
    ]),
  )
}
