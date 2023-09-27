import * as vscode from 'vscode'

const tomatoColor = 'rgba(255, 99, 71, 0.2)'
const indigoColor = 'rgba(75, 0, 130, 0.2)'
const limeColor = 'rgba(0, 255, 0, 0.2)'
const blueColor = 'rgba(0, 0, 255, 0.2)'
const violetColor = 'rgba(238, 130, 238, 0.2)'
const yellowishColor = 'rgba(255, 255, 0, 0.2)'

const currentColor = limeColor

// Create a new decoration
export const targetRangeHighlightingDecoration =
  vscode.window.createTextEditorDecorationType({
    backgroundColor: currentColor,
  })
