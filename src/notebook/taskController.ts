import * as vscode from 'vscode'

export class TaskController {
  readonly controllerId = 'task-controller-id'
  readonly notebookType = 'task-notebook'
  readonly label = 'Task Notebook'
  readonly supportedLanguages = ['task-book']

  private readonly _controller: vscode.NotebookController
  private _executionOrder = 0
  private _startFunction: (
    execution: vscode.NotebookCellExecution,
  ) => Promise<void>

  constructor(
    startFunction: (execution: vscode.NotebookCellExecution) => Promise<void>,
  ) {
    this._controller = vscode.notebooks.createNotebookController(
      this.controllerId,
      this.notebookType,
      this.label,
    )

    this._startFunction = startFunction
    this._controller.supportedLanguages = this.supportedLanguages
    this._controller.supportsExecutionOrder = true
    this._controller.executeHandler = this._execute.bind(this)
  }

  dispose(): void {
    this._controller.dispose()
  }

  private _execute(
    cells: vscode.NotebookCell[],
    _notebook: vscode.NotebookDocument,
    _controller: vscode.NotebookController,
  ): void {
    for (const cell of cells) {
      void this._doExecution(cell)
    }
  }

  private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
    const execution = this._controller.createNotebookCellExecution(cell)
    execution.executionOrder = ++this._executionOrder
    execution.start(Date.now()) // Keep track of elapsed time to execute cell.

    await execution.clearOutput()
    void this._startFunction(execution)
  }
}
