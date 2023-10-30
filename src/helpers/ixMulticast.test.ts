import * as assert from 'assert'
import { multicast } from './ixMulticast'
import { from } from 'ix/asynciterable'
import { catchError, map as mapAsync } from 'ix/asynciterable/operators'

suite('Multiplex function', () => {
  test('Can multicast source to multiple consumers', async () => {
    let startIndex = 0
    const statefulSource = {
      async *[Symbol.asyncIterator]() {
        await new Promise((resolve) => setTimeout(resolve, 1_000))
        yield ++startIndex
        yield ++startIndex
        yield ++startIndex
        yield ++startIndex
      },
    }

    const multicastedSource = multicast(from(statefulSource))

    const consumerAOutput: number[] = []
    const consumerBOutput: number[] = []

    // Consumer A
    for await (const item of multicastedSource) {
      consumerAOutput.push(item)
    }

    // Consumer B
    for await (const item of multicastedSource) {
      consumerBOutput.push(item)
    }

    assert.deepEqual(consumerAOutput, [1, 2, 3, 4])
    assert.deepEqual(consumerBOutput, [1, 2, 3, 4])
  })

  test('Can multicast source to multiple consumers in parallel', async () => {
    let startIndex = 0
    const statefulSource = {
      async *[Symbol.asyncIterator]() {
        await new Promise((resolve) => setTimeout(resolve, 1_000))
        yield ++startIndex
        yield ++startIndex
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 100))
        yield ++startIndex
        yield ++startIndex
        yield ++startIndex
      },
    }

    const multicastedSource = multicast(from(statefulSource))

    const consumerAOutput: number[] = []
    const consumerBOutput: number[] = []

    // Consumer A and B in parallel
    await Promise.all([
      (async () => {
        for await (const item of multicastedSource) {
          consumerAOutput.push(item)
        }
      })(),
      (async () => {
        for await (const item of multicastedSource) {
          consumerBOutput.push(item)
        }
      })(),
    ])

    assert.deepEqual(consumerAOutput, [1, 2, 3, 4, 5])
    assert.deepEqual(consumerBOutput, [1, 2, 3, 4, 5])
  })

  test('Can pipe multicasted source through mapAsync operator and the resulting iterators can be multiplexed', async () => {
    let startIndex = 0
    const statefulSource = {
      async *[Symbol.asyncIterator]() {
        await new Promise((resolve) => setTimeout(resolve, 1_000))
        yield ++startIndex
        yield ++startIndex
        yield ++startIndex
        yield ++startIndex
      },
    }

    const multicastedSource = multicast(from(statefulSource))

    const mapAsyncOperator = (value: number) => Promise.resolve(value * 2)
    const mappedSource = multicastedSource.pipe(mapAsync(mapAsyncOperator))

    const consumerAOutput: number[] = []
    const consumerBOutput: number[] = []

    // Consumer A and B in parallel
    await Promise.all([
      (async () => {
        for await (const item of mappedSource) {
          consumerAOutput.push(item)
        }
      })(),
      (async () => {
        for await (const item of mappedSource) {
          consumerBOutput.push(item)
        }
      })(),
    ])

    assert.deepEqual(consumerAOutput, [2, 4, 6, 8])
    assert.deepEqual(consumerBOutput, [2, 4, 6, 8])
  })
})

suite('Playing around with error handling in streams', () => {
  /*
   * https://github.com/ReactiveX/IxJS/blob/master/src/asynciterable/operators/catcherror.ts
   * Gotcha: catchError from operators is actually different from the one in
   * asynciterable, and is preferable for our use case
   */
  test('Trying out catchError async iterable', async () => {
    const source = async function* () {
      yield { kind: 'value', value: 1 }
      yield { kind: 'value', value: 2 }
      throw new Error('Error')
      yield { kind: 'value', value: 4 }
    }

    const safeStream = from(source()).pipe(
      catchError((error: Error) => {
        return from([
          {
            kind: 'error',
            value: error.message,
          },
        ])
      }),
    )

    for await (const item of safeStream) {
      if (item.kind === 'error') {
        console.log(`Error: ${item.value}`)
        continue
      }
      console.log(`Next: ${item.value}`)
    }
    console.log(`Properly terminatedg`)
  })
})
