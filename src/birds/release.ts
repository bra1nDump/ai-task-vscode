import { allDiffV1Examples } from 'diff/v1/examples'
import { diffGeneratorPromptPrefix } from 'diff/v1/prompt'

import * as vscode from 'vscode'
import { parsePartialMultiFileEdit } from 'diff/v1/parse'
import { LlmGeneratedPatchXmlV1 } from 'diff/v1/types'
import { applyChanges } from 'diff/v1/apply'
import { Message, streamLlm } from 'birds/openai-wrapper'

interface FileContext {
  filePathRelativeTooWorkspace: string
  content: string
}

/**
 * Generates and applies diffs to files in the workspace containing @bread mention.
 *
 *
 * Collect all files in workspace with @bread mention
 * Pack the files along with the diff generation prompts
 * Call openai api (through langchain)
 * Parse the diffs
 * Apply them to the current file in place
 */
export async function feedBirds() {
  console.log('Releasing the birds, your bread stands no chance')

  const fileContexts = await findAndCollectBreadedFiles()
  if (!fileContexts) {
    void vscode.window.showErrorMessage(
      'No bread found, birds are getting hungry. Remember to add @bread mention to at least one file in the workspace.',
    )
    return
  }

  const messages = buildMultiFileEditingPrompt(fileContexts)

  const patchSteam = streamLlm<LlmGeneratedPatchXmlV1>(
    messages,
    parsePartialMultiFileEdit,
  )
  let lastPatch: LlmGeneratedPatchXmlV1 | undefined

  // TODO: Keep a map of files that were already opened before so we don't open them again
  //   if they are closed means the user was not interested in them
  for await (const patch of patchSteam) {
    //
    // Show the user the file we will be applying the patch later on so they can start reading
    for (const fileChange of patch.fileChanges) {
      if (!fileChange.filePathRelativeToWorkspace) {
        // Don't know the path yet, skip
        continue
      }

      const workspaceFilesWithMatchingNames = await vscode.workspace.findFiles(
        `**/${fileChange.filePathRelativeToWorkspace}`,
      )
      if (workspaceFilesWithMatchingNames.length !== 1) {
        // Still streaming the path most likely, not enough path was printed to match a single file
        continue
      }

      const fileUri = workspaceFilesWithMatchingNames[0]
      const _document = await vscode.workspace.openTextDocument(fileUri)

      // We might not want to show it
      // If the file is already open, we don't want to show it as this will disrupt the user
      // + we would constantly be switching between files as we run through this loop

      // Check if the file is already open, hmm tabs don't actually have editor references. I think these are inactive - which makes sense
      // vscode.window.tabGroups.all.find((tabGroup) => {
      //   tabGroup.tabs.find((tab) => {
      //     if (tab.) {
      // await vscode.window.showTextDocument(document)
    }

    lastPatch = patch
  }

  if (!lastPatch) {
    console.error('No patch generated, nothing to apply')
    return
  }

  // Actually apply the patch
  for (const singleFileChange of lastPatch.fileChanges) {
    if (!singleFileChange.filePathRelativeToWorkspace) {
      // Don't know the path yet, skip
      continue
    }

    const workspaceFilesWithMatchingNames = await vscode.workspace.findFiles(
      `**/${singleFileChange.filePathRelativeToWorkspace}`,
    )
    if (workspaceFilesWithMatchingNames.length !== 1) {
      // We should know the path by now, if we don't - something is wrong
      console.error(
        `Could not find file with path ${singleFileChange.filePathRelativeToWorkspace}`,
      )
      continue
    }

    const fileUri = workspaceFilesWithMatchingNames[0]

    // Actually we do want to show the documents are we are applying changes to them for now
    // 1. Users can see the changes
    // 2.
    const document = await vscode.workspace.openTextDocument(fileUri)
    const editor = await vscode.window.showTextDocument(document)
    const fileContentWithDiffApplied = await applyChanges(
      singleFileChange.changes,
      editor,
    )

    console.log(
      `Diff application results: ${fileContentWithDiffApplied
        .map((x) => x.result)
        .join('\n')}`,
    )

    // Delay so the user has a chance to see the changes and continue to the next file
    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }

  console.log('Birds released, your bread is gone')
}

