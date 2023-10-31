import * as vscode from 'vscode'
import * as z from 'zod'

const ExtensionStateSchema = z.object({
  lastPromptedTutorialVersion: z.number(),
})

type ExtensionState = z.infer<typeof ExtensionStateSchema>

export class ExtensionStateAPI {
  private context: vscode.ExtensionContext

  constructor(context: vscode.ExtensionContext) {
    this.context = context
  }

  getCurrentState(): ExtensionState {
    const extensionStateUnknown: unknown =
      this.context.globalState.get('extensionState')
    const parsedExtensionState = ExtensionStateSchema.safeParse(
      extensionStateUnknown,
    )
    let extensionState: ExtensionState

    // If parsing fails, default initialize the extension state
    if (parsedExtensionState.success) {
      extensionState = parsedExtensionState.data
    } else {
      extensionState = { lastPromptedTutorialVersion: 0 }
    }

    return extensionState
  }

  async updateState<K extends keyof ExtensionState>(
    key: K,
    value: ExtensionState[K],
  ) {
    const currentState = this.getCurrentState()

    if (key in currentState) {
      currentState[key] = value
      await this.context.globalState.update('extensionState', currentState)
    }
  }
}
