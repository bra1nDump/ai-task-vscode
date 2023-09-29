import * as vscode from 'vscode'
import { SessionConfiguration } from 'session'

export class TaskCodeLensProvider implements vscode.CodeLensProvider {
  constructor(private sessionConfiguration: SessionConfiguration) {}

  provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const taskIdentifier = this.sessionConfiguration.taskIdentifier
    const codeLenses: vscode.CodeLens[] = []

    const linesWithTasks = Array.from(
      { length: document.lineCount },
      (_, i) => document.lineAt(i).text,
    )
      .map((lineText, line) => ({ lineText, line }))
      .filter(({ lineText }) => lineText.includes(`@${taskIdentifier}`))

    linesWithTasks.forEach(({ lineText, line }) => {
      const matchStart = lineText.indexOf(`@${taskIdentifier}`)
      const range = new vscode.Range(line, 0, line, lineText.length)
      const command: vscode.Command = {
        title: `Run @${taskIdentifier}`,
        command: 'ai-task.completeInlineTasks',
        arguments: [],
      }
      const codeLens = new vscode.CodeLens(range, command)
      codeLenses.push(codeLens)
    })

    return codeLenses
  }
}