function buildMultiFileEditingPrompt(fileContexts: FileContext[]): Message[] {
  const diffExamplesPrompt = allDiffV1Examples.join('\n\n')
  const diffPrompt = diffGeneratorPromptPrefix + '\n\n' + diffExamplesPrompt
  const divPromptSystemMessage: Message = {
    content: diffPrompt,
    role: 'system',
  }

  // Provide all these files including their path
  const filesContextXmlPrompt = fileContexts
    .map(
      (fileContext) =>
        '<file>\n' +
        `  <path>${fileContext.filePathRelativeTooWorkspace}</path>\n` +
        `  <content>\n${fileContext.content}\n</content>\n` +
        '</file>',
    )
    .join('\n\n')
  const filesContextXmlPromptSystemMessage: Message = {
    content:
      'Pay special attention to @bread mentions, they shuold guide the diff generation.\n' +
      'Files context:\n' +
      filesContextXmlPrompt,
    role: 'system',
  }

  return [
    divPromptSystemMessage,
    filesContextXmlPromptSystemMessage,
    {
      content:
        'Reply with a rough plan of the changes and the changes themselves you want to make.\n' +
        'Your plan should only address the requested changes.\n' +
        'Next reply with generated file changes for the files you see fit.\n',
      role: 'user',
    },
  ]
}

/**
 * Find all files in the workspace with @bread mention or with .bread sub-extension
 */
async function findAndCollectBreadedFiles(): Promise<
  FileContext[] | undefined
> {
  // Uggh, it will be kinda tough to create the correct glob pattern
  // Tests for this functionality https://github.com/microsoft/vscode/blob/69b2435e14e5dbd442df58efcc72c28ad81e1ac2/extensions/configuration-editing/src/test/completion.test.ts#L204
  // On top of that finding findFiles only accepts a single negative glob pattern, which is not enough for us
  // Glob pattern docs https://code.visualstudio.com/api/references/vscode-api#GlobPattern
  // Note findFiles does not respect the exclude search.exclude, only files.exclude by default
  // this has caused node_modules to be included in the search :(
  //
  // Relative path match https://code.visualstudio.com/api/references/vscode-api#RelativePattern
  // Do so for each folder in the workspace
  // For now lets just hardcode the src folder
  // I probably should just use a different finder at this point - ignore files in .gitignore
  //   this also needs recursive search so ... later
  const allFilesInWorkspace = await vscode.workspace.findFiles('**/*.ts')

  if (allFilesInWorkspace.length === 0) {
    throw new Error('No files in workspace')
  } else if (allFilesInWorkspace.length > 200) {
    throw new Error(`Too many files matched: ${allFilesInWorkspace.length}`)
  }

  // @crust create intermediate varaibles instead of using .then use await
  const fileContexts = await Promise.all(
    allFilesInWorkspace.map(async (fileUri) => {
      const binaryFileContent = await vscode.workspace.fs.readFile(fileUri)
      const fileText = binaryFileContent.toString()

      const atBreadIdentifierOverride =
        process.env.AT_BREAD_IDENTIFIER_OVERRIDE ??
        vscode.workspace.getConfiguration('birds').get('at-bread-mention')
      const safeAtBreadIdentifierOverride =
        typeof atBreadIdentifierOverride === 'string'
          ? atBreadIdentifierOverride
          : '@bread'

      const containsBreadMentionOrIsBreadDotfile =
        fileText.includes(safeAtBreadIdentifierOverride) ||
        fileUri.path.includes('.bread')

      if (containsBreadMentionOrIsBreadDotfile) {
        return {
          filePathRelativeTooWorkspace:
            vscode.workspace.asRelativePath(fileUri),
          content: fileText,
        }
      } else {
        return undefined
      }
    }),
  )

  const filteredFileContexts = fileContexts.filter(
    (fileContext): fileContext is FileContext => fileContext !== undefined,
  )

  if (fileContexts.length === 0) {
    return undefined
  }

  return filteredFileContexts
}
