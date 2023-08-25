import * as vscode from 'vscode'

export interface ExecutionContext {
  /**
   * The top level command opens the editor that we'll be providing real time feedback
   * on what this particular execution is doing.
   */
  realtimeProgressFeedbackEditor?: vscode.TextEditor

  /**
   * Same as above but for a document for example when we are showing output in a markdown preview
   */
  realtimeProgressFeedbackDocument?: vscode.TextDocument
}
