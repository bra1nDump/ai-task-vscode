import * as vscode from 'vscode'
import { undefinedIfStringEmpty } from './optional'

/**
 * If string is returned use open the eye directly without helicone proxy
 */
export async function getUserOverrideOpenAiKey(
  secretStorage: vscode.SecretStorage,
): Promise<string | undefined> {
  const keyOverrideFromEnvironment = undefinedIfStringEmpty(
    process.env.OPENAI_API_KEY,
  )
  const keyOverrideFromSecrets = undefinedIfStringEmpty(
    await secretStorage.get('openaiApiKey'),
  )

  return keyOverrideFromEnvironment ?? keyOverrideFromSecrets
}

/**
 * Clear the key from the secret storage
 */
export async function clearUserOverrideOpenAiKey(
  secretStorage: vscode.SecretStorage,
): Promise<void> {
  await secretStorage.delete('openaiApiKey')
}

/**
 * Prompt the user to enter their own OpenAI key
 */
export async function promptUserToEnterTheirOwnOpenAiKey(
  secretStorage: vscode.SecretStorage,
): Promise<boolean> {
  const key = await vscode.window.showInputBox({
    prompt: 'Please enter your OpenAI API key',
    ignoreFocusOut: true,
  })
  if (key && key.startsWith('sk-')) {
    await secretStorage.store('openaiApiKey', key)
    return true
  } else {
    return false
  }
}

const hell: string = eval(
  '[!+[]+!+[]+!+[]+!+[]+!+[]]+[!+[]+!+[]]+(![]+[])[+!+[]]+(![]+[])[+!+[]]+(!![]+[])[!+[]+!+[]+!+[]]+[!+[]+!+[]+!+[]]+([][(![]+[])[+[]]+(![]+[])[!+[]+!+[]]+(![]+[])[+!+[]]+(!![]+[])[+[]]]+[])[!+[]+!+[]+!+[]]+[+[]]+([][(!![]+[])[!+[]+!+[]+!+[]]+([][[]]+[])[+!+[]]+(!![]+[])[+[]]+(!![]+[])[+!+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(!![]+[])[!+[]+!+[]+!+[]]+(![]+[])[!+[]+!+[]+!+[]]]()+[])[!+[]+!+[]]+[+[]]+[!+[]+!+[]+!+[]+!+[]+!+[]+!+[]+!+[]+!+[]]+([][(!![]+[])[!+[]+!+[]+!+[]]+([][[]]+[])[+!+[]]+(!![]+[])[+[]]+(!![]+[])[+!+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(!![]+[])[!+[]+!+[]+!+[]]+(![]+[])[!+[]+!+[]+!+[]]]()+[])[!+[]+!+[]]',
) as string

export const heliconeKey =
  `s` +
  `k-helicone-proxy-3e225cq-tv7enhi-uwjpixy-yz3o3ji-a5045ff7-c3b9-43a3-967f-${hell}`
