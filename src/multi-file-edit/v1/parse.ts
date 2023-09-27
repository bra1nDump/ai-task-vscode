import {
  extractXmlElementsForTag,
  extractSingleXmlElement,
  trimUpToOneTrailingNewLine,
  trimUpToOneLeadingNewLine,
} from 'xml/parser'
import { TargetRange, LlmGeneratedPatchXmlV1, FileChange } from './types'

/**
 * Example payload thus would parse:
```xml
<task>
{{Understanding of the task}}
</task>

<change>
<path>src/hello-world.ts</path>
<range-to-replace>
function helloWorld() {
    // ${breadIdentifier} pass name to be greeted
    console.log('Hello World');
}
</range-to-replace>
<description>
Line by line pseudocode for the replacement
</description> 
<replacement>
function hello(name: string) {
    console.log(\`Hello \${name}\`);
}
</replacement>
</change>
```
*/
export function parsePartialMultiFileEdit(xml: string): LlmGeneratedPatchXmlV1 {
  const task = extractSingleXmlElement(xml, 'task')?.content ?? ''

  // File changes
  const fileChangeOutputs = extractXmlElementsForTag(xml, 'change')
  const fileChanges = fileChangeOutputs.flatMap(
    (fileChangeOutput): FileChange[] => {
      const path = extractSingleXmlElement(fileChangeOutput.content, 'path')
      if (!path?.isClosed) {
        return []
      }

      const oldChunk = extractSingleXmlElement(
        fileChangeOutput.content,
        'range-to-replace',
      )
      const description = extractSingleXmlElement(
        fileChangeOutput.content,
        'description',
      )

      /* Handle case where old chunk is truncated
       Warning: Partial truncated printing out will still show */
      const oldChunkParts = oldChunk?.content.split('</truncated>') ?? []
      let oldChunkContent: TargetRange

      if (!oldChunk) {
        oldChunkContent = {
          type: 'fullContentRange',
          isStreamFinalized: false,
          fullContent: '',
        }
      } else if (oldChunkParts.length === 2) {
        // Similar logic to the one embedded in the Xml parsing for regular tags
        const prefixContent = trimUpToOneTrailingNewLine(oldChunkParts[0])
        const suffixContent = trimUpToOneLeadingNewLine(oldChunkParts[1])
        oldChunkContent = {
          type: 'prefixAndSuffixRange',
          prefixContent,
          suffixContent,
          isStreamFinalized: oldChunk.isClosed,
        }
      } else if (oldChunkParts.length === 1) {
        oldChunkContent = {
          type: 'fullContentRange',
          fullContent: oldChunk.content,
          isStreamFinalized: oldChunk.isClosed,
        }
      } else {
        throw new Error('Unexpected number of old chunk parts')
      }

      const newChunk = extractSingleXmlElement(
        fileChangeOutput.content,
        'replacement',
      )

      /* Strange code due to switching the encoding from multiple changes within
     * a single file tag to a more flat xml encoding but keeping the old data
     * structure Ideally we want to group the changes by file,
       but the hell with it for now */
      const change = {
        description: description?.content,
        oldChunk: oldChunkContent,
        newChunk: {
          content: newChunk?.content ?? '',
          isStreamFinalized: newChunk?.isClosed ?? false,
        },
      }

      return [
        {
          filePathRelativeToWorkspace: path.content,
          change,
          isStreamFinilized: fileChangeOutput.isClosed,
        },
      ]
    },
  )

  // Terminal commands
  const terminalCommandFragments = extractXmlElementsForTag(
    xml,
    'terminal-command',
  )
  const terminalCommands = terminalCommandFragments.flatMap(
    (terminalCommand): string[] => {
      if (!terminalCommand.isClosed) {
        return []
      }
      return [terminalCommand.content]
    },
  )

  return {
    changes: fileChanges,
    terminalCommands,
    isStreamFinalizedUnused: false,
    task,
  }
}
