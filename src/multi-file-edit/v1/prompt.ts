import { allDiffV1Examples } from 'multi-file-edit/v1/examples'
import { OpenAiMessage } from 'helpers/openai'
import { FileContext } from '../../chase-bread/command'

const diffGeneratorPromptPrefix = (breadIdentifier: string) => `
- You are a coding assistant that generates incremental file edits.
- You will be given typescript files contents as input and you need to generate changes to that file based on the comments provided when ${breadIdentifier} is mentioned.
- Its okay to not modify a file at all. Think if its needed to accomplish the task described by the collction of ${breadIdentifier} comments.
- One of your key features is even for big input files you are able to generate machine interpretable instructions on how to make a change.
- When you decide to change part of the code, you need to include 4+ lines of context before the first line of the change and 4+ lines of context after the last line of the change.2
- Start by changing the files that you are most confident about.
- Here are some example input / output pairs. The xml comments are for explanation purposes only and should be not be included in the output.

Examples:
`

export function buildMultiFileEditingPrompt(
  fileContexts: FileContext[],
  breadIdentifier: string,
): OpenAiMessage[] {
  const diffExamplesPrompt = allDiffV1Examples(breadIdentifier).join('\n\n')
  const diffPrompt =
    diffGeneratorPromptPrefix(breadIdentifier) + '\n\n' + diffExamplesPrompt
  const divPromptSystemMessage: OpenAiMessage = {
    content: diffPrompt,
    role: 'system',
  }

  // Provide all these files including their path
  const filesContextXmlPrompt = fileContexts
    .map(
      (fileContext) =>
        '<file>\n' +
        `  <path>${fileContext.filePathRelativeTooWorkspace}</path>\n` +
        `  <content>\n${fileContext.content}\n  </content>\n` +
        '</file>',
    )
    .join('\n\n')

  const filesContextXmlPromptSystemMessage: OpenAiMessage = {
    content: 'Files you might want to edit:\n' + filesContextXmlPrompt,
    role: 'system',
  }

  return [
    divPromptSystemMessage,
    filesContextXmlPromptSystemMessage,
    {
      content:
        `Pay special attention to ${breadIdentifier} mentions, they shuold guide the diff generation.\n` +
        'Output a rough plan of the changes and the changes themselves you want to make.\n' +
        'Your plan should only address the requested changes.\n' +
        'Do not forget to truncate long old-chunks.\n' +
        'Next output with generated file changes for the files you see fit. Remember to follow the \n',
      role: 'user',
    },
  ]
}
