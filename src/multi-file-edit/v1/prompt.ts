import { FileContext, transformFileContextWithLineNumbers } from 'context/types'
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

/*
 * I have roughly enabled planning again, I have noticed the tasks are very
 * verbose but don't help guide the model. Right now the prompt is kind of
 * messy
 * CURRENTLY NO PLANNING ENABLED for simplification and speed reasons.
 * Planning is very important as chain of thought prompting is currently
 * state of the art. There's also structure chain of thought which promises
 * to be better https://arxiv.org/pdf/2305.06599.pdf
 *
 * I'm considering to move pseudocode algorithms for the replacement into the
 * examples for the diff generation prompt. I'm hoping by reducing locality
 * it will improve the quality of the replacement.
 */

/*
 * Missing examples:
 * More truncation
 * Example with multiple edits within the same file (for imports for example)
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

  /*
   * Do we need to say your input? Doesn't matter for performance using a
   * system or user message? It feels like I should be using the user here
   */
  const inputWithFiles: OpenAiMessage = {
    content: optionalStaticContent + filesContextXmlPrompt,
    role: 'user',
  }

  const messages = [multiFileEditPromptMessage, inputWithFiles]
  return messages
}

/*
 *Removed, I think its redundant with the examples
 * First output how you understand the task along with compact key ideas. Use
 * technical style of writing and be concise. Immediately after you will output
 * changes.
 */
