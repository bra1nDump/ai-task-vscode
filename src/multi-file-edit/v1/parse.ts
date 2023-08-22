import {
  extractXmlElementsForTag,
  extractSingleXmlElement,
} from '../../xml/parser'
import { Change, LlmGeneratedPatchXmlV1, TargetRange } from './types'

export function parsePartialMultiFileEdit(
  xml: string,
): LlmGeneratedPatchXmlV1 | undefined {
  const fileChangeOutputs = extractXmlElementsForTag(xml, 'file')

  // TODO: Drop the new lines right after opening tags old-chunk and new-chunk and right before closing tags

  const changesToMultipleFiles = fileChangeOutputs.map((fileChangeOutput) => {
    const changeXmlElements = extractXmlElementsForTag(
      fileChangeOutput.content,
      'change',
    )

    const singleFileChanges = changeXmlElements.map(
      (changeXmlElement): Change => {
        const changeXml = changeXmlElement.content

        const description = extractSingleXmlElement(changeXml, 'description')
        const oldChunk = extractSingleXmlElement(changeXml, 'old-chunk')

        // Handle case where old chunk is truncated
        const oldChunkParts = oldChunk?.content.split('</truncated>') ?? []
        let oldChunkContent: TargetRange

        if (!oldChunk) {
          oldChunkContent = {
            type: 'fullContentRange',
            isStreamFinalized: false,
            fullContent: '',
          }
        } else {
          if (oldChunkParts.length === 2) {
            const prefixContent = oldChunkParts[0]
            const suffixContent = oldChunkParts[1]
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
        }

        const newChunk = extractSingleXmlElement(changeXml, 'new-chunk')
        return {
          description: description?.content ?? '',
          oldChunk: oldChunkContent,
          newChunk: {
            content: newChunk?.content ?? '',
            isStreamFinalized: newChunk?.isClosed ?? false,
          },
        }
      },
    )

    return {
      filePathRelativeToWorkspace: extractSingleXmlElement(
        fileChangeOutput.content,
        'path',
      )?.content,
      changes: singleFileChanges,
    }
  })

  return { fileChanges: changesToMultipleFiles }
}
