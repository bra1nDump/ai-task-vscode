import { SessionConfiguration } from 'session'
import * as vscode from 'vscode'

/**
 * Almost entirely copied from https://github.com/microsoft/vscode/blob/ba36ae4dcca57ba64a9b61e5f4eca88b6e0bc4db/extensions/typescript-language-features/src/languageFeatures/directiveCommentCompletions.ts#L78
 * The range is important otherwise @ character is not included and matched
 * against
 *
 * Current pitfalls: suggests literally all the time, even if the last
 * character is not @
 */
export class TaskExpressionCompletionItemProvider
  implements vscode.CompletionItemProvider
{
  constructor(private sessionConfiguration: SessionConfiguration) {}

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    const line = document.lineAt(position.line).text
    const prefix = line.slice(0, position.character)
    const match = prefix.match(/(@[a-zA-Z\-]*)$/)
    if (!match) {
      return []
    }

    // TODO: make this configurable as we extend the context language
    const completionItems: vscode.CompletionItem[] = [
      '@' + this.sessionConfiguration.taskIdentifier,
      '@' + 'run',
      '@' + 'tabs',
      '@' + 'errors',
    ].map((label) => {
      const item = new vscode.CompletionItem(
        label,
        vscode.CompletionItemKind.Snippet,
      )
      /* I don't think showing details makes much sense,
       * at least let's wait until we have a dynamic set of context providers
       * item.detail = 'bread task expression'
       */
      item.range = new vscode.Range(
        position.line,
        Math.max(0, position.character - (match[1] ? match[1].length : 0)),
        position.line,
        position.character,
      )
      return item
    })

    return completionItems
  }
}