const multiFileEditPrompt = (configuration: SessionConfiguration) =>
  `You are a coding assistant.
You will be given editable files with line numbers and optional information blobs as input.
User provides the task using @${
    configuration.taskIdentifier
  } mentions within your input.
Other mentions @${'run'}, @${'tabs'}, @${'errors'} are not directly part of the task.

Your output should address the task by making file changes, creating new files and running shell commands (assume macOS).
Only address the task you are given and do not make any other changes.
The task might be not well specified and you should use your best judgment on what the user might have meant.
The task might be partially completed, only make changes to address the remaining part of the task.

Notes:
If <range-to-replace> is longer than five lines you must use </truncated> to shorten it (see examples).
Never use </truncated> or other means of truncation within <replacement> - it should always contain exactly the replacement for <range-to-replace>.
You can make multiple edits within the same file, for example to add imports in the beginning of the file and make more changes elsewhere.

Examples of your input and output pairs follow.

${[
  typescriptHelloWorldParametrizationMultiFileExampleV2WithInsert(
    configuration,
  ),
  editMiddleOfAJsxExpressionEnsureIndentIsPreserved(configuration),
  truncationExample(configuration),
  allowingToCreateNewFilesAndRunShellCommands(configuration),
  refactoringExampleWithNewFunction(configuration),
]
  // Some examples might be empty based on the configuration, skip them
  .filter((example) => example !== '')
  .join('\n\n')}
`
    // Add comments within the prompt more easily
    .replace(/\s*####[\s\S]*?####/g, '')

const refactoringExampleWithNewFunction = (
  configuration: SessionConfiguration,
) => {
  const breadIdentifier = configuration.taskIdentifier
  let editableFileContext: FileContext = {
    filePathRelativeToWorkspace: 'server.ts',
    content: `import express from 'express'
import { config } from './environment'
import axios from 'axios'

const app = express()

const diagramsToTest = [ // range-start-diagrams
  \`graph TD
  A-->B\`,
  \`graph TD
  X-->Y
  Y-->Z\`
] // range-end-diagrams
// range-start-after-diagrams
app.get('/health-basic', async (req, res) => {  // range-start-health-checks
  try {
    const diagramSource = diagramsToTest[0]
    const response = await axios.post(\`\${config.renderingServiceHost}/convert\`, { diagramSource })

    if (response.data?.miroBoardLink) {
      res.status(200).send('OK')
    } else {
      res.status(500).send('Server is not healthy')
    }
  } catch (error) {
    res.status(500).send('Server is not healthy')
  }
})

app.get('/health', async (req, res) => {
  try {
    for (const diagramSource of diagramsToTest) {
      const response = await axios.post(\`\${config.renderingServiceHost}/convert\`, { diagramSource })

      if (!response.data?.miroBoardLink) {
        res.status(500).send('Server is not healthy')
        return
      }
    }
    res.status(200).send('OK')
  } catch (error) {
    res.status(500).send('Server is not healthy')
  }
}) // range-end-health-checks

app.listen(3000)
`,
  }

  if (configuration.includeLineNumbers) {
    editableFileContext =
      transformFileContextWithLineNumbers(editableFileContext)
  }

  const editableFileContextWithoutRangeAnnotations = {
    ...editableFileContext,
    content: removeRangeAnnotations(editableFileContext.content),
  }

  const fileContextPromptPart = mapFileContextToXml(
    editableFileContextWithoutRangeAnnotations,
  )

  /**
   * Steps:
   * - Add new file with example diagrams
   * - Add import for the new file (append after all imports)
   * - Remove old diagrams
   * - Create a helper function for /health and /health-basic (13: is the line
   * after diagramsToTest is declared)
   * - Use the helper function in /health and /health-basic
   *
   * Thoughts:
   * should we update language?:
   * <change> -> <replace>
   * <range-to-replace> -> <range>
   * new <insert-after>
   * new <delete>
   * new <move>
   *
   * More work, might futher confuse the model, as models get smarter would
   * work better and deliver faster experience.
   */
  return `Input:
<information-blob>@${breadIdentifier} Move test diagrams to a different file, create a helper for /health and /health-basic</information-blob>

${fileContextPromptPart}

<change>
<path>exampleDiagrams.ts</path>
<range-to-replace>
0:
</range-to-replace>
<replacement>
export const diagramsToTest = [
  \`graph TD
  A-->B\`,
  \`graph TD
  X-->Y
  Y-->Z\`
]
</replacement>
</change>

<change>
<path>server.ts</path>
<range-to-replace>
3:
</range-to-replace>
<replacement>
import { diagramsToTest } from './exampleDiagrams'

</replacement>
</change>

<change>
<path>server.ts</path>
<range-to-replace>
${extractMatchingLineRange(
  editableFileContext.content,
  'range-start-diagrams',
  'range-end-diagrams',
)}
</range-to-replace>
<replacement>
</replacement>
</change>

<change>
<path>server.ts</path>
<range-to-replace>
${extractMatchingLineRange(
  editableFileContext.content,
  'range-start-after-diagrams',
  'range-start-after-diagrams',
)}
</range-to-replace>
<replacement>
function returnOkIfAllRenderSuccessfully(diagramsToTest: string[], res: express.Response) {
  try {
    for (const diagramSource of diagramsToTest) {
      const response = await axios.post(\`\${config.renderingServiceHost}/convert\`, { diagramSource })

      if (!response.data?.miroBoardLink) {
        res.status(500).send('Server is not healthy')
        return
      }
    }
    res.status(200).send('OK')
  } catch {
    res.status(500).send('Server is not healthy')
  }
}

<change>
<path>server.ts</path>
<range-to-replace>
${extractMatchingLineRange(
  editableFileContext.content,
  'range-start-health-checks',
  'range-end-health-checks',
)}
</range-to-replace>
<replacement>
app.get('/health-basic', async (req, res) => {
  returnOkIfAllRenderSuccessfully([diagramsToTest[0]], res)
}

app.get('/health', async (req, res) => {
  returnOkIfAllRenderSuccessfully(diagramsToTest, res)
})
</replacement>
<change>
`
}

const typescriptHelloWorldParametrizationMultiFileExampleV2WithInsert = (
  configuration: SessionConfiguration,
) => {
  const breadIdentifier = configuration.taskIdentifier
  /*
   * let greeterFileContext: FileContext = {
   *   filePathRelativeToWorkspace: 'src/greet.ts',
   *   content: ``,
   * }
   */

  let mainFileContext: FileContext = {
    filePathRelativeToWorkspace: 'src/main.ts',
    content: `// @${breadIdentifier} Refactor by extracting and parametrizing a greeting function into a helper file. Read user name from the process arguments
console.log('Hello World');
`,
  }

  if (configuration.includeLineNumbers) {
    // greeterFileContext = transformFileContextWithLineNumbers(greeterFileContext)
    mainFileContext = transformFileContextWithLineNumbers(mainFileContext)
  }

  /*
   * const greeterTargetRange = extractMatchingLineRange(
   *   greeterFileContext.content,
   *   '',
   *   '',
   * )
   */

  const rangeToReplace2 = extractMatchingLineRange(
    mainFileContext.content,
    `// @${breadIdentifier} Refactor by extracting and parametrizing a greeting function into a helper file. Read user name from the process arguments`,
    `console.log('Hello World');`,
  )

  /*
   * I'm sort of reverting to structured prompting,
   * aka writing out a pretty detailed plan for the changes, still keeping the
   * old 'algorithm' stuff around
   *
   * TODO: Try removing range-to-replace and see if it helps with new file
   * creation more reliably ... though we don't have test cases to verify, its
   * a hunch
   */

  return `Input: 
${mapFileContextToXml(mainFileContext)}

Output:
<task>
- Refactor \`main.ts\` by extracting and parametrizing a greeting function into a helper file. Read user name from the process arguments
- In new file \`greet.ts\` create \`greet(name: string)\`
- In \`main.ts\`
  - Get username from argv[2]
  - Use \`greet\` function to greet the user
</task>

<change>
<path>src/greet.ts</path>
<range-to-replace>
0:
</range-to-replace>
<replacement>
export function greet(name: string) {
  console.log(\`Hello \${name}\`);
}
</replacement>
</change>

<change>
<path>src/main.ts</path>
<range-to-replace>
${rangeToReplace2}
</range-to-replace>
<replacement>
import { greet } from './greet';

const name = process.argv[2] ?? 'No name provided';
greet(name);
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
    filePathRelativeToWorkspace: 'Inventory.tsx',
    content: `// @${configuration.taskIdentifier} only show list of items
const Inventory = (props: { allItemNamesForPurchase: string[] }) => {
  return <div>{allItemNamesForPurchase.length}</div>;
}`,
  }

  if (configuration.includeLineNumbers) {
    editableFileContext =
      transformFileContextWithLineNumbers(editableFileContext)
  }
  const fileContextPromptPart = mapFileContextToXml(editableFileContext)

  let optionalAlgorithm = ''
  if (false) {
    /*
     * Change this condition based on your logic for including optional
     * description.
     */
    optionalAlgorithm = `<description>
  Context: jsx subexpression
  Symbols in scope: count, setCount
  Algorithm:
  Replace the unordered list with a single div showing the count value
  </description>`
  }

  const rangeToReplace = extractMatchingLineRange(
    editableFileContext.content,
    'return <div>{allItemNamesForPurchase.length}</div>;',
    'return <div>{allItemNamesForPurchase.length}</div>;',
  )

  return `Input:
${fileContextPromptPart}

Output:
<task>
- \`Inventory\` shows number of items, should show the list of item names instead
- Replace the div with a ul with li elements for each item name
</task>

<change>
<path>Inventory.ts</path>
<range-to-replace>
${rangeToReplace}
</range-to-replace>${optionalAlgorithm}
<replacement>
  return (
    <ul>
      {Array.from({ length: count },
        (_, i) =>
          <li key={i}>Item {i + 1}</li>)
      }
    </ul>
  );
</replacement>
</change>
`
}

const truncationExample = (configuration: SessionConfiguration) => {
  let editableFileContext: FileContext = {
    filePathRelativeToWorkspace: 'duplicate.ts',
    content: `// @${configuration.taskIdentifier} optimize
function deduplicate(array: number[]): number[] {
  const result: number[] = [];
  for (const item of array) {
    if (!result.includes(item)) {
      result.push(item);
    }
  }
  return result;
}`,
  }

  if (configuration.includeLineNumbers) {
    editableFileContext =
      transformFileContextWithLineNumbers(editableFileContext)
  }
  const fileContextPromptPart = mapFileContextToXml(editableFileContext)

  const rangeToReplace = extractMatchingLineRange(
    editableFileContext.content,
    'function deduplicate(array: number[]): number[] {',
    '}',
  )

  /*
   * <--! Use </truncated> to shorten the range to replace if they are longer
   * than 6 lines. Never truncate replacement.
   * -->
   */

  return `Input:
${fileContextPromptPart}

Output:
<task>
- Optimize \`deduplicate\`
- \`deduplicate\` uses \`Array.includes\`
- Use \`Set\` instead, duplicates are not added
</task>

<change>
<path>duplicate.ts</path>
<range-to-replace>
${rangeToReplace}
</range-to-replace>
<replacement>
function deduplicate(array: number[]): number[] {
  const uniqueSet = new Set<number>();
  for (const item of array) {
    // Duplicate items will not be added to the set
    uniqueSet.add(item);
  }
  return Array.from(uniqueSet);
}
</replacement>
</change>`
}

function allowingToCreateNewFilesAndRunShellCommands(
  configuration: SessionConfiguration,
) {
  if (
    configuration.includeLineNumbers === false ||
    configuration.enableNewFilesAndShellCommands === false
  ) {
    console.log(
      'Skipping new file and command example because of configuration',
    )
    /*
     * Ideally we should return undefined here to signal to not include this
     * example
     */
    return ''
  }

  const breadIdentifier = configuration.taskIdentifier
  let editableFileContext: FileContext = {
    filePathRelativeToWorkspace: 'src/helloWorld.ts',
    content: `// @${breadIdentifier} create a main file that calls hello world. Compile and run it.
function helloWorld() {
  console.log('Hello World');
}`,
  }

  if (configuration.includeLineNumbers) {
    editableFileContext =
      transformFileContextWithLineNumbers(editableFileContext)
  }

  const fileContextPromptPart = mapFileContextToXml(editableFileContext)

  return `Input:
${fileContextPromptPart}

Output:
<task>
- In new file \`main.ts\` import and call \`helloWorld\`
- Compile with \`tsc\` and run with \`node\`
</task>

<change>
<path>main.ts</path>
<range-to-replace>
0:
</range-to-replace>
<replacement>
import { helloWorld } from './helloWorld';

helloWorld();
</replacement>
</change>

<terminal-command>
tsc main.ts helloWorld.ts && node main.js
</terminal-command>
`
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
