import * as vscode from 'vscode'

export const pendingEdits = new Map<string, Promise<void>>()
export const documentContents = new Map<
  string,
  { kind: number; language: string; value: string }[]
>()

/*
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
export const currentCellOutputContentMap = new Map<string, string>()
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
