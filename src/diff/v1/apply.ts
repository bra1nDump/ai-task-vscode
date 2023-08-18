import * as vscode from 'vscode'
import { Change, RangeToReplace } from './types'

export async function findRangeInEditor(
  oldChunk: RangeToReplace,
  editor: vscode.TextEditor,
): Promise<vscode.Range | undefined> {
  const document = editor.document
  const text = document.getText().split('\n')

  const searchLine = (lines: string[], line: string) => {
    const trimmedLine = line.trim()
    return lines.findIndex((l) => l.trim() === trimmedLine)
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

  start += prefixIndex - 1
  end -= suffixIndex - 1

  return new vscode.Range(start, 0, end, document.lineAt(end).text.length)
}

export async function applyChanges(
  changes: Change[],
  editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor,
): Promise<void> {
  if (!editor) {
    console.error('No active text editor')
    return
  }

  for (const change of changes) {
    const range = await findRangeInEditor(change.oldChunk, editor)
    if (!range) {
      console.error(`Could not find range for change: ${change.description}`)
      continue
    }

    await editor.edit((editBuilder) => {
      editBuilder.replace(range, change.newChunk)
    })
  }
}
