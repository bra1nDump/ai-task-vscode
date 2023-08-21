import OpenAI from 'openai'
import { mapAsyncInterable, filterAsyncIterable } from 'utils/functional'
import * as vscode from 'vscode'

export type Message = OpenAI.Chat.Completions.CreateChatCompletionRequestMessage

/**
 * To avoid 4000 request per minute limit ... and a big bill ...
 */
let isStreamRunning = false

export async function* streamLlm<T>(
  messages: Message[],
  tryParsePartial: (content: string) => T | undefined,
): AsyncIterable<T> {
  let key: string | undefined =
    process.env.OPENAI_API_KEY ??
    vscode.workspace.getConfiguration('birds').get('openaiApiKey')

  if (typeof key !== 'string') {
    // Give the user a chance to enter the key
    key = await vscode.window.showInputBox({
      prompt: 'Please enter your OpenAI API key',
      ignoreFocusOut: true,
    })
  }

  if (!key) {
    throw new Error('No OpenAI API key provided')
  }

  if (isStreamRunning) {
    throw new Error('Stream is already running')
  }

  isStreamRunning = true

  const openai = new OpenAI({
    apiKey: key,
  })

  // Compare AsyncGenerators / AsyncIterators: https://javascript.info/async-iterators-generators
  // Basically openai decided to not return AsyncGenerator, which is more powerful (compare type definitions) but instead return an AsyncIteratable for stream
  const stream = await openai.chat.completions.create({
    model: process.env.OPENAI_DEFAULT_MODEL ?? 'gpt-3.5-turbo',
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

      isStreamRunning = false

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
