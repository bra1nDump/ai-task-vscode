import { OpenAiMessage } from 'helpers/openai'
import { FileContext } from './document-snapshot'

/**
 * Encode the file contexts into a prompt for the model
 * @param fileContexts - The files to encode
 * @param includeLineNumbers - Whether to include line numbers in the prompt. Keeping this as a parameter to quantify improvements or regressions
 */

export function mapFileContextToXml(fileContext: FileContext): string {
  return (
    '<file>\n' +
    `<path>${fileContext.filePathRelativeToWorkspace}</path>\n` +
    `<content>\n${fileContext.content}\n</content>\n` +
    '</file>'
  )
}

export function fileContextSystemMessage(
  fileContexts: FileContext[],
): OpenAiMessage {
  const filesContextXmlPrompt = fileContexts.map(mapFileContextToXml).join('\n')

  const filesContextXmlPromptSystemMessage: OpenAiMessage = {
    content: 'Given files:\n' + filesContextXmlPrompt,
    role: 'system',
  }
  return filesContextXmlPromptSystemMessage
}
