import OpenAI from 'openai'
import * as vscode from 'vscode'

import { AsyncIterableX, from, last } from 'ix/asynciterable'
import { filter, map as mapAsync } from 'ix/asynciterable/operators'
import { multicast } from './ix-multicast'

export type OpenAiMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam

let isStreamRunning = false

export interface LlmPartialResponse {
  cumulativeResponse: string
  delta: string
}

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
export async function streamLlm(
  messages: OpenAiMessage[],
  logger: (text: string) => Promise<void>,
): Promise<[AsyncIterableX<LlmPartialResponse>, AbortController]> {
  // Ensure the key is provided
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

  // Ensure we are not already running a stream,
  // we want to avoid large bills if there's a bug and we start too many streams at once
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

  let currentContent = ''
  const simplifiedStream = from(stream).pipe(
    mapAsync((part) => {
      // Refactor: These details should have stayed in openai.ts
      const delta = part.choices[0]?.delta?.content
      if (!delta) return undefined
      currentContent += delta
      return {
        cumulativeResponse: currentContent,
        delta,
      }
    }),
    filter((part): part is LlmPartialResponse => !!part),
  )

  // Multiplex the stream
  const multicastStream = multicast(simplifiedStream)

  void logger(`\n# Messages submitted:\n`)
  for (const { content, role } of messages)
    void logger(`\n## [${role}]:\n\`\`\`md\n${content}\`\`\`\n`)
  void logger(`\n# [assistant, latest response]:\n\`\`\`md\n`)

  // Detect end of stream and free up the llm resource
  void last(multicastStream)
    .catch((error: Error) => {
      console.error(error)
      void logger(
        `\n# [error occurred in stream]:\n\`\`\`md\n${
          error as unknown as any
        }\`\`\`\n`,
      )
      return undefined
    })
    .then(() => {
      isStreamRunning = false
    })

  return [multicastStream, stream.controller]
}
