import { Change, LlmGeneratedPatchXmlV1, RangeToReplace } from './types'

export interface XmlElement {
  tag: string
  content: string
  /** Since this is streaming from an llm we want to allow for partial xml */
  isClosed: boolean
}

/**
 * Extracts all xml elements with the given tag from the given xml string.
 * If the tag is not closed, the content will be the content up to the end of the string.
 *
 * THIS IS NOT A PROPER XML PARSER - it does not parse attributes, comments and many many other things
 *   Using to overcome the issues with partial xml from llm parsing,
 *   not to mention annoying fast-xml-parser bugs related to stopNodes
 *
 * @param xml The xml to extract elements from
 * @param tag The tag to extract, for example calling with tag 'change' on the following xml:
 *    ```xml
 *    <change>A</change><change>B</change>
 *    <change>
 *    C
 *    </cha
 *    ```
 *    will return 3 elements with content `A, B and C`. Notice that the last element is not closed
 *
 * @param shouldTrimUpToOneLeadingAndTrailingNewLine If true, will remove leading and trailing new lines from the content
 *   this is useful when streaming from an llm to make it easier for humans to read.
 *
 *   It will also remove empty lines from the end of the content. This happens due to indentation.
 *   In the following example the content of the change will be `lol` and not `lol\n++`
 *   ```xml
 *   <file>
 *   ++<change>
 *   lol
 *   ++</change>
 *   </file>
 *   ```
 *
 * @param shouldYieldPartialXml If true, will yield partial xml elements. I was going to use this for not allowing to stream partial paths, but realized with search api I can keep trying until only one file matches the path
 */
function extractXmlElementsForTag(
  xml: string,
  tag: string,
  shouldTrimUpToOneLeadingAndTrailingNewLine = true,
  shouldYieldPartialXml = true,
): XmlElement[] {
  const openTagString = `<${tag}>`
  const closeTagString = `</${tag}>`

  const contents = []
  let lastDiscoveredOpenTag = xml.indexOf(openTagString)

  while (lastDiscoveredOpenTag !== -1) {
    const endIndex = xml.indexOf(closeTagString, lastDiscoveredOpenTag)
    if (endIndex !== -1) {
      const contentStart = lastDiscoveredOpenTag + openTagString.length
      const contentEnd = endIndex
      const content = xml.substring(contentStart, contentEnd)

      const normalizedContent = shouldTrimUpToOneLeadingAndTrailingNewLine
        ? trimUpToOneLeadingAndTrailingNewLine(content)
        : content

      contents.push({
        tag,
        content: normalizedContent,
        isClosed: true,
      })
      // start next search after this end tag
      const searchStartIndexForNextOpeningTag = endIndex + closeTagString.length

      // Search for the next opening tag potentially breaking out of the loop
      lastDiscoveredOpenTag = xml.indexOf(
        openTagString,
        searchStartIndexForNextOpeningTag,
      )
    } else if (shouldYieldPartialXml) {
      // If end index is not found, assume we are streaming and the end tag is not there yet
      // So just return the content from the start tag to the end of the string
      const partialContent = xml.substring(
        lastDiscoveredOpenTag + openTagString.length,
      )

      // We might have started printing out the closing tag.
      // Remove any prefix of the tag that appear as a suffix of the content.
      // We need to generate all possible prefixes of the end tag (including an empty string)
      //   and check if they are a suffix of the content
      for (let i = closeTagString.length; i >= 0; i--) {
        const partiallyPrintedEndTag = closeTagString.substring(0, i)
        if (partialContent.endsWith(partiallyPrintedEndTag)) {
          // Remove the partially printed end tag from the content
          const content = partialContent.substring(
            0,
            partialContent.length - partiallyPrintedEndTag.length,
          )

          // Even tho the new line here might be legit - still lets delay
          //  adding it to the content until we know for sure
          const normalizedContent = shouldTrimUpToOneLeadingAndTrailingNewLine
            ? trimUpToOneLeadingAndTrailingNewLine(content)
            : content
          contents.push({
            tag,
            content: normalizedContent,
            isClosed: false,
          })
          break
        }
      }

      // If we are in this branch, that means the closing tag was not found, so there is no
      break
    }
  }

  return contents
}

function trimUpToOneLeadingNewLine(content: string) {
  return content.startsWith('\n') ? content.substring(1) : content
}

/**
 * Removes the last new line from the content if it exists, including any whitespace on the final line.
 * Helpful to remove indentation due to xml pretty printing.
 *
 * - Given `lol\n` will return `lol`
 * - Given `lol\n++` will return `lol`
 */
function trimUpToOneTrailingNewLine(content: string) {
  const lastLineBreak = content.lastIndexOf('\n')
  if (lastLineBreak === -1) {
    return content
  }

  const lineAfterLastLineBreak = content.substring(lastLineBreak)
  return lineAfterLastLineBreak.trim() === ''
    ? content.substring(0, lastLineBreak)
    : content
}

function trimUpToOneLeadingAndTrailingNewLine(content: string) {
  const contentWithoutLeadingNewLine = trimUpToOneLeadingNewLine(content)
  const contentWithoutLeadingAndTrailingNewLine = trimUpToOneTrailingNewLine(
    contentWithoutLeadingNewLine,
  )

  return contentWithoutLeadingAndTrailingNewLine
}

/** @see extractXmlElementsForTag */
function extractSingleXmlElement(
  xml: string,
  tag: string,
  shouldTrimUpToOneLeadingAndTrailingNewLine = true,
  shouldYieldPartialXml = true,
): XmlElement | undefined {
  const elements = extractXmlElementsForTag(
    xml,
    tag,
    shouldTrimUpToOneLeadingAndTrailingNewLine,
    shouldYieldPartialXml,
  )
  return elements.length > 0 ? elements[0] : undefined
}

export function parseLlmGeneratedPatchV1WithHandWrittenParser(
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
