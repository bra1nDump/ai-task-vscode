import { getAnswer } from 'helpers/openai'
import * as vscode from 'vscode'

export class TaskController {
  readonly controllerId = 'task-controller-id'
  readonly notebookType = 'task-notebook'
  readonly label = 'Task Notebook'
  readonly supportedLanguages = ['task-book']

  private readonly _controller: vscode.NotebookController
  private _executionOrder = 0

  constructor() {
    this._controller = vscode.notebooks.createNotebookController(
      this.controllerId,
      this.notebookType,
      this.label,
    )

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
    execution.start(Date.now())
    void execution.clearOutput()

    execution.token.onCancellationRequested(() => {
      execution.end(true, Date.now())
    })

    await getAnswer(cell.document.getText(), execution)

    execution.end(true, Date.now())
  }
}
