import * as vscode from 'vscode'

export function taskAppendToController(
  execution: vscode.NotebookCellExecution,
  text: string,
) {
  void execution.clearOutput()
  void execution.appendOutput([
    new vscode.NotebookCellOutput([
      vscode.NotebookCellOutputItem.text(text, 'text/markdown'),
    ]),
  ])
}
