import {
  extractXmlElementsForTag,
  extractSingleXmlElement,
  trimUpToOneTrailingNewLine,
  trimUpToOneLeadingNewLine,
} from 'xml/parser'
import { TargetRange, LlmGeneratedPatchXmlV1, FileChange } from './types'

/*
<thoughts>
{{Thoughts in free form}}
</thoughts>

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
*/
export function parsePartialMultiFileEdit(xml: string): LlmGeneratedPatchXmlV1 {
  // Plan is encoded using - as a bullet point for each item
  // Extract the plan before the first change tag
  const planItems: string[] = []
  const [planSection] = xml.split('<change>')
  // Extract plan items using regex,
  // account for first item being in the beginning of the string or on a new line
  const planItemsRegex = /(?:^|\n)- (.*)/g
  let match: RegExpExecArray | null
  while ((match = planItemsRegex.exec(planSection)) !== null)
    planItems.push(match[1])

  const fileChangeOutputs = extractXmlElementsForTag(xml, 'change')

  const fileChanges = fileChangeOutputs.map((fileChangeOutput): FileChange => {
    const path = extractSingleXmlElement(fileChangeOutput.content, 'path')
    const description = extractSingleXmlElement(
      fileChangeOutput.content,
      'description',
    )
    const oldChunk = extractSingleXmlElement(
      fileChangeOutput.content,
      'range-to-replace',
    )

    // Handle case where old chunk is truncated
    // Warning: Partial truncated printing out will still show
    const oldChunkParts = oldChunk?.content.split('</truncated>') ?? []
    let oldChunkContent: TargetRange

    if (!oldChunk)
      oldChunkContent = {
        type: 'fullContentRange',
        isStreamFinalized: false,
        fullContent: '',
      }
    else if (oldChunkParts.length === 2) {
      // Similar logic to the one embedded in the Xml parsing for regular tags
      const prefixContent = trimUpToOneTrailingNewLine(oldChunkParts[0])
      const suffixContent = trimUpToOneLeadingNewLine(oldChunkParts[1])
      oldChunkContent = {
        type: 'prefixAndSuffixRange',
        prefixContent,
        suffixContent,
        isStreamFinalized: oldChunk.isClosed,
      }
    } else if (oldChunkParts.length === 1)
      oldChunkContent = {
        type: 'fullContentRange',
        fullContent: oldChunk.content,
        isStreamFinalized: oldChunk.isClosed,
      }
    else throw new Error('Unexpected number of old chunk parts')

    const newChunk = extractSingleXmlElement(
      fileChangeOutput.content,
      'replacement',
    )

    // Strange code due to switching the encoding from multiple changes within a single file tag
    // to a more flat xml encoding but keeping the old data structure
    // Ideally we want to group the changes by file, but the hell with it for now
    const singularChangeForAFile = {
      description: description?.content ?? '',
      oldChunk: oldChunkContent,
      newChunk: {
        content: newChunk?.content ?? '',
        isStreamFinalized: newChunk?.isClosed ?? false,
      },
    }

    return {
      filePathRelativeToWorkspace: path?.content,
      change: singularChangeForAFile,
      isStreamFinilized: fileChangeOutput.isClosed,
    }
  })

  return {
    changes: fileChanges,
    isStreamFinalizedUnused: false,
    plan: planItems,
  }
}
