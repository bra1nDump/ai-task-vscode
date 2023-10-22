import { completeInlineTasksCommand } from 'commands/completeInlineTasks'
import { answerQuestionCommand } from 'commands/questionAnswering'
import { OpenAiMessage } from 'helpers/openai'
import { SessionContext } from 'session'
import * as vscode from 'vscode'

export class TaskController {
  readonly controllerId = 'task-controller-id'
  readonly notebookType = 'task-notebook'
  readonly label = 'Task Notebook'
  readonly supportedLanguages = ['task-notebook']

  private readonly _controller: vscode.NotebookController
  private _executionOrder = 0

  constructor(
    private extensionContext: vscode.ExtensionContext,
    private sessionRegistry: Map<string, SessionContext>,
  ) {
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

    /*
     * Check if cell has @ task mention and kick off task if yes,
     * passing execution
     */

    void execution.clearOutput()

    execution.token.onCancellationRequested(() => {
      /*
       * I think we would need to add a hook to stop openai request here.
       * I think this was causing the double promise rejection error.
       *
       * execution.end(true, Date.now())
       */
    })

    if (cell.document.getText().includes('@' + 'task from inline command')) {
      // Stock editing based on currently opened files
      await completeInlineTasksCommand(
        this.extensionContext,
        this.sessionRegistry,
        execution,
      )
      /*
       * TODO (later): Add an if case where we add a custom task in the
       * notebook. Include the task in the prompt and start
       * completeInlineTasksCommand
       */
    } else {
      const cellsUpToThisOne = cell.notebook.getCells().slice(0, cell.index + 1)

      await answerQuestionCommand(
        this.extensionContext,
        this.sessionRegistry,
        execution,
        cellsUpToThisOne.flatMap((cell) => {
          const cellValue = cell.document.getText()
          const messages: OpenAiMessage[] = [
            {
              content: cellValue,
              role: 'user',
            },
          ]

          const cellOutput = cell.outputs[0]?.items[0]
          if (cellOutput?.mime === 'text/markdown') {
            messages.push({
              content: new TextDecoder().decode(cellOutput.data),
              role: 'system',
            })
          }

          return messages
        }),
      )
    }

    execution.end(true, Date.now())
  }
}
