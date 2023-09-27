import * as vscode from 'vscode'

/**
 * Various patch application implementations should map their changes to a
 * common denominator which is this type.
 *
 * Refactor: There's potential to refactor all streaming fields into a simple
 * type. This can be reused to represent closed tags on the passing stage as
 * well as stable fields in types like this one
 */
export interface ResolvedExistingFileEditChange {
  type: 'ResolvedExistingFileEditChange'
  fileUri: vscode.Uri
  rangeToReplace: vscode.Range
  rangeToReplaceIsFinal: boolean
  replacement: string
  replacementIsFinal: boolean
  descriptionForHuman?: string
  /* Saving this reflector for when I have batch processing setup
     descriptionForHumanIsFinal: boolean */
}

export interface ResolvedTerminalCommandChange {
  type: 'ResolvedTerminalCommandChange'
  command: string
  descriptionForHuman?: string
}

export type ResolvedChange =
  | ResolvedExistingFileEditChange
  | ResolvedTerminalCommandChange
