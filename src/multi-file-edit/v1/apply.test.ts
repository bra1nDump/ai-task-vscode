import * as assert from 'assert'
import * as vscode from 'vscode'
import { afterEach, beforeEach } from 'mocha'
import { Change } from './types'
import {
  makeTemporaryFileWriterAndOpener,
  resolveAndApplyChangesToMultipleFiles,
  resolveAndApplyChangesToSingleFile,
} from './test-helpers'
import { parsePartialMultiFileEdit } from './parse'
import * as fs from 'fs'
import * as path from 'path'
import { runTerminalCommand } from 'multi-file-edit/applyResolvedChange'

suite('Apply Patch Tests', function () {
  this.timeout(20_000)
  const setupEditorWithContent = makeTemporaryFileWriterAndOpener('test.txt')

  const cleanTmpDirectory = () => {
    const temporaryFolder = path.join(
      vscode.workspace.workspaceFolders![0].uri.fsPath,
      'tmp',
    )

    /* delete temporary directory using regular node file system command
       as workspace does not have directory deletion */
    if (fs.existsSync(temporaryFolder)) {
      fs.rmSync(temporaryFolder, {
        recursive: true,
      })
    }
  }

  // This setup code is clunky
  beforeEach(async () => {
    /* We need to close the editor, otherwise when we reopen it from the same
     * ur I it will ignore the contents of the file on disk and use the
     * contents from the editor which are dirty after the last test
     */
    await vscode.commands.executeCommand('workbench.action.closeAllEditors')

    cleanTmpDirectory()
  })

  afterEach(() => {
    cleanTmpDirectory()
  })

  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors')
  })

  test('Apply single simple change', async () => {
    const editor = await setupEditorWithContent('line1\nline2')

    const changes: Change[] = [
      {
        description: 'Change line1 to Hello World',
        oldChunk: {
          type: 'fullContentRange',
          fullContent: 'line1\nline2',
          isStreamFinalized: true,
        },
        newChunk: { content: 'Hello World\nline2', isStreamFinalized: true },
      },
    ]
    await resolveAndApplyChangesToSingleFile(changes, editor)

    assert.strictEqual(editor.document.getText(), 'Hello World\nline2')
  })

  test('Apply a change with truncated target range', async () => {
    const editor = await setupEditorWithContent(
      'line1\nline2\nline3\nline4\nline5',
    )

    const changes: Change[] = [
      {
        description: 'Change line2 to Hello World',
        oldChunk: {
          type: 'prefixAndSuffixRange',
          prefixContent: 'line1',
          suffixContent: 'line4',
          isStreamFinalized: true,
        },
        newChunk: {
          content: 'line1\nHello World\nline4',
          isStreamFinalized: true,
        },
      },
    ]

    await resolveAndApplyChangesToSingleFile(changes, editor)

    assert.strictEqual(
      editor.document.getText(),
      'line1\nHello World\nline4\nline5',
    )
  })

  test('Change can be applied even with wrong spacing', async () => {
    const editor = await setupEditorWithContent('    line1  \nline2')

    const changes: Change[] = [
      {
        description: 'Change line1 to Hello World with trimming',
        oldChunk: {
          type: 'prefixAndSuffixRange',
          prefixContent: 'line1',
          suffixContent: '    line2   ', // mismatching spacing in range suffix
          isStreamFinalized: true,
        },
        newChunk: { content: 'Hello World\nline2', isStreamFinalized: true },
      },
    ]

    await resolveAndApplyChangesToSingleFile(changes, editor)

    assert.strictEqual(editor.document.getText(), 'Hello World\nline2')
  })

  test('Range fails to apply when there is no match', async () => {
    const editor = await setupEditorWithContent('line1\nline2\nline3')

    const changes: Change[] = [
      {
        description: 'Change non-existent line to Hello World',
        oldChunk: {
          type: 'prefixAndSuffixRange',
          prefixContent: 'non-existent line',
          suffixContent: 'line3',
          isStreamFinalized: true,
        },
        newChunk: { content: 'Hello World\nline3', isStreamFinalized: true },
      },
    ]

    /* Application results does not even show because the rangers failed to
     * resolve Ideally would return some sort of failure but it's currently not
     * doing this
     */
    const applicationResults = await resolveAndApplyChangesToSingleFile(
      changes,
      editor,
    )
    assert.equal(applicationResults.length, 0)
  })

  test('Apply change to a fully empty file', async () => {
    const editor = await setupEditorWithContent('')
    assert.strictEqual(editor.document.getText(), '')

    const changes: Change[] = [
      {
        description: 'Add Hello World to empty file',
        oldChunk: {
          type: 'fullContentRange',
          fullContent: '',
          isStreamFinalized: true,
        },
        newChunk: { content: 'Hello World', isStreamFinalized: true },
      },
    ]

    await resolveAndApplyChangesToSingleFile(changes, editor)

    assert.strictEqual(editor.document.getText(), 'Hello World')
  })

  test('Apply change to a file with new lines only', async () => {
    const editor = await setupEditorWithContent('\n\n')

    const changes: Change[] = [
      {
        description: 'Change empty line to Hello World',
        oldChunk: {
          type: 'fullContentRange',
          fullContent: '\n\n',
          isStreamFinalized: true,
        },
        newChunk: { content: 'Hello World', isStreamFinalized: true },
      },
    ]

    await resolveAndApplyChangesToSingleFile(changes, editor)

    assert.strictEqual(editor.document.getText(), 'Hello World\n\n')
  })

  test('Empty lines are not used to match target range', async () => {
    const editor = await setupEditorWithContent('line1\nline2\n\nline3\n')

    /* empty first line, will match many characters in the document and should
       be ignored the matching should happen based on the second line */
    const changes: Change[] = [
      {
        description: 'Change line2 to Hello World',
        oldChunk: {
          type: 'prefixAndSuffixRange',
          prefixContent: '\nline2',
          suffixContent: 'line3',
          isStreamFinalized: true,
        },
        newChunk: {
          content: 'line1\nHello World\nline3',
          isStreamFinalized: true,
        },
      },
    ]

    const [_applicationResult] = await resolveAndApplyChangesToSingleFile(
      changes,
      editor,
    )

    assert.strictEqual(editor.document.getText(), 'line1\nHello World\nline3\n')
  })

  test('Match on a line with more than one apperance should not match based on that line', async () => {
    // In this case matching should happen based on line 1

    const editor = await setupEditorWithContent('{\nline1\n{\nline3')

    const changes: Change[] = [
      {
        description: 'Change line with { to Hello World',
        oldChunk: {
          type: 'prefixAndSuffixRange',
          prefixContent: '{\nline1',
          suffixContent: 'line3',
          isStreamFinalized: true,
        },
        newChunk: {
          content: 'removing brace on first line\nHello World\nline3',
          isStreamFinalized: true,
        },
      },
    ]

    await resolveAndApplyChangesToSingleFile(changes, editor)

    assert.strictEqual(
      editor.document.getText(),
      'removing brace on first line\nHello World\nline3',
    )
  })

  // Split tests with both parsing + application into a separate file
  test('should correctly parse and apply a change', async () => {
    const payload = `
<change>
  <path>tmp/environment.ts</path>
  <description>Adding a 'name' parameter to the helloWorld function</description>
  <range-to-replace>
// @bread Parametrize this function with a name
export function helloWorld() {
  console.log('Hello world')
}
  </range-to-replace>
  <replacement>
// Parametrized function with a name
export function helloWorld(name: string) {
  console.log('Hello, ' + name);
}
  </replacement>
</change>
  `

    const parsedChange = parsePartialMultiFileEdit(payload)
    assert.ok(parsedChange)

    const initialContent = `// @bread Parametrize this function with a name
export function helloWorld() {
  console.log('Hello world')
}
`

    const editor = await setupEditorWithContent(initialContent)

    const changes = parsedChange.changes.map((x) => x.change)
    await resolveAndApplyChangesToSingleFile(changes, editor)

    const finalContent = editor.document.getText()
    assert.equal(
      finalContent,
      `// Parametrized function with a name
export function helloWorld(name: string) {
  console.log('Hello, ' + name);
}
`,
    )
  })

  test('should correctly parse and apply changes to multiple files', async function () {
    const mainEditor = await makeTemporaryFileWriterAndOpener('tmp/main.ts')(
      `// @bread implement so it will print out current user's name using helper functions
  `,
    )
    const environmentEditor = await makeTemporaryFileWriterAndOpener(
      'tmp/environment.ts',
    )(`
// @bread Use this function to get the current user's name
export function getCurrentUserName() {
  return process.env.USER || 'Unknown user'
}

`)

    const helloWorldEditor = await makeTemporaryFileWriterAndOpener(
      'tmp/helloWorld.ts',
    )(`// @bread Parametrize this function with a name
export function helloWorld() {
  console.log(\`Hello world!\`)
}
  `)

    const llmFinalResponse = `
Plan:

1. In the helloWorld.ts file, the function helloWorld() needs to be parametrized with a name. This means we need to add a parameter to the function and use it in the console.log statement.

2. In the environment.ts file, the function getCurrentUserName() is already implemented correctly according to the comment. No changes are needed.

3. In the main.ts file, we need to implement a function that will print out the current user's name using helper functions. This means we need to import the getCurrentUserName() function from the environment.ts file and the helloWorld() function from the helloWorld.ts file, and then call these functions.

Changes:
<change>
<path>tmp/helloWorld.ts</path>
<description>Parametrising function with a name of the thing to be greeted</description>
<range-to-replace>
export function helloWorld() {
  console.log(\`Hello world!\`)
}
</range-to-replace>
<replacement>
export function helloWorld(name: string) {
  console.log(\`Hello \${name}!\`)
}
</replacement>
</change>

<change>
<path>tmp/main.ts</path>
<description>Implementing function to print out current user's name using helper functions</description>
<range-to-replace>
// @bread implement so it will print out current user's name using helper functions
</range-to-replace>
<replacement>
import { getCurrentUserName } from './environment';
import { helloWorld } from './helloWorld';

// @bread implement so it will print out current user's name using helper functions
const userName = getCurrentUserName();
helloWorld(userName);
</replacement>
</change>
`

    const parsedChange = parsePartialMultiFileEdit(llmFinalResponse)

    await resolveAndApplyChangesToMultipleFiles(parsedChange)

    assert.equal(
      mainEditor.document.getText().replace(/ /g, '+'),
      `import { getCurrentUserName } from './environment';
import { helloWorld } from './helloWorld';

// @bread implement so it will print out current user's name using helper functions
const userName = getCurrentUserName();
helloWorld(userName);
  `.replace(/ /g, '+'),
      'main.ts',
    )

    assert.equal(
      helloWorldEditor.document.getText().replace(/ /g, '+'),
      `// @bread Parametrize this function with a name
export function helloWorld(name: string) {
  console.log(\`Hello \${name}!\`)
}
  `.replace(/ /g, '+'),
      'helloWorld.ts',
    )

    // Content did not changel
    assert.equal(
      environmentEditor.document.getText().replace(/ /g, '+'),
      `
// @bread Use this function to get the current user's name
export function getCurrentUserName() {
  return process.env.USER || 'Unknown user'
}

`.replace(/ /g, '+'),
      'environment.ts',
    )
  })

  /* 
   * Wait until we have cached llm responses setup to run e2e tests fast and
   * avoid monkey patching or refactoring the code to be more testable
   * 
   * Test by hand :D
   * 
   * test('should correctly parse and apply a create file command', async () =>
   * {
       const createFileChange = `
       <change>
         <path>tmp/helloWorld.ts</path>
   * <description>Creating a new file with Hello World content</description>
   * <range-to-replace>
         </range-to-replace>
         <replacement>
         // Hello World
         console.log('Hello World');
         </replacement>
       </change>
       `
       const parsedChange = parsePartialMultiFileEdit(createFileChange)
       const resolvedChanges = resolveAndApplyChangesToMultipleFiles */

  /*   await startInteractiveMultiFileApplication()
       // TODO: Implement the function to apply the change to create a new file */

  //   // TODO: Check if the file is created with the correct content

  /*   // TODO: Cleanup the created file
     }) */

  test('should correctly parse and apply a terminal command', async () => {
    const terminalCommandChange = `
    <terminal-command>
    echo 'Hello, world!' > hello_world.txt
    </terminal-command>
    `
    const parsedChange = parsePartialMultiFileEdit(terminalCommandChange)
    runTerminalCommand(parsedChange.terminalCommands[0])

    // Wait for the terminal command to finish
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const [fileUri] = await vscode.workspace.findFiles('hello_world.txt')
    const fileContent = await vscode.workspace.fs
      .readFile(fileUri)
      .then((x) => x.toString())
    assert.strictEqual(fileContent, 'Hello, world!\n')

    // Cleanup
    await vscode.workspace.fs.delete(fileUri)
  })
})
