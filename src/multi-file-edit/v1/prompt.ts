import { FileContext } from 'document-helpers/file-context'
import { transformFileContextWithLineNumbers } from 'document-helpers/file-context'
import { OpenAiMessage } from 'helpers/openai'
import { SessionConfiguration } from 'session'

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

/* CURRENTLY NO PLANNING ENABLED for simplification and speed reasons.
 * Planning is very important as chain of thought prompting is currently
 * state of the art. There's also structure chain of thought which promises
 * to be better https://arxiv.org/pdf/2305.06599.pdf
 *
 * I'm considering to move pseudocode algorithms for the replacement into the
 * examples for the diff generation prompt. I'm hoping by reducing locality
 * it will improve the quality of the replacement.
 */

export function createMultiFileEditingMessages(
  fileContexts: FileContext[],
  blobContexts: string[],
  configuration: SessionConfiguration,
): OpenAiMessage[] {
  // Static messages.
  const multiFileEditPromptMessage: OpenAiMessage = {
    content: multiFileEditPrompt(configuration),
    role: 'system',
  }

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

  /* Do we need to say your input? Doesn't matter for performance using a
     system or user message? It feels like I should be using the user here */
  const inputWithFiles: OpenAiMessage = {
    content: optionalStaticContent + filesContextXmlPrompt,
    role: 'user',
  }

  const messages = [multiFileEditPromptMessage, inputWithFiles]
  return messages
}

const multiFileEditPrompt = (configuration: SessionConfiguration) =>
  `You are a coding assistant.
You will be given editable files with line numbers and optional information blobs as input.
Your task is defined by @task mentions within your input.
You will address the task by making changes to some files.
Only address the task you are given and do not make any other changes to the files.
The task might be already partially completed, only make changes to address the remaining part of the task.
You will first output how you understand the task along with compact key ideas.
Immediately after you will output changes.

Examples of your input and output pairs follow.

${[
  typescriptHelloWorldParametrizationMultiFileExample(configuration),
  editMiddleOfAJsxExpressionEnsureIndentIsPreserved(configuration),
  truncationExample(configuration),
].join('\n\n')}
`

/*
I think generating these examples from source code would be more reliable.
This schema would be enforced, configuration would be easier
*/

const typescriptHelloWorldParametrizationMultiFileExample = (
  configuration: SessionConfiguration,
) => {
  const breadIdentifier = configuration.breadIdentifier
  let editableFileContext1: FileContext = {
    filePathRelativeToWorkspace: 'src/hello-world.ts',
    content: `function helloWorld() {
  // @${breadIdentifier} pass name to be greeted
  console.log('Hello World');
}`,
  }

  let editableFileContext2: FileContext = {
    filePathRelativeToWorkspace: 'src/main.ts',
    content: `// @${breadIdentifier} use hello world from a helper module and use environment variable to get the user name`,
  }

  if (configuration.includeLineNumbers) {
    editableFileContext1 =
      transformFileContextWithLineNumbers(editableFileContext1)
    editableFileContext2 =
      transformFileContextWithLineNumbers(editableFileContext2)
  }

  let optionalAlgorithm1 = ''
  let optionalAlgorithm2 = ''
  if (false) {
    optionalAlgorithm1 = `<description>
Context: function
Input: name: thing to be greeted of type string
Output: void
Algorithm:
Print out "Hello " followed by the name
</description>`
    optionalAlgorithm2 = `<description>
Context: top level code
Algorithm:
Import hello function from helper module
Get user name from environment variable USER_NAME
Call hello function with user name
</description>`
  }

  const fileContextPromptPart1 = mapFileContextToXml(editableFileContext1)
  const fileContextPromptPart2 = mapFileContextToXml(editableFileContext2)

  const rangeToReplace1 = extractMatchingLineRange(
    editableFileContext1.content,
    'function helloWorld() {',
    '}',
  )

  const rangeToReplace2 = extractMatchingLineRange(
    editableFileContext2.content,
    `// @${breadIdentifier} use hello world from a helper module and use environment variable to get the user name`,
    `// @${breadIdentifier} use hello world from a helper module and use environment variable to get the user name`,
  )

  return `Input: 
${fileContextPromptPart1}
${fileContextPromptPart2}

Output:
<task>
Add a parameter to \`helloWorld\` function to pass the name to be greeted.
Use the updated function in \`main.ts\` to greet the user found in the \`USER_NAME\` environment variable defaulting to \`World\`.
</task>

<change>
<path>src/hello-world.ts</path>
<range-to-replace>
${rangeToReplace1}
</range-to-replace>${optionalAlgorithm1}
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
</range-to-replace>${optionalAlgorithm2}
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
  configuration: SessionConfiguration,
) => {
  let editableFileContext: FileContext = {
    filePathRelativeToWorkspace: 'counter.ts',
    content: `// @task use a single div instead of a list to show the count
const Counter: React.FC = () => {
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

  if (configuration.includeLineNumbers) {
    editableFileContext =
      transformFileContextWithLineNumbers(editableFileContext)
  }
  const fileContextPromptPart = mapFileContextToXml(editableFileContext)

  let optionalAlgorithm = ''
  if (false) {
    /* Change this condition based on your logic for including optional
       description. */
    optionalAlgorithm = `<description>
  Context: jsx subexpression
  Symbols in scope: count, setCount
  Algorithm:
  Replace the unordered list with a single div showing the count value
  </description>`
  }

  const rangeToReplace = extractMatchingLineRange(
    editableFileContext.content,
    '<ul>',
    '</ul>',
  )

  return `Input:
${fileContextPromptPart}

Output:
<task>
Use a single div instead of a list to show the count.
</task>

<change>
<path>counter.ts</path>
<range-to-replace>
${rangeToReplace}
</range-to-replace>${optionalAlgorithm}
<replacement>
      <div>{count}</div>
</replacement>
</change>
`
}

/**
 * UNUSED, I'm stripping out the algorithm for chain of thought to speed up the
 * changes and set baseline performance without the algorithms with the new
 * updated prompt. I'm also removing truncation.
 *
 * - Maybe don't focus on truncation because we don't really need it with line
 * ranges?
 * - This will additionally remove the distraction of the model needing to know
 * how to truncate the code, good for the demos
 *
 * Remember this algorithm is not parametrized, and is always included
 */
const truncationExample = (configuration: SessionConfiguration) => {
  let editableFileContext: FileContext = {
    filePathRelativeToWorkspace: 'duplicate.ts',
    content: `// @task optimize
function deduplicate(arr: number[]): number[] {
  const result: number[] = []
  for (const item of arr) {
    if (!result.includes(item)) {
      result.push(item)
    }
  }
  return result
}`,
  }

  if (configuration.includeLineNumbers) {
    editableFileContext =
      transformFileContextWithLineNumbers(editableFileContext)
  }
  const fileContextPromptPart = mapFileContextToXml(editableFileContext)

  const rangeToReplace = extractMatchingLineRange(
    editableFileContext.content,
    'function deduplicate(arr: number[]): number[] {',
    '}',
  )

  return `Input:
${fileContextPromptPart}

Output:
<task>
Optimize the function. 
Key ideas: Let's use a set to keep track of unique items.
</task>

<change>
<path>duplicate.ts</path>
<--! Use </truncated> to shorten the range to replace if they are longer than 6 lines. Never truncate replacement. -->
<range-to-replace>
${rangeToReplace}
</range-to-replace>
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
   *
   * Currently unused
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
