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
   CURRENTLY NO PLANNING ENABLED for simplification and speed reasons.
   Planning is very important as chain of thought prompting is currently
   state of the art. There's also structure chain of thought which promises
   to be better https://arxiv.org/pdf/2305.06599.pdf
   
   I'm considering to move pseudocode algorithms for the replacement into the
   examples for the diff generation prompt. I'm hoping by reducing locality
   it will improve the quality of the replacement.
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

/*
Removed, I think its redundant with the examples 
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
The task might be partially completed, only make changes to address the remaining part of the task.

Format notes:
Use </truncated> to shorten <range-to-replace> if it is longer than 5 lines.
Never use </truncated> or other means of truncation within <replacement> - type out exactly what should replace the <range-to-replace>.

Examples of your input and output pairs follow.

${[
  typescriptHelloWorldParametrizationMultiFileExampleV2WithInsert(
    configuration,
  ),
  editMiddleOfAJsxExpressionEnsureIndentIsPreserved(configuration),
  truncationExample(configuration),
  allowingToCreateNewFilesAndRunShellCommands(configuration),
]
  // Some examples might be empty based on the configuration, skip them
  .filter((example) => example !== '')
  .join('\n\n')}
`
    // Add comments within the prompt more easily
    .replace(/\s*####[\s\S]*?####/g, '')

const typescriptHelloWorldParametrizationMultiFileExampleV2WithInsert = (
  configuration: SessionConfiguration,
) => {
  const breadIdentifier = configuration.taskIdentifier
  /* let greeterFileContext: FileContext = {
       filePathRelativeToWorkspace: 'src/greet.ts',
       content: ``,
     } */

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

  /* const greeterTargetRange = extractMatchingLineRange(
       greeterFileContext.content,
       '',
       '',
     ) */

  const rangeToReplace2 = extractMatchingLineRange(
    mainFileContext.content,
    `// @${breadIdentifier} Refactor by extracting and parametrizing a greeting function into a helper file. Read user name from the process arguments`,
    `console.log('Hello World');`,
  )

  /* I'm sort of reverting to structured prompting,
   * aka writing out a pretty detailed plan for the changes, still keeping the
   * old 'algorithm' stuff around
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

  /* <--! Use </truncated> to shorten the range to replace if they are longer
     than 6 lines. Never truncate replacement.
     --> */

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
    /* Ideally we should return undefined here to signal to not include this
       example */
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

/**
 * This function overall sucks because its flacky, should probably error out if
 * multiple matches are found, instead I will return last one for end term and
 * first one for start term.
 *
 * IDEA: A better version would be to add // start // end comments in the code
 * and use those to find the range.
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
  const lineRange = lines.slice(startLineIndex, endLineIndex + 1)

  /* Including two lines in the front and in the end because the last line
   * would often be a closing bracket which might make it harder for the modal
   * to reason about the range ending
   *
   * Currently unused
   */
  if (lineRange.length > 3) {
    const truncatedLineRange = [
      ...lineRange.slice(0, 2),
      '<truncated/>',
      ...lineRange.slice(lineRange.length - 2),
    ]
    return truncatedLineRange.join('\n')
  }

  return lineRange.join('\n')
}
