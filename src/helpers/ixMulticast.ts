import { AsyncIterableX, from } from 'ix/asynciterable'

// const debugLog = console.log
const debugLog: typeof console.log = () => {
  /* */
}

/**
 * Use this to create a stream that can be iterated over multiple times.
 * **SEE GOTCHAS BELOW**
 *
 * POSSIBLY REIMPLEMENTED whats already available in the library. Haven't tried it https://github.com/ReactiveX/IxJS/blob/f07b7ef4095120f1ef21a4023030c75b36335cd1/src/asynciterable/operators/share.ts#L6
 *
 * Example:
 * ```typescript
 * const original = from(1, 2, 3)
 * const allowsRepeatedConsumption = multicast(original)
 *
 * const doubled = map(
 *   (x) => {
 *     console.log(`mapping ${x}`)
 *     return x * 2
 *   },
 *   allowsRepeatedConsumption
 * )
 *
 * // Will print 2, 4, 6
 * for await (const value of doubled) {
 *  console.log(value)
 * }
 *
 * // Will also print 2, 4, 6 (without multicasting this would print nothing)
 * for await (const value of doubled) {
 *   console.log(value)
 * }
 * ```
 *
 * Gotchas:
 * Caching happens at the point of multicasting, ALL OPERATIONS AFTER WILL
 * POTENTIALLY RUN MANY TIMES.
 *
 * From the example above the map function will run twice for each element in
 * the original stream. This is because the map function is called once for each
 * consumer of the stream.
 * To avoid this you can use the `share` operator from ixjs.
 */
export function multicast<T>(source: AsyncIterable<T>): AsyncIterableX<T> {
  const cache: T[] = []
  let sourceExhausted = false
  let consumers = 0
  const iterator = source[Symbol.asyncIterator]() // create a single iterator from the source

  async function* generateConsumer() {
    const consumerId = Math.floor(Math.random() * 10)
    debugLog('id: ', consumerId)
    consumers++

    debugLog('called generate consumer', consumers)

    let lastCacheIndexYielded = -1
    for (const [index, value] of cache.entries()) {
      debugLog(
        `id: ${consumerId} yielding: ${JSON.stringify(value)}, index: ${index}`,
      )
      lastCacheIndexYielded = index
      yield value
    }

    if (sourceExhausted) {
      return
    }

    while (true) {
      const result = await iterator.next() // use the shared iterator to get the next value
      debugLog(
        `id: ${consumerId} pulled an async element: ${JSON.stringify(
          result.value,
        )}, cache state: ${JSON.stringify(
          cache,
        )}, cacheIndexYielded: ${lastCacheIndexYielded}`,
      )

      // We want to place the value in the cache early
      if (!result.done) {
        const value = result.value
        cache.push(value)
        /*
         * Need to update the index of the last seen item
         * lastCacheIndexYielded++
         */

        debugLog(
          `id: ${consumerId} yielding own value: ${JSON.stringify(
            value,
          )}, cacheIndex: ${lastCacheIndexYielded}`,
        )
      }

      /*
       * While we were awaiting, some other consumer might have pushed some
       * values into cache This loop will also yeild our own element if it was
       * added in the if above
       */
      while (lastCacheIndexYielded < cache.length - 1) {
        const cacheValueToYield = cache[++lastCacheIndexYielded]
        debugLog(
          `id: ${consumerId} yielding from cache, value: ${JSON.stringify(
            cacheValueToYield,
          )}, cacheIndexYielded: ${lastCacheIndexYielded}`,
        )
        /*
         * what if after the yield another consumer might have put something in
         * the cache?
         */
        yield cacheValueToYield
      }

      if (result.done) {
        sourceExhausted = true
        break
      }

      /*
       * // Finally add our hard earned value and add to cache
       * const value = result.value
       * cache.push(value)
       * // Need to update the index of the last seen item
       * lastCacheIndexYielded++
       */

      /*
       * debugLog(
       *   `id: ${consumerId} yielding own value: ${JSON.stringify(
       *     value,
       *   )}, cacheIndex: ${lastCacheIndexYielded}`,
       * )
       * yield value
       */
    }
  }

  consumers--

  return from({
    [Symbol.asyncIterator]() {
      return generateConsumer()
    },
  })
}
