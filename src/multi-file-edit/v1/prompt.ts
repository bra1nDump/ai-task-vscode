import {
  fileContextSystemMessage,
  mapFileContextToXml,
} from 'document-helpers/file-context-prompt'
import { FileContext } from 'document-helpers/file-context'
import { transformFileContextWithLineNumbers } from 'document-helpers/file-context'
import { OpenAiMessage } from 'helpers/openai'

/**
 * Diff generation with these proms has been kind of underwhelming
 * I have attributed thus to the approach itself
 * I have suggested the alternative of splitting the target code location into
 * a separate task And only then generating the new codes. I think that is
 * still a more promising. I can squeeze out more performance from thus with
 * better prompts - [better prompts attempted].
 *
 * Given that I now want multi file editing to work outside of the bread idea
 * and bread is simply one way of giving the task to a multi file editing
 * program
 *
 * Idea: Trying to decouple the prompt too much might be heard in performance.
 * If I were to consolidate output specification to same set of examples this
 * might help the model. Specifically adding the task block as part of the
 * changes generation
 *
 * It will be very hard to reason about these prompts without seeing what they
 * actually look like one compiled with a given configuration. I think a code
 * generation step might help bring structure to these dynamically generated
 * prompts. As the first step I could simply run the various configurations and
 * generate files along side this file for reference and debugging.
 */

export function createMultiFileEditingMessages(
  fileContexts: FileContext[],
  taskPrompt: string,
  config: { breadIdentifier: string; includeLineNumbers: boolean },
): OpenAiMessage[] {
  // Dynamic messages based on input
  const fileContextDynamic = fileContextSystemMessage(fileContexts)
  const userTaskMessage: OpenAiMessage = {
    role: 'user',
    content: taskPrompt,
  }

  // Static messages. Please
  const diffPrompt = diffGeneratorPromptPrefix(
    allDiffV1Examples(config.breadIdentifier, config.includeLineNumbers),
  )
  const multiFileEditPrompt: OpenAiMessage = {
    content: diffPrompt,
    role: 'system',
  }

  /* Planning is very important as chain of thought prompting is currently
   * state of the art. There's also structure chain of thought which promises
   * to be better https://arxiv.org/pdf/2305.06599.pdf
   *
   * I'm considering to move pseudocode algorithms for the replacement into the
   * examples for the diff generation prompt. I'm hoping by reducing locality
   * it will improve the quality of the replacement.
   */
  const taskUnderstandingSelfPrompting: OpenAiMessage = {
    role: 'system',
    content: `Understanding the task:
- Collect all of the information relevant to the task the user is trying to accomplish and restate the task
- Restate any specific instructions that the user has already provided on how to accomplish the task 
- Used technical style of writing - be concise but do not lose any information
- Parts of the task might be accomplished, clearly state so and consider it stale instructions

Task output format:
<task>
{{restating the task}}
</task>`,
  }

  const combinedResponseOutputFormat: OpenAiMessage = {
    role: 'system',
    content: `In your next message respond only with the task immediately followed by the changes to be made to the files.`,
  }

  const messages = [
    multiFileEditPrompt,
    fileContextDynamic,
    userTaskMessage,
    taskUnderstandingSelfPrompting,
    combinedResponseOutputFormat,
  ]
  return messages
}

const diffGeneratorPromptPrefix = (examples: string[]) =>
  `Creating changes:
- Only make changes based on your task
- Only replace logically complete chunks of code. Avoid replacing sub expressions. Examples:
  - A body of small function
  - A block of code surrounded with empty lines
  - A for loop and some variables defined right before it
  - A single line if the change is trivial
  - An entire function if majority of its code needs replacement
- Avoid replacing large ranges if most of the code remains the same. Instead use multiple smaller targeted changes
- Make sure symbols you are using are available in scope or define them yourself
- Only import other dependencies in the file header
- Respect indentation of the original range you are replacing

Examples:
${examples.join('\n\n')}
`

/*
I think generating these examples from source code would be more reliable.
This schema would be enforced, configuration would be easier
*/

const typescriptHelloWorldParametrizationMultiFileExample = (
  breadIdentifier: string,
  includeLineNumbers: boolean,
) => {
  let editableFileContext1: FileContext = {
    filePathRelativeToWorkspace: 'src/hello-world.ts',
    content: `function helloWorld() {
  // ${breadIdentifier} pass name to be greeted
  console.log('Hello World');
}`,
  }

  let editableFileContext2: FileContext = {
    filePathRelativeToWorkspace: 'src/main.ts',
    content: `// ${breadIdentifier} use hello world from a helper module and use environment variable to get the user name`,
  }

  if (includeLineNumbers) {
    editableFileContext1 =
      transformFileContextWithLineNumbers(editableFileContext1)
    editableFileContext2 =
      transformFileContextWithLineNumbers(editableFileContext2)
  }

  const fileContextPromptPart1 = mapFileContextToXml(editableFileContext1)
  const fileContextPromptPart2 = mapFileContextToXml(editableFileContext2)

  const rangeToReplace1 = extractMatchingLineRange(
    editableFileContext1.content,
    'function helloWorld() {',
    '};',
  )

  const rangeToReplace2 = extractMatchingLineRange(
    editableFileContext2.content,
    '// ${breadIdentifier} use hello world from a helper module and use environment variable to get the user name',
    '// ${breadIdentifier} use hello world from a helper module and use environment variable to get the user name',
  )

  return `Given these inputs:
${fileContextPromptPart1}
${fileContextPromptPart2}

Given a task: Make changes based on ${breadIdentifier} mentions.

Good output is:
<change>
<path>src/hello-world.ts</path>
<range-to-replace>
${rangeToReplace1}
</range-to-replace>
<description>
Context: function
Input: name: thing to be greeted of type string
Output: void
Algorithm:
Print out "Hello " followed by the name
</description>
<replacement>
function hello(name: string) {
    console.log(\`Hello \${name}\`);
}
</replacement>
</change>
<change>
<path>src/main.ts</path>
<range-to-replace>
${rangeToReplace2}
</range-to-replace>
<description>
Context: top level code
Algorithm:
Import hello function from helper module
Get user name from environment variable USER_NAME
Call hello function with user name
</description>
<replacement>
import { hello } from './helper';
const name = process.env.USER_NAME || 'World';
hello(name);
</replacement>
</change>
`
}

