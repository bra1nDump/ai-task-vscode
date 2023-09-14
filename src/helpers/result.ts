export type Result<Value, Error> =
  | { type: 'success'; value: Value }
  | { type: 'error'; error: Error }

export function resultMap<Value, NewValue, Error>(
  f: (value: Value) => NewValue,
  result: Result<Value, Error>,
): Result<NewValue, Error> {
  if (result.type === 'success') {
    return { type: 'success', value: f(result.value) }
  } else {
    return result
  }
}
