import * as WebSocket from 'ws'
import * as vscode from 'vscode'
import { webSocket } from './server'

export function sendMessageToChrome() {
  const text = getSelectedText()
  if (webSocket && webSocket.readyState === WebSocket.OPEN) {
    webSocket.send(`vscodeText:${text}`)
    void vscode.window.showInformationMessage(
      'The message was sent to the gpt chat',
    )
  } else {
    void vscode.window.showErrorMessage(
      'There is no working browser extension to send the message',
    )
  }
}

function getSelectedText() {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    void vscode.window.showErrorMessage('No active editor!')
    return
  }

  const selection = editor.selection
  const text = editor.document.getText(selection)

  return text
}
