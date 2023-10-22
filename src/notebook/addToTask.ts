import * as vscode from 'vscode'

const pendingEdits = new Map<string, Promise<void>>()
const documentContents = new Map<
  string,
  { kind: number; language: string; value: string }[]
>()

/*
 * This is currently limited to append to append to the first cell in the
 * notebook.
 *
 * Lets replace this with appending to output of the last cell.
 *
 */
export async function queueAnAppendToMarkdownValue(
  document: vscode.TextDocument,
  text: string,
) {
  const path = document.uri.path
  const previousEdit = pendingEdits.get(path)
  const applyEdit = async () => {
    let currentContentArray = documentContents.get(path)
    if (!currentContentArray) {
      const currentContent = document.getText()
      try {
        currentContentArray = JSON.parse(currentContent) as
          | {
              kind: number
              language: string
              value: string
            }[]
          | undefined
        if (!Array.isArray(currentContentArray)) {
          throw new Error('Content does not have the expected array format')
        }
      } catch (e) {
        /*
         * If parsing failed or content is not an array,
         * initialize with default structure
         */
        currentContentArray = [{ kind: 1, language: 'markdown', value: '' }]
      }

      /*
       * Check if the first object has the expected format. If not,
       * replace it with the default structure
       */
      if (currentContentArray[0]?.value === undefined) {
        currentContentArray[0] = { kind: 1, language: 'markdown', value: '' }
      }

      documentContents.set(path, currentContentArray)
    }

    // Append text to the value of the first object in the array

    currentContentArray[0].value += text

    const data = new TextEncoder().encode(JSON.stringify(currentContentArray))
    await vscode.workspace.fs.writeFile(document.uri, data)
  }

  const editPromise = previousEdit ? previousEdit.then(applyEdit) : applyEdit()
  pendingEdits.set(document.uri.toString(), editPromise)

  await editPromise
}

/*
 * COPIED OVER FROM ABOVE
 *
 * HACCCCK
 * Sharing pending edits with the other function
 *
 * This is currently limited to append to append to the first cell in the
 * notebook.
 *
 * Lets replace this with appending to output of the last cell.
 *
 */

// THIS WILL LEAK MEMORY!! Probably move to session scope
const currentCellOutputContentMap = new Map<string, string>()
export async function queueAnAppendToExecutionOutput(
  execution: vscode.NotebookCellExecution,
  text: string,
) {
  const cellId = execution.cell.document.uri.toString()
  const previousEdit = pendingEdits.get(cellId)
  const applyEdit = async () => {
    let currentCellOutput = currentCellOutputContentMap.get(cellId)
    if (!currentCellOutput) {
      currentCellOutput = ''
    }

    // Append text to the value of the first object in the array

    currentCellOutput += text
    currentCellOutputContentMap.set(cellId, currentCellOutput)

    await execution.replaceOutput(
      new vscode.NotebookCellOutput([
        vscode.NotebookCellOutputItem.text(currentCellOutput, 'text/markdown'),
      ]),
    )
  }

  const editPromise = previousEdit ? previousEdit.then(applyEdit) : applyEdit()
  pendingEdits.set(cellId, editPromise)

  await editPromise
}
