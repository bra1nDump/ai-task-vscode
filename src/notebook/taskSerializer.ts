/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as vscode from 'vscode'

interface RawNotebookCell {
  language: string
  value: string
  kind: vscode.NotebookCellKind
  editable?: boolean
  outputs: RawCellOutput[]
}

interface RawCellOutput {
  mime: string
  value: any
}

export class TaskSerializer implements vscode.NotebookSerializer {
  async deserializeNotebook(
    content: Uint8Array,
    _token: vscode.CancellationToken,
  ): Promise<vscode.NotebookData> {
    const contents = new TextDecoder().decode(content)

    let raw: RawNotebookCell[]
    try {
      raw = JSON.parse(contents) as RawNotebookCell[]
    } catch {
      raw = []
    }

    function convertRawOutputToBytes(raw: RawNotebookCell) {
      const result: vscode.NotebookCellOutputItem[] = []
      let markdown = ''

      for (const output of raw.outputs) {
        if (output.mime === 'text/markdown') {
          markdown += JSON.stringify(output.value).slice(1, -1)
        } else {
          const data = new TextEncoder().encode(JSON.stringify(output.value))
          result.push(new vscode.NotebookCellOutputItem(data, output.mime))
        }
      }

      const data = new TextEncoder().encode(markdown.replace(/\\n/g, '\n'))
      const markdownOutput = new vscode.NotebookCellOutputItem(
        data,
        'text/markdown',
      )

      result.unshift(markdownOutput)

      return result
    }

    // Create array of Notebook cells for the VS Code API from file contents
    const cells = raw.map(
      (item) =>
        new vscode.NotebookCellData(item.kind, item.value, item.language),
    )

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]
      cell.outputs = raw[i].outputs
        ? [new vscode.NotebookCellOutput(convertRawOutputToBytes(raw[i]))]
        : []
    }

    /*
     * Pass read and formatted Notebook Data to VS Code to display Notebook
     * with saved cells
     */
    return new vscode.NotebookData(cells)
  }

  async serializeNotebook(
    data: vscode.NotebookData,
    _token: vscode.CancellationToken,
  ): Promise<Uint8Array> {
    // function to take output renderer data to a format to save to the file
    function asRawOutput(cell: vscode.NotebookCellData): RawCellOutput[] {
      const result: RawCellOutput[] = []
      for (const output of cell.outputs ?? []) {
        for (const item of output.items) {
          let outputContents = ''
          try {
            outputContents = new TextDecoder().decode(item.data)
          } catch {}

          try {
            const outputData = JSON.parse(outputContents)
            result.push({ mime: item.mime, value: outputData })
          } catch {
            result.push({ mime: item.mime, value: outputContents })
          }
        }
      }
      return result
    }

    /*
     * Map the Notebook data into the format we want to save the Notebook data
     * as
     */

    const contents: RawNotebookCell[] = []

    for (const cell of data.cells) {
      contents.push({
        kind: cell.kind,
        language: cell.languageId,
        value: cell.value,
        outputs: asRawOutput(cell),
      })
    }

    // Give a string of all the data to save and VS Code will handle the rest
    return new TextEncoder().encode(JSON.stringify(contents))
  }
}
