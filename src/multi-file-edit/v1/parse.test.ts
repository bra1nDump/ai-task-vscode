import * as assert from 'assert'
import { parsePartialMultiFileEdit } from './parse'
import {
  trimUpToOneLeadingNewLine,
  trimUpToOneTrailingNewLine,
} from '../../xml/parser'
import { getBreadIdentifier } from 'session'

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
    const fileChanges = `
<change>
  <path>src/hello-world.ts</path>
  <description>Parametrising function with a name of the thing to be greeted</description>
  <range-to-replace>
function helloWorld() {
    // ${breadIdentifier} pass name to be greeted
    console.log('Hello World');
}
</range-to-replace>
  <!-- The new content to replace the old content between the prefix and suffix -->
  <replacement>
function hello(name: string) {
    console.log(\`Hello \${name}\`);
}
  </replacement>
</change>
`
    const patch = parsePartialMultiFileEdit(fileChanges)

    // console.log(JSON.stringify(patch, null, 2));

    const [fileChange] = patch.changes
    assert.ok(fileChange)
    assert.ok(fileChange.filePathRelativeToWorkspace?.length ?? 0 > 0)

    assert.ok(fileChange.change)
    assert.ok(fileChange.change.newChunk.content.length)
  })

  test('Complex patch', () => {
    const fileChanges = `
<change>
  <path>src/hello-world.ts</path>
  <description>Parametrising function with a name of the thing to be greeted</description>
  <range-to-replace>
function helloWorld() {
    // ${breadIdentifier} pass name to be greeted
    console.log('Hello World');
}
</range-to-replace>
  <!-- The new content to replace the old content between the prefix and suffix -->
  <replacement>
function hello(name: string) {
    console.log(\`Hello \${name}\`);
}
  </replacement>
</change>
<change>
  <path>src/main.ts</path>
  <description>Use hello world from a helper module and use environment variable to get the user name</description>
  <range-to-replace>
// ${breadIdentifier} use hello world from a helper module and use environment variable to get the user name
  </range-to-replace>
  <replacement>
import { hello } from './helper';
const name = process.env.USER_NAME || 'World';
hello(name);
  </replacement>
</change>
`
    const patch = parsePartialMultiFileEdit(fileChanges)

    // console.log(JSON.stringify(patch, null, 2));

    assert.ok(patch)
    const [{ change: change1 }, { change: change2 }] = patch.changes

    assert.equal(patch.changes.length, 2)
    assert.ok(change1.newChunk.content.length)
    assert.ok(change2.newChunk.content.length)

    assert.ok(change1.oldChunk.type === 'fullContentRange')
    assert.ok(change2.oldChunk.type === 'fullContentRange')
    assert.ok(change1.oldChunk.fullContent.length)
    assert.ok(change2.oldChunk.fullContent.length)
  })

  test('If path is not provided fully changes are not produced', () => {
    const almostEmptyPatch = '<change><path>sr'
    const patch = parsePartialMultiFileEdit(almostEmptyPatch)

    assert.ok(patch)
    assert.equal(patch.changes.length, 0)
  })

  test('Trailing tag that is not done printing yet gets dropped', () => {
    const patchWithPartialClosingTag =
      '<change><path>dummy/path.ts</path><range-to-replace>lol</ra'
    const patch = parsePartialMultiFileEdit(patchWithPartialClosingTag)

    assert.ok(patch)
    const change = patch.changes[0].change

    assert.ok(change)
    const { oldChunk, newChunk } = change
    assert.ok(oldChunk.isStreamFinalized === false)
    assert.ok(oldChunk.type === 'fullContentRange')
    assert.ok(oldChunk.fullContent === 'lol')
  })

  test('Content is marked as finalized once it has a closing tag', () => {
    const patchWithPartialClosingTag = `<change><path>dummy/path.ts</path><range-to-replace>lol</range-to-replace><replacement></replacement></chan`
    const patch = parsePartialMultiFileEdit(patchWithPartialClosingTag)

    assert.ok(patch)
    const change = patch.changes[0].change

    assert.ok(change)
    const { oldChunk, newChunk } = change
    assert.ok(oldChunk.isStreamFinalized === true)
    assert.ok(newChunk.isStreamFinalized === true)
  })

  test('Partial replacement is parsed correctly', () => {
    const patch = parsePartialMultiFileEdit(`
<change>
  <path>src/hello-world.ts</path>
  <description>Parametrising function with a name of the thing to be greeted</description>
  <range-to-replace>
function helloWorld() {
    // ${breadIdentifier} pass name to be greeted
    console.log('Hello World');
}
</range-to-replace>
  <!-- The new content to replace the old content between the prefix and suffix -->
  <replacement>
function hello(name: string) {
    console.
`)

    // console.log(JSON.stringify(patch, null, 2));

    assert.ok(patch)
    const change = patch.changes[0].change

    assert.ok(change)
    assert.ok(change.newChunk.content.length)
  })

  test('Patch with truncated content gets parsed as having a prefix and the suffix', () => {
    const patch = parsePartialMultiFileEdit(`
<change>
  <path>src/hello-world.ts</path>
  <description>Parametrising function with a name of the thing to be greeted</description>
  <range-to-replace>
function helloWorld() {
    </truncated>
    console.log
`)

    // console.log(JSON.stringify(patch, null, 2));

    assert.ok(patch)
    const change = patch.changes[0].change

    assert.ok(change)
    const { oldChunk } = change

    /*
     * Ensure the start and end of the old chunk are present and have
     * reasonable length
     */
    assert.ok(oldChunk.type === 'prefixAndSuffixRange')
    assert.equal(oldChunk.prefixContent, 'function helloWorld() {')
    assert.equal(oldChunk.suffixContent, '    console.log')
  })
})
