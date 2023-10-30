import OpenAI from 'openai'

import { AsyncIterableX, from, last } from 'ix/asynciterable'
import { filter, map as mapAsync } from 'ix/asynciterable/operators'
import { multicast } from './ixMulticast'
import { throwingPromiseToResult } from './catchAsync'
import { ChatCompletionChunk } from 'openai/resources/chat'
import { Result, resultError, resultSuccess } from './result'
import { Stream } from 'openai/streaming'
import { APIError } from 'openai/error'

export type OpenAiMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam

export interface LlmPartialResponse {
  cumulativeResponse: string
  delta: string
}

export interface LlmError {
  kind:
    | 'invalid_api_key'
    | 'insufficient_quota'
    | 'invalid_request_error'
    | 'token_count_limit_reached'
    | 'unknown'
  messageForUser: string
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
  userIdentifierForLoggingAndAbuseDetection: string,
  credentials:
    | { type: 'openai'; key: string }
    | { type: 'helicone'; key: string },
): Promise<
  Result<[AsyncIterableX<LlmPartialResponse>, AbortController], LlmError>
> {
  // If key is found, use the official API, otherwise use the proxy
  let openai: OpenAI
  switch (credentials.type) {
    case 'openai':
      openai = new OpenAI({
        apiKey: credentials.key,
        baseURL: 'https://api.openai.com/v1',
      })
      break
    case 'helicone':
      openai = new OpenAI({
        apiKey: credentials.key,
        baseURL: 'https://oai.hconeai.com/v1',
        defaultHeaders: {
          'Helicone-User-Id': userIdentifierForLoggingAndAbuseDetection,
          // Do not store user's data
          'Helicone-Omit-Request': 'true',
          'Helicone-Omit-Response': 'true',
        },
      })
      break
    default:
      throw new Error('Invalid credential type')
  }

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
      model: 'gpt-4',
      temperature: 0.4,
      messages,
      stream: true,
      user: userIdentifierForLoggingAndAbuseDetection,
    }),
  )

  /**
   * Check for known errors invalid_api_key, spending limit..., token count...,
   * other Move termination of the session outside of this function
   *
   * Other scenarios to test: Disable network midway through the stream
   *
   * Once the request fails promt the user to enter their own key - have a
   * command for this Maybe add a button after certain error message types?
   * We should classify the error type here
   *
   * MAKE SURE NOT TO FORGET: session.sessionEndedEventEmitter.fire()
   */
  if (streamResult.type === 'error') {
    const error = streamResult.error
    console.log(JSON.stringify(error, null, 2))

    let llmError: LlmError
    switch (error.code) {
      case 'invalid_api_key':
        llmError = {
          kind: 'invalid_api_key',
          messageForUser: error.message,
        }
        break
      case 'insufficient_quota':
        llmError = {
          kind: 'insufficient_quota',
          messageForUser: error.message,
        }
        break
      case 'invalid_request_error':
        llmError = {
          kind: 'invalid_request_error',
          messageForUser: error.message,
        }
        break
      case 'token_count_limit_reached':
        llmError = {
          kind: 'token_count_limit_reached',
          messageForUser: error.message,
        }
        break
      default:
        llmError = {
          kind: 'unknown',
          messageForUser: error.message,
        }
        break
    }
    return resultError(llmError)
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
  void last(multicastStream).catch((error: Error) => {
    console.error(error)
    void logger(
      `\n# [error occurred in stream]:\n\`\`\`md\n${
        error as unknown as any
      }\`\`\`\n`,
    )
    return undefined
  })
  /*
   * .then(() => {
   *   isStreamRunning = false
   * })
   */

  return resultSuccess([multicastStream, stream.controller])
}