/**
 * I anticipate jsx generation will be tough as the model will probably get
 * confused on whether it's the output format or the actual content of code
 * blocks.
 *
 * Things will actually break if people use the same tags within their code
 * such as file (I believe a legitimate Html tag) For instance this file will
 * probably not get edited correctly. I should probably use more esoteric tag
 * names.
 */
const editMiddleOfAJsxExpressionEnsureIndentIsPreserved = (
  breadIdentifier: string,
  includeLineNumbers: boolean,
) => {
  let editableFileContext: FileContext = {
    filePathRelativeToWorkspace: 'counter.ts',
    content: `const Counter: React.FC = () => {
  const [count, setCount] = useState<number>(0);

  return (
    <div>
      <button onClick={() => count > 0 && setCount(count - 1)}>-</button>
      <button onClick={() => setCount(count + 1)}>+</button>
      <ul>
        {Array.from({ length: count },
         (_, i) =>
           <li key={i}>Item {i + 1}</li>)
        }
      </ul>
    </div>
  );
};`,
  }

  if (includeLineNumbers) {
    editableFileContext =
      transformFileContextWithLineNumbers(editableFileContext)
  }
  const fileContextPromptPart = mapFileContextToXml(editableFileContext)

  const rangeToReplace = extractMatchingLineRange(
    editableFileContext.content,
    '<ul>',
    '</ul>',
  )

  return `Given this input:
${fileContextPromptPart}

Given a task: Refactor the code to use a single div instead of a list

Good output is:
<change>
<path>counter.ts</path>
<range-to-replace>
${rangeToReplace}
</range-to-replace>
<description>
Context: jsx subexpression
Symbols in scope: count, setCount
Algorithm:
Show count value in a div
</description>
<replacement>
      <div>{count}</div>
</replacement>
</change>
`
}

const detailedPseudocodeAndTruncation = (
  breadIdentifier: string,
  includeLineNumbers: boolean,
) => {
  let editableFileContext: FileContext = {
    filePathRelativeToWorkspace: 'duplicate.ts',
    content: `function deduplicate(arr: number[]): number[] {
  const result: number[] = [];
  for (const item of arr) {
    if (!result.includes(item)) {
      result.push(item);
    }
  }
  return result;
};`,
  }

  if (includeLineNumbers) {
    editableFileContext =
      transformFileContextWithLineNumbers(editableFileContext)
  }
  const fileContextPromptPart = mapFileContextToXml(editableFileContext)

  const rangeToReplace = extractMatchingLineRange(
    editableFileContext.content,
    'function deduplicate(arr: number[]): number[] {',
    '};',
  )

  return `Given this file:
${fileContextPromptPart}

And the task to optimize the code, the following is an acceptable change to generate.
<change>
<path>duplicate.ts</path>
<range-to-replace>
${rangeToReplace}
</range-to-replace>
<description>
Context: function
Input: arr: array of numbers
Output: array of numbers with duplicates removed
Algorithm:
initialize a set to track unique numbers uniqueSet
initialize result array
for each item in arr
  if uniqueSet does not contain item
    add item to uniqueSet
    add item to result
return result
</description>
<replacement>
function deduplicate(arr: number[]): number[] {
  const uniqueSet = new Set<number>();
  const result: number[] = [];
  for (const item of arr) {
    if (!uniqueSet.has(item)) {
      result.push(item);
      uniqueSet.add(item);
    }
  }
  return result;
}
</replacement>
</change>`
}

/** I'm using a content based to find the target range because the line
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
  const endLineIndex = lines.findIndex((line) => line.includes(endTerm))
  const lineRange = lines.slice(startLineIndex, endLineIndex + 1)

  /* Including two lines in the front and in the end because the last line
   * would often be a closing bracket which might make it harder for the modal
   * to reason about the range ending
   */
  if (lineRange.length > 6) {
    const truncatedLineRange = [
      ...lineRange.slice(0, 2),
      '<truncated/>',
      ...lineRange.slice(lineRange.length - 2),
    ]
    return truncatedLineRange.join('\n')
  }

  return lineRange.join('\n')
}

const allDiffV1Examples = (
  breadIdentifier: string,
  includeLineNumbers: boolean,
) => [
  typescriptHelloWorldParametrizationMultiFileExample(
    breadIdentifier,
    includeLineNumbers,
  ),
  editMiddleOfAJsxExpressionEnsureIndentIsPreserved(
    breadIdentifier,
    includeLineNumbers,
  ),
  detailedPseudocodeAndTruncation(breadIdentifier, includeLineNumbers),
]
