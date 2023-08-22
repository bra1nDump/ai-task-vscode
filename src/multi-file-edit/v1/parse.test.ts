import * as assert from 'assert'
import {
  singleChangeSimplePatch,
  twoChangePatch,
  singleChangeSimplePatchPartial,
  patchWithTruncatedOldChunk,
} from './examples'
import { parsePartialMultiFileEdit } from './parse'
import {
  trimUpToOneLeadingNewLine,
  trimUpToOneTrailingNewLine,
} from '../../xml/parser'
import { getBreadIdentifier } from '../../helpers/breadIdentifier'

const breadIdentifier = getBreadIdentifier()

suite('Helper trimming functions for xml work as expected', () => {
  test('trimUpToOneLeadingNewLine function', () => {
    assert.equal(trimUpToOneLeadingNewLine('\nabc'), 'abc')
    assert.equal(trimUpToOneLeadingNewLine('\n\nabc'), '\nabc')
    assert.equal(trimUpToOneLeadingNewLine('abc'), 'abc')
  })

  test('trimUpToOneTrailingNewLine function', () => {
    assert.equal(trimUpToOneTrailingNewLine('abc\n'), 'abc')
    assert.equal(trimUpToOneTrailingNewLine('abc\n   '), 'abc')
    assert.equal(trimUpToOneTrailingNewLine('abc\n\n   '), 'abc\n')
    assert.equal(trimUpToOneTrailingNewLine('abc'), 'abc')
  })
})

suite('Can parse example patches using hand written parser', () => {
  test('Simple patch', () => {
    const patch = parsePartialMultiFileEdit(
      singleChangeSimplePatch(breadIdentifier),
    )

    // console.log(JSON.stringify(patch, null, 2));

    assert.ok(patch)
    const [fileChange] = patch.fileChanges
    assert.ok(fileChange)
    assert.ok(fileChange.filePathRelativeToWorkspace?.length ?? 0 > 0)

    const changes = fileChange.changes

    assert.equal(changes.length, 1)
    assert.ok(changes[0].newChunk.content.length)
  })

  test('Complex patch', () => {
    const patch = parsePartialMultiFileEdit(twoChangePatch(breadIdentifier))

    // console.log(JSON.stringify(patch, null, 2));

    assert.ok(patch)
    const [change1, change2] = patch.fileChanges[0].changes

    assert.equal(patch.fileChanges[0].changes.length, 2)
    assert.ok(change1.newChunk.content.length)
    assert.ok(change2.newChunk.content.length)

    assert.ok(change1.oldChunk.type === 'fullContentRange')
    assert.ok(change2.oldChunk.type === 'fullContentRange')
    assert.ok(change1.oldChunk.fullContent.length)
    assert.ok(change2.oldChunk.fullContent.length)
  })

  test('Almost empty patch', () => {
    const almostEmptyPatch = '<file><chan'
    const patch = parsePartialMultiFileEdit(almostEmptyPatch)

    assert.ok(patch)
    const changes = patch.fileChanges[0].changes

    assert.equal(changes.length, 0)
  })

  // We don't want the tag to stream in and get shown to the user
  test('Trailing tag that is not done printing yet gets dropped', () => {
    const patchWithPartialClosingTag = '<file><change><old-chunk>lol</ol'
    const patch = parsePartialMultiFileEdit(patchWithPartialClosingTag)

    assert.ok(patch)
    const changes = patch.fileChanges[0].changes

    assert.equal(changes.length, 1)
    const { oldChunk, newChunk } = changes[0]
    assert.ok(oldChunk.isStreamFinalized === false)
    assert.ok(oldChunk.type === 'fullContentRange')
    assert.ok(oldChunk.fullContent === 'lol')
  })

  test('Content is marked as finalized once it has a closing tag', () => {
    const patchWithPartialClosingTag = `<file><change><old-chunk>lol</old-chunk><new-chunk></new-chunk></chan`
    const patch = parsePartialMultiFileEdit(patchWithPartialClosingTag)

    assert.ok(patch)
    const changes = patch.fileChanges[0].changes

    assert.equal(changes.length, 1)
    const { oldChunk, newChunk } = changes[0]
    assert.ok(oldChunk.isStreamFinalized === true)
    assert.ok(newChunk.isStreamFinalized === true)
  })

  test('Partial patch', () => {
    const patch = parsePartialMultiFileEdit(
      singleChangeSimplePatchPartial(breadIdentifier),
    )

    // console.log(JSON.stringify(patch, null, 2));

    assert.ok(patch)
    const changes = patch.fileChanges[0].changes

    assert.equal(changes.length, 1)
    assert.ok(changes[0].newChunk.content.length)
  })

  test('Patch with truncated tag in old chunk', () => {
    const patch = parsePartialMultiFileEdit(
      patchWithTruncatedOldChunk(breadIdentifier),
    )

    // console.log(JSON.stringify(patch, null, 2));

    assert.ok(patch)
    const changes = patch.fileChanges[0].changes

    assert.equal(changes.length, 1)

    const { oldChunk, newChunk } = changes[0]

    // Ensure the start and end of the old chunk are present and have reasonable length
    assert.ok(oldChunk.type === 'prefixAndSuffixRange')
    assert.ok(oldChunk.prefixContent.length > 10)
    assert.ok(oldChunk.suffixContent.length > 10)

    assert.ok(newChunk.content.length)
  })
})
