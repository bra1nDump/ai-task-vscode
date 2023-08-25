import * as vscode from 'vscode'

/**
 * Various patch application implementations should map their changes to a common
 * denominator which is this type
 */

export interface ResolvedChange {
  fileUri: vscode.Uri
  rangeToReplace: vscode.Range
  replacement: string
  descriptionForHuman: string
  isFinal: boolean
}
