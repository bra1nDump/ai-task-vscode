import * as asssert from 'assert'
// NOTE: Since we are running this from mocha, we can't use the fancy diffs/apply syntax and are keeping paths relative
import { parsePartialMultiFileEdit } from './parse'
import { applyChanges, findRangeInEditor } from './apply'
import * as vscode from 'vscode'

suite('Combined parse and apply test', () => {
  test('should correctly parse and apply a change', async () => {
    const payload = `
<file>
  <path>environment.ts</path>
  <change>
    <description>Adding a 'name' parameter to the helloWorld function</description>
    <old-chunk>
// @bread Parametrize this function with a name
export function helloWorld() {
  console.log('Hello world')
}
    </old-chunk>
    <new-chunk>
// Parametrized function with a name
export function helloWorld(name: string) {
  console.log('Hello, ' + name);
}
    </new-chunk>
  </change>
</file>
    `

    const parsedChange = parsePartialMultiFileEdit(payload)
    asssert.ok(parsedChange)

    const initialContent = `// @bread Parametrize this function with a name
export function helloWorld() {
  console.log('Hello world')
}
`

    const doc = await vscode.workspace.openTextDocument({
      content: initialContent,
    })
    const editor = await vscode.window.showTextDocument(doc)

    const changes = parsedChange.fileChanges[0].changes
    const rangeInEditor = findRangeInEditor(changes[0].oldChunk, editor)
    asssert.ok(rangeInEditor)
    asssert.ok(rangeInEditor.start)
    asssert.ok(rangeInEditor.end)

    await applyChanges(changes, editor)

    const finalContent = editor.document.getText()
    asssert.equal(
      finalContent,
      `// Parametrized function with a name
export function helloWorld(name: string) {
  console.log('Hello, ' + name);
}
`,
    )
  })
})
