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

export const typescriptHelloWorldParametrizationMultiFileExample = (
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
export const editMiddleOfAJsxExpressionEnsureIndentIsPreserved = (
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

export const detailedPseudocodeAndTruncation = `Given this file:
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

export const UNUSED_NotRepresentativeOfOurUseCases_pythonRewriteBigPortionOfTheCodeWithTruncation =
  (breadIdentifier: string) => `
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
<truncated/>
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
  editMiddleOfAJsxExpressionEnsureIndentIsPreserved(breadIdentifier),
  detailedPseudocodeAndTruncation,

  // pythonRewriteBigPortionOfTheCodeWithTruncation(breadIdentifier),
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
