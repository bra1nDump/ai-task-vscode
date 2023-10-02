import { AsyncIterableX, from } from 'ix/asynciterable'

// const debugLog = console.log
const debugLog: typeof console.log = () => {
  /* */
}

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

/*
 *Debugging ....
 *Multiplex function
 *id:  5
 *called generate consumer 0
 *id:  0
 *called generate consumer 1
 *
 *id: 5 pulled an async element: 1, cache state: [], cacheIndexYielded: -1
 *id: 5 yielding own value: 1, cacheIndex: 0
 *id: 0 pulled an async element: 2, cache state: [1], cacheIndexYielded: -1
 *id: 0 yielding from cache, value: 1, cacheIndexYielded: 0
 * id: 5 pulled an async element: undefined, cache state: [1],
 * cacheIndexYielded: 0 id: 0 yielding own value: 2, cacheIndex: 1
 * id: 0 pulled an async element: undefined, cache state: [1,2],
 * cacheIndexYielded: 1
 *
 *(1) [1]
 *(2) [1, 2]
 */
