import { LlmError } from 'helpers/openai'
import { SessionContext } from 'session'
import * as vscode from 'vscode'

export async function explainErrorToUserAndOfferSolutions(
  sessionContext: SessionContext,
  error: LlmError,
) {
  void sessionContext.highLevelLogger(`\n\n${error.messageForUser}\n`)
  sessionContext.sessionAbortedEventEmitter.fire()

  /*
   * TODO: Add analytics to track errors
   */
  switch (error.kind) {
    case 'invalid_api_key':
    case 'insufficient_quota':
      // Prompt user to update the key
      void (async () => {
        const selection = await vscode.window.showInformationMessage(
          'OpenAI key that we have provided by default or your key looks broken',
          'Update key',
          'Dismiss',
        )
        if (selection === 'Update key') {
          await vscode.commands.executeCommand('aiTask.setOpenAiKey')
        }
      })()
      break

    case 'invalid_request_error':
      void sessionContext.highLevelLogger(
        `\n\nMost likely a bug, please let us know what happened on [Discord](https://discord.gg/D8V6Rc63wQ)\n`,
      )
      break
    case 'token_count_limit_reached':
      void sessionContext.highLevelLogger(
        `\n\nPlease reduce the context submitted to the LLM\n`,
      )
      break

    case 'unknown':
    default:
      void sessionContext.highLevelLogger(
        `\n\nMost likely a bug, please let us know what happened on [Discord](https://discord.gg/D8V6Rc63wQ)\nFor now you can try updating your OpenAI key: Open command palate (Cmd+Shift+P), type "AI Task: Update OpenAI key"\n`,
      )
      break
  }
}
