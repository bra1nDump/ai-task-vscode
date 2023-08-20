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

type FileContext = {
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
export async function release() {
  console.log('Releasing the birds, your bread stands no chance')

  const fileContexts = await collectContextFiles()
  const messages = constructMessagesForLlm(fileContexts)

  const patchSteam = streamLlm(
    messages,
    parseLlmGeneratedPatchV1WithHandWrittenParser,
  )
  let lastPatch: LlmGeneratedPatchXmlV1 | undefined
  for await (const patch of patchSteam) {
    lastPatch = patch
    console.log(`Parsed patch: ${JSON.stringify(patch)}`)
  }

  console.log('Birds released, your bread is gone')
  // Applying the final patch
  if (!lastPatch) {
    console.error('No patch generated, nothing to apply')
    return
  }

  // For now single file
  const fileChange = lastPatch.fileChangeOutput
  const fileChanges = fileChange.changes

  const fileContentWithDiffApplied = await applyChanges(
    fileChanges,
    vscode.window.activeTextEditor!,
  )

  console.log(
    `Diff application results: ${fileContentWithDiffApplied.map(
      (x) => x.result,
    )}`,
  )
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
 * Find all files in the workspace with @bread mention and create a context for each
 * Optimization: use a watcher to keep track of files with @bread mention
 */
async function collectContextFiles() {
  const allFilesInWorkspace = await vscode.workspace.findFiles('**/*')
  const fileContexts = await Promise.all(
    allFilesInWorkspace.map(async (fileUri) => {
      const binaryFileContent = await vscode.workspace.fs.readFile(fileUri)
      const fileText = binaryFileContent.toString()
      if (!fileText.includes('@bread')) {
        return undefined
      }

      return {
        filePathRelativeTooWorkspace: vscode.workspace.asRelativePath(fileUri),
        content: fileText,
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
