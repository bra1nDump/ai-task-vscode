import * as WebSocket from 'ws'
import * as vscode from 'vscode'
import { webSocket } from './server'

let currentTextArr: string[] = []

export function sendMessageToChrome() {
  if (webSocket && webSocket.readyState === WebSocket.OPEN) {
    const selectedText = getSelectedText()

    if (!selectedText && !currentTextArr.length) {
      void vscode.window.showErrorMessage('Select at least some text')
      return
    }

    if (selectedText) {
      webSocket.send(`vscodeSendMessage:${selectedText}`)
      void vscode.window.showInformationMessage(
        'The message was sent to the gpt chat',
      )
    } else {
      webSocket.send(`vscodeSendMessage:`)
      void vscode.window.showInformationMessage(
        'The message was sent to the gpt chat',
      )
    }
    currentTextArr = []
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
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
      webSocket.send(`vscodeAddText:${text}`)
      void vscode.window.showInformationMessage(
        'The message added to ChatGPT query',
      )
    }
  } else {
    void vscode.window.showInformationMessage('Select some text')
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
