import { APIError } from 'openai/error'
import { Result, resultSuccess, resultError } from './result'

export async function promiseToResult<Value>(
  promise: Promise<Value>,
): Promise<Result<Value, APIError>> {
  try {
    const value = await promise
    return resultSuccess(value)
  } catch (error) {
    return resultError(error as APIError)
  }
}
