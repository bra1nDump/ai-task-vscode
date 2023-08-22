/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/ban-types */

/// NOTE: Pull vs Push explained. function* is a pull system where as rxjs is a push system
// I don't think we need to use rxjs for this use case, but it's good to know the difference
// https://rxjs.dev/guide/observable
//
// Compare AsyncGenerators / AsyncIterators: https://javascript.info/async-iterators-generators
// Basically openai decided to not return AsyncGenerator but instead return an AsyncIterator for stream for some reason
// AsyncIterable is created by adding a Symbol.asyncIterator method to an object or
// creating a function* and yielding values from it.

/**
 * Example usage:
 * ```
 * async function* numbers() {
 *   for (let i = 0; i < 10; i++) {
 *     yield i
 *   }
 * }
 *
 * for await (const value of mapAsyncInterable(numbers(), (x) => x * 2)) {
 *   console.log(value)
 * }
 * ```
 */
export async function* mapAsyncInterable<T, U>(
  fn: (value: T | undefined) => U,
  iter: AsyncIterable<T>,
): AsyncGenerator<U> {
  // Not using for await of because we want to be keep track of the done flag
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const iterator: AsyncIterator<T, undefined> = iter[Symbol.asyncIterator]()
  while (true) {
    const { value, done } = await iterator.next()
    const mappedValue = fn(value)
    yield mappedValue
    if (done) {
      break
    }
  }
}

// export function curriedMapAsyncInterable<T, U>(
//   fn: (value: T, isLast: boolean) => U,
// ): (iter: AsyncIterable<T>) => AsyncIterable<U> {
//   return (iter) => mapAsyncInterable(fn, iter)
// }

/**
 * Example usage:
 * ```
 * filterAsyncIterable(iterable, (x) x is SomeType => x !== undefined)
 * ```
 * Note: stole typing by going to definition of [].filter
 */
export async function* filterAsyncIterable<T, S extends T>(
  fn: (value: T) => value is S,
  iter: AsyncIterable<T>,
): AsyncIterable<S> {
  for await (const value of iter) {
    if (fn(value)) {
      yield value
    }
  }
}

// export function curriedFilterAsyncIterable<T>(
//   fn: (value: T) => boolean,
// ): (iter: AsyncIterable<T>) => AsyncIterable<T> {
//   return (iter) => filterAsyncIterable(fn, iter)
// }

/// COPIED OVER FROM https://stackoverflow.com/a/74132945/5278310

type AnyFunc = (...args: any[]) => any

// Create a type signature for a curried function:
// e.g. Curry<(a:string,b:number)=>string> -> (a:string)=>(b:string)=>string
type Curry<Fn extends AnyFunc> = Parameters<Fn> extends [
  infer FirstArg,
  ...infer Rest,
]
  ? (arg: FirstArg) => Curry<(...args: Rest) => ReturnType<Fn>>
  : ReturnType<Fn>

export function curry<T extends AnyFunc, TAgg extends unknown[]>(
  func: T,
  agg?: TAgg,
): Curry<T> {
  const aggregatedArgs = agg ?? []
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  if (func.length === aggregatedArgs.length) return func(...aggregatedArgs)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return ((arg: any) => curry(func, [...aggregatedArgs, arg])) as any
}

// I went over my head with this one lol. Will attempt later
// ... actually I think the simple version looks better with intermediate const bindings
// Still would be nice to figure it out ... write an article about it?
//   I think the problem is with function* - they might need to be curried differently?
//
// yield* pipe(
//   stream,
//   curriedMapAsyncInterable((part, isLast) => {
//     const delta = part.choices[0]?.delta?.content
//     if (!delta) {
//       console.log(`No delta found in part: ${JSON.stringify(part)}`)
//       return undefined
//     }

//     currentContent += delta
//     process.stdout.write(delta)

//     if (isLast) {
//       // We should format the message content nicely instead of simple stringify
//       console.log(`Messages submitted:`)
//       for (const { content, role } of messages) {
//         console.log(`[${role}] ${content}`)
//       }
//       console.log(`Final content:\n${currentContent}`)
//     }

//     // Try parsing the xml, even if it's complete it should still be able to apply the diffs
//     return parseLlmGeneratedPatchV1WithHandWrittenParser(currentContent)
//   }),
//   curriedFilterAsyncIterable(
//     (x): x is NonNullable<typeof x> => x !== undefined,
//   ),
// )
