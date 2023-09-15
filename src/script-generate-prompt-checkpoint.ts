/**
 * This will use the current version of the prompt to generate how a compiled
 * version of the prompt looks like at the time of generation. It will create
 * multiple configurations of the prompt if applicable (use line numbers or not
 * for example).
 *
 * Will be run as part of the code generation that might
 * happen without having vscode apis so we should not depend on it.
 *
 * HOW TO RUN: There is a vscode task and a script codegen:* package.json
 */

/* COPIED FROM MOCA TEST RUNNER which was experiencing the same issue
 *
 * I'm pretty sure otherwise my use of absolute paths within the project would
 * not work unless I would bundle up all the tests into one file.
 * For reference I believe I have done this within blocky.ai project. Anyway
 * experiencing the same issue within the script just copying this
 */
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import * as tsconfigPaths from 'tsconfig-paths'

const projectRoot = path.resolve(__dirname, '..')
console.log(`${projectRoot}`)
const outSrc = path.resolve(projectRoot, 'out')
tsconfigPaths.register({
  baseUrl: outSrc,
  paths: {
    'src/*': ['src/*'],
  },
})

import {
  transformFileContextWithLineNumbers,
  FileContext,
} from 'document-helpers/file-context'
import { createMultiFileEditingMessages } from 'multi-file-edit/v1/prompt'

// Will be passed within package script
const currentVersion = process.env.MULTI_FILE_PROMPT_VERSION ?? 'v1'
codeGeneratePromptCheckpoint(currentVersion)

export function codeGeneratePromptCheckpoint(version: string) {
  for (const includeLineNumbers of [true, false]) {
    let exampleFileContext: FileContext = {
      filePathRelativeToWorkspace: 'example.ts',
      content: `console.log('Hello world')`,
    }
    if (includeLineNumbers) {
      exampleFileContext =
        transformFileContextWithLineNumbers(exampleFileContext)
    }
    const exampleMessages = createMultiFileEditingMessages(
      [exampleFileContext],
      'Example task (refactor, move the task to the prompt file so I can also check point it)',
      {
        breadIdentifier: 'crust',
        includeLineNumbers,
      },
    )

    let fileContent = ''
    const commitHash = execSync('git rev-parse HEAD').toString().trim()
    fileContent += `# ${version} - ${
      includeLineNumbers ? 'lines' : 'no-lines'
    }\n\n`
    fileContent += `Generated at: ${new Date().toLocaleDateString()}\n\n`
    fileContent += `Commit Hash: ${commitHash}\n\n`
    for (const message of exampleMessages) {
      fileContent += `## ${message.role}\n\n${message.content}\n\n`
    }

    const workspaceRoot = process.cwd()
    const filePath = path.join(
      workspaceRoot,
      'prompt-engineering',
      'checkpoints',
      'multi-file-edit',
      `${version}-${includeLineNumbers ? 'lines' : 'no-lines'}.md`,
    )
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, fileContent)
    } catch (error) {
      console.error('Failed to write file:', error)
    }
  }
}
