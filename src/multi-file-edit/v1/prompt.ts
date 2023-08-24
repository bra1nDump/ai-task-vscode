import { OpenAiMessage } from 'helpers/openai'
import { FileContext } from '../../chase-bread/command'

/**
 * Diff generation with these proms has been kind of underwhelming, I have attributed thus to the approach itself
 * I have suggested the alternative of splitting the target code location into a separate task
 * And only then generating the new codes. I think that is still a more promising, but I can squeeze out more performance from thus with better prompts.
 *
 * Provide smaller examples
 * Provide more truncated examples
 * Provide initial file content in a similar format (already doing this?)
 *
 * I should probably flatten out the examples to avoid further confusing the model
 *   alternatively I should strip the extra indentation programmatically before submitting the prompts
 *   ... but that's work
 */

const diffGeneratorPromptPrefix = (breadIdentifier: string) => `
- You are a coding assistant that generates incremental file edits.
- You will be given typescript files contents as input and you need to generate changes to that file based on the comments provided when ${breadIdentifier} is mentioned, sometimes they're more informational rather than suggesting an edit.
- Its okay to not modify a file at all. Think if its needed to accomplish the task described by the collction of ${breadIdentifier} comments.
- Start by changing the files that you are most confident about.
- Respect indentation of the original range you are replacing.
- Here are some example input / output pairs. The xml comments are for explanation purposes only and should be not be included in the output.

Examples:
`

export const typescriptHelloWorldParametrizationMultiFileExample = (
  breadIdentifier: string,
) =>
  `
The following output assumes you were given two files to work with.

<change>
  <path>src/hello-world.ts</path>
  <description>Parametrising function with a name of the thing to be greeted</description>
  <range-to-replace>
function helloWorld() {
    // ${breadIdentifier} pass name to be greeted
    console.log('Hello World');
}
</range-to-replace>
  <!-- The new content to replace the old content between the prefix and suffix -->
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
 * I anticipate jsx generation will be tough as the model will probably get confused
 * on whether it's the output format or the actual content of code blocks.
 *
 * Things will actually break if people use the same tags within their code such as file (I believe a legitimate Html tag)
 * For instance this file will probably not get edited correctly. I should probably use more esoteric tag names.
 */
export const editMiddleOfAJsxExpressionEnsureIndentIsPreserved = (
  breadIdentifier: string,
) =>
  `
Given this file:

<file>
  <path>counter.ts</path>
  <content>
// @${breadIdentifier} Don't print out a list simply print out a single element with the counter
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

The following is a reasonable response:
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

Notice the indentation is respected from the original file
`

export const pythonRewriteBigPortionOfTheCodeWithTruncation = (
  breadIdentifier: string,
) => `
Assumed you were given this file:

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

The following is a reasonable change to make:

<change>
  <path>src/quicksort.py</path>
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

Notice the use of </truncated>. Use it when the range you were replacing is large. Ranges over 5 lines long should be truncated.
Notice the indentation within the code blocks is respected.
`

export const allDiffV1Examples = (breadIdentifier: string) => [
  typescriptHelloWorldParametrizationMultiFileExample(breadIdentifier),
  pythonRewriteBigPortionOfTheCodeWithTruncation(breadIdentifier),
]

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
    filesContextXmlPromptSystemMessage,
    // I'm putting the dbff prompt after the file content since currently I'm more concerned with the output format correctness
    // And my limited 'knowledge' says that you should put important things last.
    divPromptSystemMessage,
    {
      content:
        '1. Output a rough plan of the changes and the changes themselves you want to make.\n' +
        `   Pay special attention to ${breadIdentifier} mentions, they shuold guide the diff generation.\n` +
        '   Your plan should only address the requested changes.\n' +
        '2. Next output with generated file changes for the files you see fit. Remember to follow the \n' +
        '   Do not forget to truncate long range-to-replaces.\n',
      role: 'user',
    },
  ]
}
