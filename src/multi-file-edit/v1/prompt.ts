import {
  FileContext,
  fileContextSystemMessage,
} from 'document-helpers/file-context'
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
 */

export function createMultiFileEditingMessages(
  fileContexts: FileContext[],
  taskPrompt: string,
  config: { breadIdentifier: string; includeLineNumbers: boolean },
) {
  const multiFileEditPrompt = multiFileEditV1FormatSystemMessage(
    config.breadIdentifier,
  )
  const fileContext = fileContextSystemMessage(fileContexts)

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

  const userTaskMessage: OpenAiMessage = {
    role: 'user',
    content: taskPrompt,
  }

  const messages = [
    multiFileEditPrompt,
    fileContext,
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

const typescriptHelloWorldParametrizationMultiFileExample = (
  breadIdentifier: string,
) =>
  `
Given two files (omitted for brevity) and a task to make changes based on ${breadIdentifier} mentions. The following are acceptable changes to generate.
<change>
<path>src/hello-world.ts</path>
<range-to-replace>
function helloWorld() {
    // ${breadIdentifier} pass name to be greeted
    console.log('Hello World');
}
</range-to-replace>
<description>
Context: function
Input: name: thing to be greeted of type string
Output: void
1: Print out "Hello " followed by the name
<replacement>
function hello(name: string) {
    console.log(\`Hello \${name}\`);
}
</replacement>
</change>
<change>
<path>src/main.ts</path>
<range-to-replace>
// ${breadIdentifier} use hello world from a helper module and use environment variable to get the user name
</range-to-replace>
<description>
Context: top level code
1: Import hello function from helper module
2: Get user name from environment variable USER_NAME
3: Call hello function with user name
</description>
<replacement>
import { hello } from './helper';
const name = process.env.USER_NAME || 'World';
hello(name);
</replacement>
</change>
`

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
) =>
  `Given this file:
<file>
<path>counter.ts</path>
<content>
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
};
</content>
</file>

Given a task to refactor the code to use a single div instead of a list, the following are acceptable changes to generate.
<change>
<path>counter.ts</path>
<range-to-replace>
      <ul>
        {Array.from({ length: count }, 
          (_, i) => 
            <li key={i}>Item {i + 1}</li>)
        }
      </ul>
</range-to-replace>
<description>
Context: jsx subexpression
1: Show count value in a div
</description>
<replacement>
      <div>{count}</div>
</replacement>
</change>
`

const detailedPseudocodeAndTruncation = `Given this file:
<file>
<path>duplicate.ts</path>
<content>
function deduplicate(arr: number[]): number[] {
  const result: number[] = [];
  for (const item of arr) {
    if (!result.includes(item)) {
      result.push(item);
    }
  }
  return result;
}
</content>
</file>

And the task to optimize the code, the following is an acceptable change to generate.
<change>
<path>counter.ts</path>
<range-to-replace>
function deduplicate(arr: number[]): number[] {
  <truncated/>
  return result;
}
</range-to-replace>
<description>
Context: function
Input: arr: array of numbers
Output: array of numbers with duplicates removed
1: initialize a set to track unique numbers uniqueSet
2: initialize result array
3: for each item in arr
4:   if uniqueSet does not contain item
5:     add item to uniqueSet
6:     add item to result
7: return result
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
</change>
`

const allDiffV1Examples = (breadIdentifier: string) => [
  typescriptHelloWorldParametrizationMultiFileExample(breadIdentifier),
  editMiddleOfAJsxExpressionEnsureIndentIsPreserved(breadIdentifier),
  detailedPseudocodeAndTruncation,
]

/**
 * Generic prompt to generate changes to multiple files.
 * Can work on both breaded and non-bread related requests.
 *
 * Refactor: Probably should create a separate function for each message:
 * - file context (universal)
 * - diff generation prompt (version dependent) (examples and format
 * explanation)
 *   assuming this will be changed to function calling eventually
 * - task (should be passed from the top level command)
 *
 * @param breadIdentifier - used to generate a more customized prompt for editing files with
 *  @breadIdentifier mentions. Kind of has no business being here, but I will allow it.
 */
function multiFileEditV1FormatSystemMessage(
  breadIdentifier: string,
): OpenAiMessage {
  const diffPrompt = diffGeneratorPromptPrefix(
    allDiffV1Examples(breadIdentifier),
  )
  const divPromptSystemMessage: OpenAiMessage = {
    content: diffPrompt,
    role: 'system',
  }

  return divPromptSystemMessage
}
