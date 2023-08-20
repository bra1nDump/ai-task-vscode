import OpenAI from 'openai'

import { allDiffV1Examples } from 'diff/v1/examples'
import { diffGeneratorPromptPrefix } from 'diff/v1/prompt'

import * as vscode from 'vscode'
import { filterAsyncIterable, mapAsyncInterable } from 'utils/functional'
import { parseLlmGeneratedPatchV1WithHandWrittenParser } from 'diff/v1/parse'
import { LlmGeneratedPatchXmlV1 } from 'diff/v1/types'
import { applyChanges } from 'diff/v1/apply'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

type Message = OpenAI.Chat.Completions.CreateChatCompletionRequestMessage

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
  const messages = constructMessagesForLlm(fileContexts)

  const patchSteam = streamLlm<LlmGeneratedPatchXmlV1>(
    messages,
    parseLlmGeneratedPatchV1WithHandWrittenParser,
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
    await new Promise((resolve) => setTimeout(resolve, 5_000))
  }

  console.log('Birds released, your bread is gone')
}

function constructMessagesForLlm(fileContexts: FileContext[]): Message[] {
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
        'Reply only with generated diffs for the files you see fit.' +
        'As a reminder the output should be a valid xml.',
      role: 'user',
    },
  ]
}

async function* streamLlm<T>(
  messages: Message[],
  tryParsePartial: (content: string) => T | undefined,
): AsyncIterable<T> {
  // Compare AsyncGenerators / AsyncIterators: https://javascript.info/async-iterators-generators
  // Basically openai decided to not return AsyncGenerator, which is more powerful (compare type definitions) but instead return an AsyncIteratable for stream
  const stream = await openai.chat.completions.create({
    model: process.env.OPENAI_DEFAULT_MODEL ?? 'gpt-4',
    temperature: 0.9,
    messages,
    stream: true,
  })

  // Debug stream
  // for await (const part of stream) {
  //   console.log(`Part: `, JSON.stringify(part, null, 2))
  // }

  let currentContent = ''
  const parsedPatchStream = mapAsyncInterable((part) => {
    // If the part is undefined, it means the stream is done
    if (!part) {
      // console.log(`Part is undefined, isLast: `, isLast)
      // We should format the message content nicely instead of simple stringify
      console.log(`Messages submitted:`)
      for (const { content, role } of messages) {
        console.log(`\n[${role}]\n${content}`)
      }
      console.log(`Final content:\n${currentContent}`)

      return undefined
    }

    const delta = part.choices[0]?.delta?.content
    if (!delta) {
      console.log(`No delta found in part: ${JSON.stringify(part)}`)
      return undefined
    }

    currentContent += delta
    process.stdout.write(delta)

    // Try parsing the xml, even if it's complete it should still be able to apply the diffs
    return tryParsePartial(currentContent)
  }, stream)

  const onlyValidPatchesStream = filterAsyncIterable(
    (x): x is T => x !== undefined,
    parsedPatchStream,
  )

  yield* onlyValidPatchesStream
}

/**
 * Find all files in the workspace with @bread mention or with .bread sub-extension
 */
async function findAndCollectBreadedFiles() {
  const allFilesInWorkspace = await vscode.workspace.findFiles('**/*')
  const fileContexts = await Promise.all(
    allFilesInWorkspace.map(async (fileUri) => {
      const binaryFileContent = await vscode.workspace.fs.readFile(fileUri)
      const fileText = binaryFileContent.toString()

      const containsBreadMentionOrIsBreadDotfile =
        fileText.includes('@bread') || fileUri.path.includes('.bread')

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
  ).then((fileContexts) =>
    // Filter typeguards get me every time
    // https://www.benmvp.com/blog/filtering-undefined-elements-from-array-typescript/
    fileContexts.filter(
      (fileContext): fileContext is FileContext => fileContext !== undefined,
    ),
  )
  return fileContexts
}
