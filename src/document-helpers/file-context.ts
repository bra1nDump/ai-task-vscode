import * as vscode from 'vscode'

import { getDocumentText } from 'helpers/vscode'
import { OpenAiMessage } from 'helpers/openai'

export interface FileContext {
  filePathRelativeToWorkspace: string
  content: string
}

/**
 * Find all files in the workspace with @breadIdentifier mention or with bread
 * sub-extension
 */
export async function findAndCollectBreadedFiles(
  breadIdentifier: string,
): Promise<vscode.Uri[] | undefined> {
  const allFilesInWorkspace = await safeWorkspaceQueryAllFiles()

  const fileContexts = await Promise.all(
    allFilesInWorkspace.map(
      async (fileUri): Promise<vscode.Uri | undefined> => {
        const fileText = await getDocumentText(fileUri)
        const containsBreadMentionOrIsBreadDotfile =
          fileText.includes(`@${breadIdentifier}`) ||
          fileUri.path.includes(`.${breadIdentifier}`)

        if (containsBreadMentionOrIsBreadDotfile) {
          return fileUri
        } else {
          return undefined
        }
      },
    ),
  )

  const filteredFileContexts = fileContexts.filter(
    (fileContext): fileContext is vscode.Uri => fileContext !== undefined,
  )

  if (fileContexts.length === 0) {
    return undefined
  }

  return filteredFileContexts
}

/**
 * Improvement ideas:
 * Find a package that does glob and respects .gitignore
 *
 * Uggh, it will be kinda tough to create the correct glob pattern
 * Tests for this functionality https://github.com/microsoft/vscode/blob/69b2435e14e5dbd442df58efcc72c28ad81e1ac2/extensions/configuration-editing/src/test/completion.test.ts#L204
 * On top of that finding findFiles only accepts a single negative glob
 * pattern, which is not enough for us Glob pattern docs
 * https://code.visualstudio.com/api/references/vscode-api#GlobPattern
 * Note findFiles does not respect the exclude search.exclude, only
 * filesexclude by default this has caused node_modules to be included in the
 * search :(
 *
 * Relative path match https://code.visualstudio.com/api/references/vscode-api#RelativePattern
 * Do so for each folder in the workspace
 * For now lets just hardcode the src folder
 * I probably should just use a different finder at this point - ignore files
 * in .gitignore
 *   this also needs recursive search so ... later
 */
async function safeWorkspaceQueryAllFiles(): Promise<vscode.Uri[]> {
  const allFilesInWorkspace = await vscode.workspace.findFiles(
    '**/*.{ts,md}',
    '**/{node_modules,.git,out,dist,.bread,docs}/**/*',
    1000, // Give more then the limit below so we can throw an error if it exceeds to signal that the glob is bad
  )

  if (allFilesInWorkspace.length === 0) {
    throw new Error('No files in workspace')
  } else if (allFilesInWorkspace.length > 200) {
    throw new Error(`Too many files matched: ${allFilesInWorkspace.length}`)
  }

  return allFilesInWorkspace
}

/**
 * Encode the file contexts into a prompt for the model
 * @param fileContexts - The files to encode
 * @param includeLineNumbers - Whether to include line numbers in the prompt. Keeping this as a parameter to quantify improvements or regressions
 */
export function fileContextSystemMessage(fileContexts: FileContext[]) {
  const filesContextXmlPrompt = fileContexts
    .map((fileContext) => {
      return (
        '<file>\n' +
        `<path>${fileContext.filePathRelativeToWorkspace}</path>\n` +
        `<content>\n${fileContext.content}\n</content>\n` +
        '</file>'
      )
    })
    .join('\n')

  const filesContextXmlPromptSystemMessage: OpenAiMessage = {
    content: 'Given files:\n' + filesContextXmlPrompt,
    role: 'system',
  }
  return filesContextXmlPromptSystemMessage
}
