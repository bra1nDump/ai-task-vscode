import { LlmGeneratedPatchXmlV1, RangeToReplace } from './types'

export type XmlElement = {
  tag: string
  content: string
  /** Since this is streaming from an llm we want to allow for partial xml */
  isClosed: boolean
}

function extractXmlElementsForTag(xml: string, tag: string): XmlElement[] {
  const tagLength = tag.length

  const contents = []
  let startIndex = xml.indexOf(`<${tag}`)

  while (startIndex !== -1) {
    // Extract attributes (later)

    const endIndex = xml.indexOf(`</${tag}>`, startIndex)
    if (endIndex !== -1) {
      const contentStart = startIndex + tagLength + 2 // 2 for < and >
      const contentEnd = endIndex
      const content = xml.substring(contentStart, contentEnd)
      contents.push({
        tag,
        content,
        isClosed: true,
      })
      startIndex = xml.indexOf(`<${tag}>`, endIndex + tagLength + 3) // 3 for </, > and start next search after this end tag
    } else {
      // If end index is not found, assume we are streaming and the end tag is not there yet
      // So just return the content from the start tag to the end of the string
      const partialContent = xml.substring(startIndex + tagLength + 2) // 2 for < and >

      // We might have started printing out the closing tag.
      // Remove any prefix of the tag that appear as a suffix of the content.
      // We need to generate all possible prefixes of the end tag (including an empty string)
      //   and check if they are a suffix of the content
      for (let i = tagLength + 3; i >= 0; i--) {
        const partiallyPrintedEndTag = `</${tag}>`.substring(0, i)
        if (partialContent.endsWith(partiallyPrintedEndTag)) {
          // Remove the partially printed end tag from the content
          const content = partialContent.substring(
            0,
            partialContent.length - partiallyPrintedEndTag.length,
          )
          contents.push({
            tag,
            content,
            isClosed: false,
          })
          break
        }
      }

      break
    }
  }

  return contents
}

function extractSingleXmlElement(
  xml: string,
  tag: string,
): XmlElement | undefined {
  const elements = extractXmlElementsForTag(xml, tag)
  return elements.length > 0 ? elements[0] : undefined
}

export function parseLlmGeneratedPatchV1WithHandWrittenParser(
  xml: string,
): LlmGeneratedPatchXmlV1 | undefined {
  const fileChangeOutputs = extractXmlElementsForTag(xml, 'file-change-output')

  if (fileChangeOutputs.length === 0) {
    return undefined
  }

  // TODO: Drop the new lines right after opening tags old-chunk and new-chunk and right before closing tags
  const changes = extractXmlElementsForTag(
    fileChangeOutputs[0].content,
    'change',
  ).map((changeXmlElement) => {
    const changeXml = changeXmlElement.content

    const description = extractSingleXmlElement(changeXml, 'description')
    const oldChunk = extractSingleXmlElement(changeXml, 'old-chunk')

    // Handle case where old chunk is truncated
    const oldChunkParts = oldChunk?.content.split('</truncated>') ?? []
    let oldChunkContent: RangeToReplace

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
  })

  return { fileChangeOutput: { changes: changes } }
}
