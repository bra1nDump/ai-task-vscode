import * as vscode from 'vscode'

const pendingEdits = new Map<string, Promise<void>>()
const documentContents = new Map<
  string,
  { kind: number; language: string; value: string }[]
>()

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
