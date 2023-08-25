import OpenAI from 'openai'
import * as vscode from 'vscode'

import { AsyncIterableX, from } from 'ix/asynciterable'
import {
  filter as filterAsync,
  map as mapAsync,
} from 'ix/asynciterable/operators'
import { multicast } from './ix-multicast'

export type OpenAiMessage =
  OpenAI.Chat.Completions.CreateChatCompletionRequestMessage

/**
 * To avoid 4000 request per minute limit like bug ... and a big bill ...
 */
let isStreamRunning = false

/**
 * Refactoring:
 * - Parsing has no business in this function, but heh, its fine
 * - Error handling
 *
 * Returns AsyncIterableX to support nifty features like mapping.
 *
 * IMPORTANT: The iterable returned is multiplexed, meaning every time you get an iterator
 * usually using await for of loop, it will start iterating from the very beginning.
 *
 * This is a desired behavior, since oftentimes we want to run different stateful operations on the stream.
 * This is similar to an observer / listener model of RxJS, accept we can use await for loops :D
 *
 * The reason why the LLM stream is multiplexed is because is the stream that kicks off most of the processes.
 */
export async function streamLlm<T>(
  messages: OpenAiMessage[],
  tryParsePartial: (content: string) => T | undefined,
  logger: (string: string) => void = console.log,
): Promise<AsyncIterableX<T>> {
  let key: string | undefined =
    process.env.OPENAI_API_KEY ??
    vscode.workspace.getConfiguration('birds').get('openaiApiKey')
  if (typeof key !== 'string')
    // Give the user a chance to enter the key
    key = await vscode.window.showInputBox({
      prompt: 'Please enter your OpenAI API key',
      ignoreFocusOut: true,
    })
  if (!key) throw new Error('No OpenAI API key provided')

  if (isStreamRunning) throw new Error('Stream is already running')
  isStreamRunning = true

  const openai = new OpenAI({
    apiKey: key,
  })

  // Compare AsyncGenerators / AsyncIterators: https://javascript.info/async-iterators-generators
  // Basically openai decided to not return AsyncGenerator, which is more powerful (compare type definitions) but instead return an AsyncIteratable for stream
  const stream = await openai.chat.completions.create({
    model: process.env.OPENAI_DEFAULT_MODEL ?? 'gpt-4',
    temperature: 0.4,
    messages,
    stream: true,
  })

  // console.log(`Part is undefined, isLast: `, isLast)
  // We should format the message content nicely instead of simple stringify
  logger(`Messages submitted:`)
  for (const { content, role } of messages) logger(`\n[${role}]\n${content}`)

  // Maybe we should move decoding up a level?
  let currentContent = ''
  const parsedPatchStream = from(stream).pipe(
    mapAsync((part) => {
      // If the part is undefined, it means the stream is done
      if (!part) {
        isStreamRunning = false

        return undefined
      }

      const delta = part.choices[0]?.delta?.content
      if (!delta) return undefined

      logger(`${delta}`)

      currentContent += delta
      process.stdout.write(delta)

      // Try parsing the xml, even if it's complete it should still be able to apply the diffs
      return tryParsePartial(currentContent)
    }),
    filterAsync((x): x is T => x !== undefined),
  )

  /**
   * This is important! See the docstring
   */
  const multicastStream = multicast(parsedPatchStream)

  return multicastStream
}
