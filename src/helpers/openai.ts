import OpenAI from 'openai'

import { AsyncIterableX, from, last } from 'ix/asynciterable'
import { catchError, flatMap, map } from 'ix/asynciterable/operators'
import { multicast } from './ixMulticast'
import { throwingPromiseToResult } from './catchAsync'
import { ChatCompletionChunk } from 'openai/resources/chat'
import { Result, resultError, resultSuccess } from './result'
import { Stream } from 'openai/streaming'
import { APIError } from 'openai/error'

export type OpenAiMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam

export interface OpenAIStreamChunk {
  type: 'chunk'
  cumulativeResponse: string
  delta: string
}

export interface OpenAIStreamEndedNormally {
  type: 'streamEndedNormally'
}

export interface OpenAIStreamEndedAbonormally {
  type: 'streamEndedAbonormally'
  endReason: 'tokenLimitReached' | 'emptyDelta' | 'errorDuringStream'
  errorMessageForUser?: string
}

export type OpenAIStreamItem =
  | OpenAIStreamChunk
  | OpenAIStreamEndedNormally
  | OpenAIStreamEndedAbonormally

export interface OpenAIStreamCreationError {
  kind:
    | 'invalid_api_key'
    | 'insufficient_quota'
    | 'invalid_request_error'
    | 'context_length_exceeded'
    | 'unknown'
  messageForUser: string
}

type Credentials =
  | { type: 'openai'; key: string }
  | { type: 'helicone'; key: string }

export function makeOpenAiInstance(
  credentials: Credentials,
  userIdentifierForLoggingAndAbuseDetection: string,
): OpenAI {
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
  return openai
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
  openai: OpenAI,
): Promise<
  Result<
    [AsyncIterableX<OpenAIStreamItem>, AbortController],
    OpenAIStreamCreationError
  >
> {
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

    let llmError: OpenAIStreamCreationError
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
      case 'context_length_exceeded':
        llmError = {
          kind: 'context_length_exceeded',
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
    flatMap((part: ChatCompletionChunk): OpenAIStreamItem[] => {
      if (part.choices[0]?.finish_reason) {
        /*
         * We are done
         * Refactor: Update the return type to represent different kinds of
         * stream terminations.
         */
        console.log(part.choices[0]?.finish_reason)
        if (part.choices[0]?.finish_reason === 'length') {
          const message = `Token limit reached for this request, try again with less context or a task that requires less tokens in the response`
          console.error(message)
          return [
            {
              type: 'streamEndedAbonormally',
              endReason: 'tokenLimitReached',
              errorMessageForUser: message,
            },
          ]
        } else {
          return [
            {
              type: 'streamEndedNormally',
            },
          ]
        }
      }

      // Refactor: These details should have stayed in openai.ts
      const delta = part.choices[0]?.delta?.content
      if (!delta) {
        // It seems the first delta is always empty, ignore it
        return []
      }

      currentContent += delta
      return [
        {
          type: 'chunk',
          cumulativeResponse: currentContent,
          delta,
        },
      ]
    }),
    map((item: OpenAIStreamItem): OpenAIStreamItem => {
      /*
       * Gotcha:
       * Due to multicast and iterating over the stream multiple times all
       * the mappings are performed however many times there are for await
       * loops.
       *
       * Thus logging happens before multicasting.
       *
       * This is
       * 1. not performant
       * 2. breaks stateful things like logging
       */
      if (item.type === 'chunk') {
        void logger(item.delta)
      }
      return item
    }),
    catchError((error: any): AsyncIterableX<OpenAIStreamEndedAbonormally> => {
      console.error(error)
      let message = 'Unknown error occurred'
      if (error instanceof Error) {
        message = error.message
      }

      return from([
        {
          type: 'streamEndedAbonormally',
          endReason: 'errorDuringStream',
          errorMessageForUser: message,
        },
      ])
    }),
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

  return resultSuccess([multicastStream, stream.controller])
}
