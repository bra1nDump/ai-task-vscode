import * as WebSocket from 'ws'
import * as vscode from 'vscode'
import { webSocket } from './server'

let currentTextArr: string[] = []

export function sendMessageToChrome() {
  if (webSocket && webSocket.readyState === WebSocket.OPEN) {
    const selectedText = getSelectedText()
    let text = ''
    if (selectedText) {
      text = selectedText + currentTextArr.join('\n')
    } else {
      if (currentTextArr.length) {
        text = currentTextArr.join('\n')
      } else {
        void vscode.window.showErrorMessage('Select at least some text')
        return
      }
    }
    currentTextArr = []
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

export function addToMessage() {
  const text = getSelectedText()
  if (text) {
    currentTextArr.push(text)
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
