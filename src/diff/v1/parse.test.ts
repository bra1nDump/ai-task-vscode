import * as assert from 'assert'
import {
  singleChangeSimplePatch,
  twoChangePatch,
  singleChangeSimplePatchPartial,
  patchWithTruncatedOldChunk,
} from './examples'
import { parseLlmGeneratedPatchV1WithHandWrittenParser } from './parse'

suite('Can parse example patches using hand written parser', () => {
  test('Simple patch', () => {
    const patch = parseLlmGeneratedPatchV1WithHandWrittenParser(
      singleChangeSimplePatch,
    )

    // console.log(JSON.stringify(patch, null, 2));

    assert.ok(patch)
    const changes = patch.fileChangeOutput.changes

    assert.equal(changes.length, 1)
    assert.ok(changes[0].newChunk.length)
  })

  test('Complex patch', () => {
    const patch = parseLlmGeneratedPatchV1WithHandWrittenParser(twoChangePatch)

    // console.log(JSON.stringify(patch, null, 2));

    assert.ok(patch)
    const [change1, change2] = patch.fileChangeOutput.changes

    assert.equal(patch.fileChangeOutput.changes.length, 2)
    assert.ok(change1.newChunk.length)
    assert.ok(change2.newChunk.length)

    assert.ok(change1.oldChunk.type === 'fullContentRange')
    assert.ok(change2.oldChunk.type === 'fullContentRange')
    assert.ok(change1.oldChunk.fullContent.length)
    assert.ok(change2.oldChunk.fullContent.length)
  })

  test('Partial patch', () => {
    const patch = parseLlmGeneratedPatchV1WithHandWrittenParser(
      singleChangeSimplePatchPartial,
    )

    // console.log(JSON.stringify(patch, null, 2));

    assert.ok(patch)
    const changes = patch.fileChangeOutput.changes

    assert.equal(changes.length, 1)
    assert.ok(changes[0].newChunk.length)
  })

  test('Patch with truncated tag in old chunk', () => {
    const patch = parseLlmGeneratedPatchV1WithHandWrittenParser(
      patchWithTruncatedOldChunk,
    )

    // console.log(JSON.stringify(patch, null, 2));

    assert.ok(patch)
    const changes = patch.fileChangeOutput.changes

    assert.equal(changes.length, 1)

    const { oldChunk, newChunk } = changes[0]

    // Ensure the start and end of the old chunk are present and have reasonable length
    assert.ok(oldChunk.type === 'prefixAndSuffixRange')
    assert.ok(oldChunk.prefixContent.length > 10)
    assert.ok(oldChunk.suffixContent.length > 10)

    assert.ok(newChunk.length)
  })
})
