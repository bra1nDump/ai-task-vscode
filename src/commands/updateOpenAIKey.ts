import { promptUserToEnterTheirOwnOpenAiKey } from 'helpers/keyManager'
import * as vscode from 'vscode'

export async function updateOpenAiKey(
  context: vscode.ExtensionContext,
): Promise<void> {
  await promptUserToEnterTheirOwnOpenAiKey(context.secrets)
}
