import OpenAI from 'openai'
import * as vscode from 'vscode'

import { AsyncIterableX, from, last } from 'ix/asynciterable'
import { filter, map as mapAsync } from 'ix/asynciterable/operators'
import { multicast } from './ixMulticast'
import { throwingPromiseToResult } from './catchAsync'
import { ChatCompletionChunk } from 'openai/resources/chat'
import { Result, resultError, resultSuccess } from './result'
import { SessionContext } from 'session'
import { undefinedIfStringEmpty } from './optional'
import { Stream } from 'openai/streaming'
import { APIError } from 'openai/error'
import { hell } from './constants'
import { taskAppendAnswerToOutput } from 'notebook/taskAppendAnswerToOutput'

export type OpenAiMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam

let isStreamRunning = false

export interface LlmPartialResponse {
  cumulativeResponse: string
  delta: string
}

/**
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
  /*
   * I don't need the logger if I will be passing the entire session,
   * Probably the session itself should contain the logger as a property /
   * method
   */
  logger: (text: string) => Promise<void>,
  session: SessionContext,
): Promise<
  Result<[AsyncIterableX<LlmPartialResponse>, AbortController], Error>
> {
  // Ensure the key is provided
  const key: string | undefined =
    process.env.OPENAI_API_KEY ??
    undefinedIfStringEmpty(
      vscode.workspace.getConfiguration('ai-task').get('openaiApiKey'),
    ) ??
    undefinedIfStringEmpty(
      await session.extensionContext.secrets.get('openaiApiKey'),
    )
  /*
   * Stop collecting the key from the user during beta
   * if (typeof key !== 'string' || key.length === 0) {
   *   // Give the user a chance to enter the key
   *   key = await vscode.window.showInputBox({
   *     prompt: 'Please enter your OpenAI API key',
   *     ignoreFocusOut: true,
   *   })
   *   if (key) {
   *     await session.extensionContext.secrets.store('openaiApiKey', key)
   *   }
   * }
   */

  /*
   * Ensure we are not already running a stream,
   * we want to avoid large bills if there's a bug and we start too many
   * streams at once
   */
  if (isStreamRunning) {
    return resultError(new Error('Stream is already running'))
  }
  isStreamRunning = true

  // If key is found, use the official API, otherwise use the proxy
  const openai =
    key === undefined
      ? new OpenAI({
          apiKey: `sk-helicone-proxy-${hell}`,
          baseURL: 'https://oai.hconeai.com/v1',

          defaultHeaders: {
            /*
             * Analytics, this header is kind of redundant but is still needed
             * to have requests logged in the dashboard, discouraging simple
             * scraping, this key is not important though
             */
            'Helicone-Auth':
              `Bearer ` +
              `s` +
              `k` +
              '-helicone' +
              '-nw' +
              '5' +
              'a' +
              '63' +
              'y' +
              '-333' +
              'utiq' +
              '-qs' +
              '62' +
              'fma' +
              '-grnofmi',

            'Helicone-User-Id': session.userId,
            // Do not store user's data
            'Helicone-Omit-Request': 'true',
            'Helicone-Omit-Response': 'true',
          },
        })
      : new OpenAI({
          apiKey: key,
          baseURL: 'https://api.openai.com/v1',
        })

  /*
   * Compare AsyncGenerators / AsyncIterators: https://javascript.info/async-iterators-generators
   * Basically openai decided to not return AsyncGenerator,
   * which is more powerful (compare type definitions) but instead return an
   * AsyncIteratable for stream
   */
  const streamResult = await throwingPromiseToResult<
    Stream<ChatCompletionChunk>,
    APIError
  >(
    openai.chat.completions.create({
      model: process.env.OPENAI_DEFAULT_MODEL ?? 'gpt-4',
      temperature: 0.4,
      messages,
      stream: true,
    }),
  )

  if (streamResult.type === 'error') {
    console.log(JSON.stringify(streamResult.error, null, 2))
    isStreamRunning = false
    session.sessionEndedEventEmitter.fire()
    return resultError(new Error(streamResult.error.message))
  }
  const stream = streamResult.value

  let currentContent = ''
  const simplifiedStream = from(stream).pipe(
    mapAsync((part: ChatCompletionChunk) => {
      if (part.choices[0]?.finish_reason) {
        /*
         * We are done
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

      /*
       * Design Shortcoming: Async iterable multi casting
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

  // Multiplex the stream, so that we can iterate over it multiple times
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
        `\n# [error occurred in stream]:\n\`\`\`md\n${
          error as unknown as any
        }\`\`\`\n`,
      )
      return undefined
    })
    .then(() => {
      isStreamRunning = false
    })

  return resultSuccess([multicastStream, stream.controller])
}

export async function getAnswer(
  question: string,
  execution: vscode.NotebookCellExecution,
) {
  const key: string | undefined =
    process.env.OPENAI_API_KEY ??
    undefinedIfStringEmpty(
      vscode.workspace.getConfiguration('ai-task').get('openaiApiKey'),
    )

  const openai =
    key === undefined
      ? new OpenAI({
          apiKey: `sk-helicone-proxy-${hell}`,
          baseURL: 'https://oai.hconeai.com/v1',

          defaultHeaders: {
            /*
             * Analytics, this header is kind of redundant but is still needed
             * to have requests logged in the dashboard, discouraging simple
             * scraping, this key is not important though
             */
            'Helicone-Auth':
              `Bearer ` +
              `s` +
              `k` +
              '-helicone' +
              '-nw' +
              '5' +
              'a' +
              '63' +
              'y' +
              '-333' +
              'utiq' +
              '-qs' +
              '62' +
              'fma' +
              '-grnofmi',

            'Helicone-User-Id': '1111',
            // Do not store user's data
            'Helicone-Omit-Request': 'true',
            'Helicone-Omit-Response': 'true',
          },
        })
      : new OpenAI({
          apiKey: key,
          baseURL: 'https://api.openai.com/v1',
        })

  if (execution.token.isCancellationRequested) {
    return
  }

  const stream = await openai.chat.completions.create({
    model: process.env.OPENAI_DEFAULT_MODEL ?? 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant.',
      },
      {
        role: 'user',
        content: question,
      },
    ],
    stream: true,
  })

  let result = ''
  for await (const response of stream) {
    if (execution.token.isCancellationRequested) {
      return
    }
    const delta = response.choices[0]?.delta?.content
    result += delta
    if (delta) {
      taskAppendAnswerToOutput(execution, result)
    }
  }
}
