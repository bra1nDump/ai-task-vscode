import * as vscode from 'vscode'
import { Change } from './types'
import { findTargetRangeInEditor } from './findRangeInEditor'

export async function applyChanges(
  changes: Change[],
  editor: vscode.TextEditor,
): Promise<
  {
    change: Change
    result:
      | 'appliedSuccessfully'
      | 'failedToFindTargetRange'
      | 'failedToApplyCanRetry'
  }[]
> {
  return Promise.all(
    changes.map(async (change) => {
      const range = findTargetRangeInEditor(change.oldChunk, editor)
      if (!range) {
        console.error(`Could not find range for change: ${change.description}`)
        return { change, result: 'failedToFindTargetRange' }
      }

      const successfullyApplied = await editor.edit((editBuilder) => {
        editBuilder.replace(range, change.newChunk.content)
      })
      return {
        change,
        result: successfullyApplied
          ? 'appliedSuccessfully'
          : 'failedToApplyCanRetry',
      }
    }),
  )
}
