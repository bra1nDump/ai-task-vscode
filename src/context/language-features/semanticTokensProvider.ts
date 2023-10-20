import * as vscode from 'vscode'
import { SessionConfiguration } from 'session'

/**
 * Standard token types https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide#standard-token-types-and-modifiers
 *
 * Usually this highlighting is contributed by a text mate grammar, but I want
 * to keep things in code and dynamic in case we want to add more identifiers
 * and if we want to support user contributed workspace scoped expressions
 *
 * I wonder how extensions apply their own colors to the tokens bypassing the
 * semantic token route. There's some rainbow comment extension that does that.
 * I think it probably uses decorations and I believe it is laggy.
 */
export class TaskSemanticTokensProvider
  implements vscode.DocumentSemanticTokensProvider
{
  /*
   * It is tricky to pick good token types as they are very likely to collide
   * with the existing colors in the file, possibly confusing the user.
   * I can also provide my own a theme that will only effect my own tokens,
   * but that is more work. Let's do this later
   */
  private static readonly tokenTypes = ['decorator', 'macro'] as const
  static tokensLegend = new vscode.SemanticTokensLegend([...this.tokenTypes])
  constructor(private sessionConfiguration: SessionConfiguration) {}

  provideDocumentSemanticTokens(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.SemanticTokens> {
    const taskIdentifier = this.sessionConfiguration.taskIdentifier
    const specialExpressions: {
      expression: string
      type: (typeof TaskSemanticTokensProvider.tokenTypes)[number]
    }[] = [
      { expression: `@${taskIdentifier}`, type: 'macro' },
      { expression: '@' + 'run', type: 'macro' },
      { expression: '@' + 'tabs', type: 'decorator' },
      { expression: '@' + 'errors', type: 'decorator' },
    ]
    const specialExpressionsWithSpaces = specialExpressions
      // For highlighting lets ensure this is a stand alone keyword
      .map((x) => ({ ...x, expression: `${x.expression}` }))

    const linesWithExpressions = Array.from(
      { length: document.lineCount },
      (_, i) => document.lineAt(i).text,
    )
      .map((lineText, line) => ({ lineText, line }))
      .filter(({ lineText }) =>
        specialExpressionsWithSpaces.some((exp) =>
          lineText.includes(exp.expression),
        ),
      )

    const builder = new vscode.SemanticTokensBuilder(
      TaskSemanticTokensProvider.tokensLegend,
    )

    linesWithExpressions.forEach(({ lineText, line }) => {
      specialExpressionsWithSpaces.forEach(({ expression, type }) => {
        let index = lineText.indexOf(expression)
        while (index !== -1) {
          const range = new vscode.Range(
            line,
            index,
            line,
            index + expression.length,
          )
          builder.push(range, type)
          index = lineText.indexOf(expression, index + 1)
        }
      })
    })

    return builder.build()
  }
}
