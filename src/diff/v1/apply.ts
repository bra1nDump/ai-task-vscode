import * as vscode from 'vscode'
import { Change, RangeToReplace } from './types'

export function findRangeInEditor(
  oldChunk: RangeToReplace,
  editor: vscode.TextEditor,
): vscode.Range | undefined {
  const document = editor.document
  const text = document.getText().split('\n')

  /**
   * Finds a line in the document that matches the given line, only if it is the only match
   */
  const searchLine = (lines: string[], line: string) => {
    const trimmedLine = line.trim()

    // Never match empty lines
    if (trimmedLine === '') {
      return -1
    }

    const firstMatchIndex = lines.findIndex((l) => l.trim() === trimmedLine)

    // Make sure its the only match
    const secondMatchIndex = lines.findIndex(
      (l, i) => i !== firstMatchIndex && l.trim() === trimmedLine,
    )
    if (secondMatchIndex !== -1) {
      return -1
    }

    return firstMatchIndex
  }

  // Separately handle a case of very simple / empty files
  // Search for entire content in the document
  if (oldChunk.type === 'fullContentRange') {
    const fullContentIndex = document.getText().indexOf(oldChunk.fullContent)
    if (fullContentIndex !== -1) {
      const fullContentLines = oldChunk.fullContent.split('\n')
      const startLine = document.positionAt(fullContentIndex).line
      const endLine = startLine + fullContentLines.length - 1
      return new vscode.Range(
        startLine,
        0,
        endLine,
        document.lineAt(endLine).text.length,
      )
    }
  }

  // Get both range formats to a common format
  let prefixLines: string[]
  let suffixLines: string[]
  if (oldChunk.type === 'fullContentRange') {
    const lines = oldChunk.fullContent.split('\n')
    const middleIndex = Math.floor(lines.length / 2)
    prefixLines = lines.slice(0, middleIndex)
    suffixLines = lines.slice(middleIndex)
  } else {
    prefixLines = oldChunk.prefixContent.split('\n')
    suffixLines = oldChunk.suffixContent.split('\n')
  }

  // Find the start and end of the range
  let start = -1
  let end = -1
  // Keep track of these to adjust the start and end indices
  let prefixIndex = 0
  let suffixIndex = 0

  while (start === -1 && prefixIndex < prefixLines.length) {
    start = searchLine(text, prefixLines[prefixIndex])
    prefixIndex++
  }

  while (end === -1 && suffixIndex < suffixLines.length) {
    end = searchLine(text, suffixLines[suffixLines.length - 1 - suffixIndex])
    suffixIndex++
  }

  if (start === -1 || end === -1 || start > end) {
    console.error('Could not find range', start, end)
    return undefined
  }

  start -= prefixIndex - 1
  end += suffixIndex - 1

  return new vscode.Range(start, 0, end, document.lineAt(end).text.length)
}

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
      const range = findRangeInEditor(change.oldChunk, editor)
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
