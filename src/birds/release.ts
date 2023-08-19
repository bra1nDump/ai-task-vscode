import OpenAI from 'openai'

import { allDiffV1Examples } from 'diff/v1/examples'
import { diffGeneratorPromptPrefix } from 'diff/v1/prompt'

import { workspace } from 'vscode'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

type Message = OpenAI.Chat.Completions.CreateChatCompletionRequestMessage

type FileContext = {
  filePathRelativeTooWorkspace: string
  content: string
}

/**
 * Collect all files in workspace with @bread mention
 * Pack the files along with the diff generation prompts
 * Call openai api (through langchain)
 * Parse the diffs
 * Apply them to the current file in place
 */
export async function release() {
  console.log('Releasing the birds, your bread stands no chance')

  const diffExamplesPrompt = allDiffV1Examples.join('\n\n')
  const diffPrompt = diffGeneratorPromptPrefix + '\n\n' + diffExamplesPrompt
  const divPromptSystemMessage: Message = {
    content: diffPrompt,
    role: 'system',
  }

  // Find all files in the workspace with @bread mention and create a context for each
  // Optimization: use a watcher to keep track of files with @bread mention
  const allFilesInWorkspace = await workspace.findFiles('**/*')
  const fileContexts = await Promise.all(
    allFilesInWorkspace.map(async (fileUri) => {
      const binaryFileContent = await workspace.fs.readFile(fileUri)
      const fileText = binaryFileContent.toString()
      if (!fileText.includes('@bread')) {
        return undefined
      }

      return {
        filePathRelativeTooWorkspace: workspace.asRelativePath(fileUri),
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

  // Provide all these files including their path
  const filesContextXmlPrompt = fileContexts
    .map(
      (fileContext) =>
        '<file>' +
        `  <path>${fileContext.filePathRelativeTooWorkspace}</path>` +
        `  <content>${fileContext.content}</content>` +
        '</file>',
    )
    .join('\n\n')
  const filesContextXmlPromptSystemMessage: Message = {
    content:
      'Pay special attention to @bread mentions, they shuold guide the diff generation.' +
      'Files context:' +
      filesContextXmlPrompt,
    role: 'system',
  }

  const messages: Message[] = [
    divPromptSystemMessage,
    filesContextXmlPromptSystemMessage,
    {
      content:
        'Reply only with generated diffs for the files you see fit.' +
        'As a reminder the output should be a valid xml.',
      role: 'user',
    },
  ]

  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    temperature: 0.9,
    messages,
    stream: true,
  })

  let currentContent = ''
  for await (const part of stream) {
    const delta = part.choices[0]?.delta?.content
    if (delta) {
      currentContent += delta
      process.stdout.write(delta)
    }
  }

  // We should format the message content nicely instead of simple stringify
  console.log(`Messages submitted:`)
  for (const { content, role } of messages) {
    console.log(`[${role}] ${content}`)
  }
  console.log(`Final content:\n${currentContent}`)
}
