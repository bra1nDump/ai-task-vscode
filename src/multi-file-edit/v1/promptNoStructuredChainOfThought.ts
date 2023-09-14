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
 */

/*
- You are a coding assistant that generates incremental file changes
- You will be given files along with some task
 * - You might generate changes to some file if it's necessary to accomplish
 * the task - Start by making changes you are most confident about
 * - Respect indentation of the original range you are replacing (does not
 * really replace indentation) - If you're only replacing a single line, only
 * print out that line as a target range - Avoid replacing large ranges if most
 * of the code remains the same. Instead use multiple smaller targeted change

I'm playing around with the scope that should be replaced.
 * Before it would replace too big over chunk, now it has gone too granular and
 * I think it's causing issues.

 * It has continuously used a string that does not exist in scope and did not
 * declare it. When declaring variables it would oftentimes place them too far
 * from when they're used.

 * Maybe I am being overly harsh on the multi file editing. I have asked
 * continue some more question and it has failed to  make the change I wanted.
*/

const diffGeneratorPromptPrefix = (examples: string[]) =>
  `How to make a multi file change.

Suggestions:
- Only make changes based on your task
- Only replace logically complete chunks of code. Avoid replacing sub expressions. Examples:
  - A body of small function
  - A block of code surrounded with new lines
  - A for loop and some variables defined right before it
- Avoid replacing large ranges if most of the code remains the same. Instead use multiple smaller targeted changes
- If the change is trivial and affects only a single line, only print out that line as a target range
- Make sure symbols you are using are available in scope or define them yourself

Examples:
${examples.join('\n\n')}
`

export const typescriptHelloWorldParametrizationMultiFileExample = (
  breadIdentifier: string,
) =>
  `
Given two files (omitted for brevity) and a task to make changes based on ${breadIdentifier} mentions. The following are acceptable changes to generate.
<change>
<path>src/hello-world.ts</path>
<description>Parametrising function with a name of the thing to be greeted</description>
<range-to-replace>
function helloWorld() {
    // ${breadIdentifier} pass name to be greeted
    console.log('Hello World');
}
</range-to-replace>
<replacement>
function hello(name: string) {
    console.log(\`Hello \${name}\`);
}
</replacement>
</change>
<change>
<path>src/main.ts</path>
<description>Use hello world from a helper module and use environment variable to get the user name</description>
<range-to-replace>
// ${breadIdentifier} use hello world from a helper module and use environment variable to get the user name
</range-to-replace>
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
export const editMiddleOfAJsxExpressionEnsureIndentIsPreserved = (
  breadIdentifier: string,
) =>
  `
Given this file:
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
<description>Use a single div simply showing the count instead of showing a list element with values from 0 to count</description>
<range-to-replace>
      <ul>
        {Array.from({ length: count }, 
          (_, i) => 
            <li key={i}>Item {i + 1}</li>)
        }
      </ul>
</range-to-replace>
<replacement>
      <div>{count}</div>
</replacement>
</change>
`

export const pythonRewriteBigPortionOfTheCodeWithTruncation = (
  breadIdentifier: string,
) => `
Given this file:
<file>
<path>src/quicksort.py</path>
<content>
# @${breadIdentifier} Refactor thus using recursion
def partition(array, low, high):
  i = (low-1)
  pivot = array[high]
  for j in range(low, high):
    if array[j] <= pivot:
      i = i+1
      array[i], array[j] = array[j], array[i]
  array[i+1], array[high] = array[high], array[i+1]
  return (i+1)

def quicksort(array, low, high):
  if len(array) == 1:
    return array
  if low < high:
    pi = partition(array, low, high)
    quicksort(array, low, pi-1)
    quicksort(array, pi+1, high)

data = [10, 7, 8, 9, 1, 5]
n = len(data)
quicksort(data, 0, n-1)
print("Sorted array is:", data)
</content>
</file>

Given a task to address @${breadIdentifier} comments, the following is a reasonable change to make. Notice the use of </truncated>. Use it only two truncate range to replace when it is large (over 5 lines). Never truncate replacement.
<change>
<path>src/quicksortpy</path>
<description>Replacing the existing quicksort implementation with a more efficient one</description>
<range-to-replace>
def partition(array, low, high):
  i = (low-1)
</truncated>
    quicksort(array, low, pi-1)
    quicksort(array, pi+1, high)
</range-to-replace>
<replacement>
def quicksort(arr):
  if len(arr) <= 1:
    return arr
  pivot = arr[len(arr) // 2]
  left = [x for x in arr if x < pivot]
  middle = [x for x in arr if x == pivot]
  right = [x for x in arr if x > pivot]
  return quicksort(left) + middle + quicksort(right)
</replacement>
</change>
`

export const allDiffV1Examples = (breadIdentifier: string) => [
  typescriptHelloWorldParametrizationMultiFileExample(breadIdentifier),
  typescriptHelloWorldParametrizationMultiFileExample(breadIdentifier),
  pythonRewriteBigPortionOfTheCodeWithTruncation(breadIdentifier),
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
export function multiFileEditV1FormatSystemMessage(
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
