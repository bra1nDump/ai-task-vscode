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

    if (cell.document.getText().includes('@' + 'task')) {
      // Stock editing based on currently opened files
      await completeInlineTasksCommand(
        this.extensionContext,
        this.sessionRegistry,
        execution,
      )
    } else {
      await answerQuestionCommand(
        this.extensionContext,
        this.sessionRegistry,
        execution,
        extractChatHistory(execution),
      )
    }

    execution.end(true, Date.now())
  }
}

export function extractChatHistory(
  execution: vscode.NotebookCellExecution,
): OpenAiMessage[] {
  return (
    execution.cell.notebook
      .getCells()
      // Get all cells up to the current one
      .slice(0, execution.cell.index + 1)
      // Skip first cell, skip last cell's output (re-running)
      .flatMap((cell, index, array) => {
        if (index === 0 && cell.kind === vscode.NotebookCellKind.Markup) {
          // First documentation cell - skip
          return []
        }

        const messages: OpenAiMessage[] = [
          {
            role: 'user',
            content: cell.document.getText(),
          },
        ]

        const output = cell.outputs.at(-1)
        if (
          output &&
          output.items.length !== 0 &&
          /*
           * Dont include last cell's output as this means we are re-running it
           */
          index !== array.length - 1
        ) {
          messages.push({
            role: 'assistant',
            content: output.items.at(-1)!.data.toString(),
          })
        }

        return messages
      })
  )
}
