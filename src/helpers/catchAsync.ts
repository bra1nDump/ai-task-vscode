import { APIError } from 'openai/error'

export type Result<Value, Error> =
  | { kind: 'success'; value: Value }
  | { kind: 'failure'; error: Error }

export function success<Value, Error>(value: Value): Result<Value, Error> {
  return { kind: 'success', value }
}

export function failure<Value, Error>(error: Error): Result<Value, Error> {
  return { kind: 'failure', error }
}

export async function promiseToResult<Value>(
  promise: Promise<Value>,
): Promise<Result<Value, APIError>> {
  try {
    const value = await promise
    return success(value)
  } catch (error) {
    return failure(error as APIError)
  }
}
