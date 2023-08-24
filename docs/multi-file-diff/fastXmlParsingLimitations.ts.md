```ts
/**
 * File currently unused. Keeping the code around for reference and if I want to upstream the changes to fast-xml-parser
 */

import { XMLParser } from 'fast-xml-parser'

type LlmGeneratedPatchXmlV1 = any

/**
 * Has numerous issues:
 * - Nested tags can act up
 * - Needs a patch to have stop nodes actually work with javascript code contents
 * - [Critical] No streaming support https://github.com/NaturalIntelligence/fast-xml-parser/issues/318
 */
export function parseLlmGeneratedPatchV1WithFastXmlParser(
  xml: string,
): LlmGeneratedPatchXmlV1 | undefined {
  const options = {
    ignoreAttributes: false,
    attributeNamePrefix: '',

    // Convert range-to-replace to oldChunk
    // IMPORTANT: This will change the tag names before the stopNodes are applied
    // but it still looks for the old name in the text tho ...
    // so these 2 options are incompatible unfortunately :(
    // transformTagName: (name: string) => ...

    /** Our payloads contain code and code might be xml itself or just have < and > in it
     * Do not parse it as xml
     *
     * From documentation
     * https://github.com/NaturalIntelligence/fast-xml-parser/blob/master/docs/v4/2.XMLparseOptions.md#stopnodes
     *
     * Downside of using dynamic path like *.range-to-replace:
     * Note that in practice this didn't even work at all giving error of:
     * unexpected end of replacement where < is used in the replacement
     *
     * Note that a stop node should not have same closing node in contents. Eg
     * <stop>
     * invalid </stop>
     * </stop>
     *
     * Nested stop notes are also not allowed
     *
     * <stop>
     *     <stop> invalid </stop>
     * </stop>
     */
    stopNodes: [
      'file.change.range-to-replace',
      'file.change.replacement',
    ],

    // Make sure change is always an array, even if there is only one change
    isArray: (name: string, jpath: string) => {
      if (name === 'change') {
        return true
      }
      return false
    },
  }

  /**
   * Debt (Kirill): Use zod or similar to construct the final typed patch
   */
  const jsonObj: LlmGeneratedPatchXmlV1 = new XMLParser(options).parse(xml)

  function transformKeyNamesInObject(
    obj: any,
    transform: (key: string) => string,
  ): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => transformKeyNamesInObject(item, transform))
    } else if (typeof obj === 'object' && obj !== null) {
      const newObj: any = {}
      for (const key in obj) {
        const newKey = transform(key)
        newObj[newKey] = transformKeyNamesInObject(obj[key], transform)
      }
      return newObj
    } else {
      return obj
    }
  }

  const jsonWithCamelCasingKeys = transformKeyNamesInObject(
    jsonObj,
    (key: string) => {
      // Change to plural for readability
      if (key === 'change') {
        return 'changes'
      }

      // Change to camel case
      return key.replace(/-([a-z])/g, function (g) {
        return g[1].toUpperCase()
      })
    },
  )

  return jsonWithCamelCasingKeys
}

/*
  This shit is messing it up
  const tagData = readTagExp(xmlData, i, '>')
  
            if (tagData) {
              const openTagName = tagData && tagData.tagName;
              if (openTagName === tagName && tagData.tagExp[tagData.tagExp.length-1] !== "/") {
                openTagCount++;
              }
              i=tagData.closeIndex;
            }
  
  from OrederedObjParser, readStopNodeData method
  It thinks < ... antying > needs to have a closing tag. How did this shit ever parse html lol ???
  It has scripts right!!!
  Maybe I should use scripts?
  
  So removing that case from the function solved the problem
   */

suite('Can parse example patches using fast-xml-parser library', () => {
  test('Simple patch', () => {
    const patch = parseLlmGeneratedPatchV1WithFastXmlParser(
      singleChangeSimplePatch,
    )

    // console.log(JSON.stringify(patch, null, 2));

    assert.ok(patch)
    const changes = patch.fileChangeOutput.changes

    assert.equal(changes.length, 1)
    assert.ok(changes[0].newChunk.length)
  })

  test('Complex patch', () => {
    const patch = parseLlmGeneratedPatchV1WithFastXmlParser(twoChangePatch)

    // console.log(JSON.stringify(patch, null, 2));

    assert.ok(patch)
    const [change1, change2] = patch.fileChangeOutput.changes

    assert.equal(patch.fileChangeOutput.changes.length, 2)
    assert.ok(change1.newChunk.length)
    assert.ok(change2.newChunk.length)
    assert.ok(change1.oldChunk.length)
    assert.ok(change2.oldChunk.length)
  })
})

```