import * as assert from 'assert'
import { parsePartialMultiFileEdit } from './parse'
import {
  trimUpToOneLeadingNewLine,
  trimUpToOneTrailingNewLine,
} from '../../xml/parser'
import { getBreadIdentifier } from '../../helpers/bread-identifier'

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

    const changes = fileChange.changes

    assert.equal(changes.length, 1)
    assert.ok(changes[0].newChunk.content.length)
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
    const [
      {
        changes: [change1],
      },
      {
        changes: [change2],
      },
    ] = patch.changes

    assert.equal(patch.changes.length, 2)
    assert.ok(change1.newChunk.content.length)
    assert.ok(change2.newChunk.content.length)

    assert.ok(change1.oldChunk.type === 'fullContentRange')
    assert.ok(change2.oldChunk.type === 'fullContentRange')
    assert.ok(change1.oldChunk.fullContent.length)
    assert.ok(change2.oldChunk.fullContent.length)
  })

  test('Almost empty patch', () => {
    const almostEmptyPatch = '<change><r'
    const patch = parsePartialMultiFileEdit(almostEmptyPatch)

    assert.ok(patch)
    const changes = patch.changes[0].changes

    assert.equal(changes[0].description.length, 0)
  })

  // We don't want the tag to stream in and get shown to the user
  test('Trailing tag that is not done printing yet gets dropped', () => {
    const patchWithPartialClosingTag = '<change><range-to-replace>lol</ra'
    const patch = parsePartialMultiFileEdit(patchWithPartialClosingTag)

    assert.ok(patch)
    const changes = patch.changes[0].changes

    assert.equal(changes.length, 1)
    const { oldChunk, newChunk } = changes[0]
    assert.ok(oldChunk.isStreamFinalized === false)
    assert.ok(oldChunk.type === 'fullContentRange')
    assert.ok(oldChunk.fullContent === 'lol')
  })

  test('Content is marked as finalized once it has a closing tag', () => {
    const patchWithPartialClosingTag = `<file><change><range-to-replace>lol</range-to-replace><replacement></replacement></chan`
    const patch = parsePartialMultiFileEdit(patchWithPartialClosingTag)

    assert.ok(patch)
    const changes = patch.changes[0].changes

    assert.equal(changes.length, 1)
    const { oldChunk, newChunk } = changes[0]
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
    const changes = patch.changes[0].changes

    assert.equal(changes.length, 1)
    assert.ok(changes[0].newChunk.content.length)
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
    const changes = patch.changes[0].changes

    assert.equal(changes.length, 1)

    const { oldChunk, newChunk } = changes[0]

    // Ensure the start and end of the old chunk are present and have reasonable length
    assert.ok(oldChunk.type === 'prefixAndSuffixRange')
    assert.equal(oldChunk.prefixContent, 'function helloWorld() {')
    assert.equal(oldChunk.suffixContent, '    console.log')
  })
})

suite('Can parse plan items correctly', () => {
  test('Completed plan', () => {
    const payload = `- Plan item one\n- Item two`
    const patch = parsePartialMultiFileEdit(payload)
    assert.ok(patch)
    assert.equal(patch.plan.length, 2)
    assert.equal(patch.plan[0], 'Plan item one')
    assert.equal(patch.plan[1], 'Item two')
  })

  test('Plan that is still being generated', () => {
    const payload = `- Plan item one\n- Item two\n- `
    const patch = parsePartialMultiFileEdit(payload)
    assert.ok(patch)
    assert.equal(patch.plan.length, 3)
    assert.equal(patch.plan[0], 'Plan item one')
    assert.equal(patch.plan[1], 'Item two')
    assert.equal(patch.plan[2], '')
  })

  test('Plan with some preamble before the plan points', () => {
    const payload = `Plan is next:\n- Plan item one`
    const patch = parsePartialMultiFileEdit(payload)
    assert.ok(patch)
    assert.equal(patch.plan.length, 1)
    assert.equal(patch.plan[0], 'Plan item one')
  })
})
