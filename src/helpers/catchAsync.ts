import { Result, resultSuccess, resultError } from './result'

export async function throwingPromiseToResult<Value, Error>(
  promise: Thenable<Value>,
): Promise<Result<Value, Error>> {
  try {
    const value = await promise
    return resultSuccess(value)
  } catch (error) {
    return resultError(error as Error)
  }
}
