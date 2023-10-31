import * as vscode from 'vscode'
import * as z from 'zod'

const ExtensionStateSchema = z.object({
  userIdentifier: z.string(),
  lastPromptedTutorialVersion: z.number(),
})
type ExtensionState = z.infer<typeof ExtensionStateSchema>

const OptionalExtensionStateSchema = ExtensionStateSchema.partial()
type ExtensionStatePartial = z.infer<typeof OptionalExtensionStateSchema>

export class ExtensionStateAPI {
  private context: vscode.ExtensionContext

  constructor(context: vscode.ExtensionContext) {
    this.context = context
  }

  async getCurrentState(): Promise<ExtensionState> {
    const extensionStateUnknown: unknown =
      this.context.globalState.get('extensionState')
    const parsedExtensionState = OptionalExtensionStateSchema.safeParse(
      extensionStateUnknown,
    )

    // If parsing fails, default initialize the extension state
    const extensionStatePartial: ExtensionStatePartial =
      parsedExtensionState.success ? parsedExtensionState.data : {}

    const extensionState: ExtensionState = {
      userIdentifier:
        extensionStatePartial.userIdentifier ??
        (await generateUserIdentifier(this.context.globalState)),
      lastPromptedTutorialVersion:
        extensionStatePartial.lastPromptedTutorialVersion ?? 0,
    }

    // Update the extension state for consistency, most of the time redundant
    await this.updateState(extensionState)

    return extensionState
  }

  async updateKeyValue<K extends keyof ExtensionState>(
    key: K,
    value: ExtensionState[K],
  ) {
    const currentState = await this.getCurrentState()

    if (key in currentState) {
      currentState[key] = value
      await this.updateState(currentState)
    }
  }

  async updateState(extensionState: ExtensionState) {
    try {
      // Global state must be Json serializable, let's test just in case
      JSON.stringify(extensionState)
    } catch (error) {
      console.error(error)
      // TODO: Surface the error to the user and suggest to bug report
      void vscode.window.showErrorMessage(
        'ai-task extension state is not Json serializable, Please report this bug to our discord server',
      )
      return
    }

    // Update the extension state for consistency
    await this.context.globalState.update('extensionState', extensionState)
  }
}

async function generateUserIdentifier(globalState: vscode.Memento) {
  let userId = vscode.workspace
    .getConfiguration('ai-task')
    .get<string>('userId')
  if (typeof userId === 'string' && userId.length !== 0) {
    return userId
  }

  userId = Math.random().toString(36).substring(7)
  return userId
}
