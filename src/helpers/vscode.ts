import * as vscode from 'vscode'

export async function getFileText(uri: vscode.Uri): Promise<string> {
  const document = await vscode.workspace.fs.readFile(uri)
  return document.toString()
}

export function getFullFileRange(fileText: string): vscode.Range {
  return new vscode.Range(
    0,
    0,
    fileText.split('\n').length - 1,
    fileText.length,
  )
}
