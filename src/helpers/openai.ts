import OpenAI from 'openai'
import * as vscode from 'vscode'

import { AsyncIterableX, from, last } from 'ix/asynciterable'
import { filter, map as mapAsync } from 'ix/asynciterable/operators'
import { multicast } from './ix-multicast'
import { promiseToResult } from './catchAsync'
import { ChatCompletionChunk } from 'openai/resources/chat'
import { Result, error, success } from './result'

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
 * IMPORTANT: The iterable returned is multiplexed, meaning every time you get
 * an iterator usually using await for of loop, it will start iterating from
 * the very beginning.
 *
 * This is a desired behavior, since oftentimes we want to run different
 * stateful operations on the stream. This is similar to an observer / listener
 * model of RxJS, accept we can use await for loops :D
 *
 * The reason why the LLM stream is multiplexed is because is the stream that
 * kicks off most of the processes.
 */
export async function streamLlm(
  messages: OpenAiMessage[],
  logger: (text: string) => Promise<void>,
): Promise<
  Result<[AsyncIterableX<LlmPartialResponse>, AbortController], Error>
> {
  // Ensure the key is provided
  let key: string | undefined =
    process.env.OPENAI_API_KEY ??
    vscode.workspace.getConfiguration('ai-task').get('openaiApiKey')
  if (typeof key !== 'string') {
    // Give the user a chance to enter the key
    key = await vscode.window.showInputBox({
      prompt: 'Please enter your OpenAI API key',
      ignoreFocusOut: true,
    })
  }
  if (!key) {
    return error(new Error('No OpenAI API key provided'))
  }

  /* Ensure we are not already running a stream,
     we want to avoid large bills if there's a bug and we start too many
     streams at once */
  if (isStreamRunning) {
    return error(new Error('Stream is already running'))
  }
  isStreamRunning = true

  const openai = new OpenAI({
    apiKey: key,
  })

  /* Compare AsyncGenerators / AsyncIterators: https://javascript.info/async-iterators-generators
     Basically openai decided to not return AsyncGenerator,
     which is more powerful (compare type definitions) but instead return an
     AsyncIteratable for stream */
  const streamResult = await promiseToResult(
    openai.chat.completions.create({
      model: process.env.OPENAI_DEFAULT_MODEL ?? 'gpt-4',
      temperature: 0.7,
      messages,
      stream: true,
    }),
  )

  if (streamResult.kind === 'failure') {
    console.log(JSON.stringify(streamResult.error, null, 2))
    isStreamRunning = false
    return error(new Error(streamResult.error.message))
  }
  const stream = streamResult.value

  let currentContent = ''
  const simplifiedStream = from(stream).pipe(
    mapAsync((part: ChatCompletionChunk) => {
      if (part.choices[0]?.finish_reason) {
        /* We are done
         * Refactor: Update the return type to represent different kinds of
         * stream terminations.
         */
        console.log(part.choices[0]?.finish_reason)
      }

      // Refactor: These details should have stayed in openai.ts
      const delta = part.choices[0]?.delta?.content
      if (!delta) {
        return undefined
      }

      /* Design Shortcoming: Async iterable multi casting
       * Due to multiplexing and iterating over the stream multiple times all
       * the mappings are performed however many times there are for await
       * loops This is 1. not performant 2.
       * breaks stateful things like logging A potential solution is to
       * multiplex the stream only after basic mapping is done But it is also
       * nice to multiplex the stream early to for example catch errors and
       * detect stream ending For now I will simply log the delta here
       */
      void logger(delta)

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
  for (const { content, role } of messages) {
    void logger(`\n## [${role}]:\n\`\`\`md\n${content}\n\`\`\`\n`)
  }
  void logger(`\n# [assistant, latest response]:\n\`\`\`md\n`)

  // Detect end of stream and free up the llm resource
  void last(multicastStream)
    .catch((error: Error) => {
      console.error(error)
      void logger(
        `\n# [error occurred in stream]:\n\`\`\`md\n${error as unknown as any
        }\`\`\`\n`,
      )
      return undefined
    })
    .then(() => {
      isStreamRunning = false
    })

  return success([multicastStream, stream.controller])
}
