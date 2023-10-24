import { FileContext } from 'context/types'
import { OpenAiMessage } from 'helpers/openai'
import { SessionConfiguration } from 'session'

/**
 * HACCCCCK
 * COPIED OVER FROM pompt.ts
 */

export function createQuestionAnsweringWithContext(
  fileContexts: FileContext[],
  blobContexts: string[],
  configuration: SessionConfiguration,
): OpenAiMessage[] {
  // Dynamic messages based on input
  const filesContextXmlPrompt = fileContexts.map(mapFileContextToXml).join('\n')

  // For example compilation errors or blobs of documentation
  let optionalStaticContent = ''
  if (blobContexts.length > 0) {
    optionalStaticContent =
      blobContexts
        .map(
          (blobContext) =>
            `<information-blob>${blobContext}</information-blob>`,
        )
        .join('\n') + '\n\n'
  }

  /*
   * Do we need to say your input? Doesn't matter for performance using a
   * system or user message? It feels like I should be using the user here
   */
  const inputWithFiles: OpenAiMessage = {
    content: optionalStaticContent + filesContextXmlPrompt,
    role: 'user',
  }

  ////////// KEEEEY DIFFERENCE PROMPT //////////
  const messages = [
    {
      content:
        'You are a coding assistant. You might get files, and some other relevant information. You will also get a history of the conversation so far, parts of the history can be ommited or not relevant. Reply with markdown. You might not have all the information, try to reply to the best of your abilities or request more information.',
      role: 'system',
    } as OpenAiMessage,
    inputWithFiles,
  ]
  return messages
}

/**
 * Encode the file contexts into a prompt for the model
 * @param fileContexts - The files to encode
 * @param includeLineNumbers - Whether to include line numbers in the prompt. Keeping this as a parameter to quantify improvements or regressions
 */

function mapFileContextToXml(fileContext: FileContext): string {
  return (
    '<file>\n' +
    `<path>${fileContext.filePathRelativeToWorkspace}</path>\n` +
    `<content>\n${fileContext.content}\n</content>\n` +
    '</file>'
  )
}

/*
 * // range-(start|end)-<id> is used to mark the range to replace in the input.
 * This function removes those annotations from the input before sumbitting it to llm
 */
function removeRangeAnnotations(text: string): string {
  return text.replace(/\s*\/\/\s*range-(start|end)\S*/g, '')
}

/**
 * This function overall sucks because its flacky, should probably error out if
 * multiple matches are found, instead I will return last one for end term and
 * first one for start term.
 *
 * If there are multiple matches, use // range-(start|end)-<range-id> annotations.
 * These will be stripped from the range string.
 *
 * I'm using a content based to find the target range because the line
 * numbers are implicit and I don't want to keep truck of them in case they
 * change in the future or their format changes.
 *
 * This function extracts the target range from the content passed in and
 * truncates it if it's over five lines.
 *
 * Not exactly sure how I will handle cases when we will stop providing
 * content in the range to replace. Could be handled similarly except for
 * dropping the content of the line.
 *
 * The algorithm is roughly:
 * Split content within the editable file content into lines
 * Find the line with the content from the first line for the range to
 * replace, in our case space <ul>
 * Find the line with the content from the last line for the range to replace
 * Concatenate hold the lines within the range and put into a variable.
 */
function extractMatchingLineRange(
  content: string,
  startTerm: string,
  endTerm: string,
): string {
  const lines = content.split('\n')
  const startLineIndex = lines.findIndex((line) => line.includes(startTerm))
  // Find last index of the end term
  const endLineIndex =
    lines.length -
    1 -
    [...lines].reverse().findIndex((line) => line.includes(endTerm))
  let lineRange = lines.slice(startLineIndex, endLineIndex + 1)

  /*
   * Including two lines in the front and in the end because the last line
   * would often be a closing bracket which might make it harder for the modal
   * to reason about the range ending
   *
   * Currently unused
   */
  if (lineRange.length > 3) {
    lineRange = [
      ...lineRange.slice(0, 2),
      '<truncated/>',
      ...lineRange.slice(lineRange.length - 2),
    ]
  }

  const rangeWithPossibleAnnotations = lineRange.join('\n')
  const rangeWithoutAnnotations = removeRangeAnnotations(
    rangeWithPossibleAnnotations,
  )

  return rangeWithoutAnnotations
}
