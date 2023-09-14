
# Messages submitted:

## [system]:
```md
Creating changes:
- Only make changes based on your task
- Only replace logically complete chunks of code. Avoid replacing sub expressions. Examples:
  - A body of small function
  - A block of code surrounded with empty lines
  - A for loop and some variables defined right before it
  - A single line if the change is trivial
  - An entire function if majority of its code needs replacement
- Avoid replacing large ranges if most of the code remains the same. Instead use multiple smaller targeted changes
- Make sure symbols you are using are available in scope or define them yourself
- Respect indentation of the original range you are replacing

Examples:

Given two files (omitted for brevity) and a task to make changes based on crust mentions. The following are acceptable changes to generate.
<change>
<path>src/hello-world.ts</path>
<range-to-replace>
function helloWorld() {
    // crust pass name to be greeted
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
    console.log(`Hello ${name}`);
}
</replacement>
</change>
<change>
<path>src/main.ts</path>
<range-to-replace>
// crust use hello world from a helper module and use environment variable to get the user name
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


Given this file:
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


```

## [system]:
```md
Given files:
<file>
<path>src/document-helpers/file-context.ts</path>
<content>
import * as vscode from 'vscode'

import { getDocumentText } from 'helpers/vscode'
import { OpenAiMessage } from 'helpers/openai'

export interface FileContext {
  filePathRelativeToWorkspace: string
  content: string
}

/**
 * Find all files in the workspace with @breadIdentifier mention or with bread
 * sub-extension
 */
export async function findAndCollectBreadedFiles(
  breadIdentifier: string,
): Promise<vscode.Uri[] | undefined> {
  const allFilesInWorkspace = await safeWorkspaceQueryAllFiles()

  const fileContexts = await Promise.all(
    allFilesInWorkspace.map(
      async (fileUri): Promise<vscode.Uri | undefined> => {
        const fileText = await getDocumentText(fileUri)
        const containsBreadMentionOrIsBreadDotfile =
          fileText.includes(`@${breadIdentifier}`) ||
          fileUri.path.includes(`.${breadIdentifier}`)

        if (containsBreadMentionOrIsBreadDotfile) {
          return fileUri
        } else {
          return undefined
        }
      },
    ),
  )

  const filteredFileContexts = fileContexts.filter(
    (fileContext): fileContext is vscode.Uri => fileContext !== undefined,
  )

  if (fileContexts.length === 0) {
    return undefined
  }

  return filteredFileContexts
}

/**
 * Improvement ideas:
 * Find a package that does glob and respects .gitignore
 *
 * Uggh, it will be kinda tough to create the correct glob pattern
 * Tests for this functionality https://github.com/microsoft/vscode/blob/69b2435e14e5dbd442df58efcc72c28ad81e1ac2/extensions/configuration-editing/src/test/completion.test.ts#L204
 * On top of that finding findFiles only accepts a single negative glob
 * pattern, which is not enough for us Glob pattern docs
 * https://code.visualstudio.com/api/references/vscode-api#GlobPattern
 * Note findFiles does not respect the exclude search.exclude, only
 * filesexclude by default this has caused node_modules to be included in the
 * search :(
 *
 * Relative path match https://code.visualstudio.com/api/references/vscode-api#RelativePattern
 * Do so for each folder in the workspace
 * For now lets just hardcode the src folder
 * I probably should just use a different finder at this point - ignore files
 * in .gitignore
 *   this also needs recursive search so ... later
 */
async function safeWorkspaceQueryAllFiles(): Promise<vscode.Uri[]> {
  const allFilesInWorkspace = await vscode.workspace.findFiles(
    '**/*.{ts,md}',
    '**/{node_modules,.git,out,dist,.bread,docs}/**/*',
    1000, // Give more then the limit below so we can throw an error if it exceeds to signal that the glob is bad
  )

  if (allFilesInWorkspace.length === 0) {
    throw new Error('No files in workspace')
  } else if (allFilesInWorkspace.length > 200) {
    throw new Error(`Too many files matched: ${allFilesInWorkspace.length}`)
  }

  return allFilesInWorkspace
}

/**
 * Encode the file contexts into a prompt for the model
 * @param fileContexts - The files to encode
 * @param includeLineNumbers - Whether to include line numbers in the prompt. Keeping this as a parameter to quantify improvements or regressions
 */
export function fileContextSystemMessage(
  fileContexts: FileContext[],
  includeLineNumbers: boolean,
) {
  /* @crust Your task is to Optionally add line numbers starting from zero to the content.
     You should add line numbers in the beginning of each line within the
     content as such 0: line 1\n1: line 2 */
  const filesContextXmlPrompt = fileContexts
    .map(
      (fileContext) =>
        '<file>\n' +
        `<path>${fileContext.filePathRelativeToWorkspace}</path>\n` +
        `<content>\n${fileContext.content}\n</content>\n` +
        '</file>',
    )
    .join('\n')

  const filesContextXmlPromptSystemMessage: OpenAiMessage = {
    content: 'Given files:\n' + filesContextXmlPrompt,
    role: 'system',
  }
  return filesContextXmlPromptSystemMessage
}

</content>
</file>
<file>
<path>.crust.md</path>
<content>
This project is a VSCode extension that invokes LLMs to help users edit their code files using natural language.
All the code is in typescript and nothing should have an any type.

</content>
</file>
```

## [user]:
```md


Your task is spread out across multiple files with main goals tagged with @crust
```

## [system]:
```md
Understanding the task:
- Collect all of the information relevant to the task the user is trying to accomplish and restate the task
- Restate any specific instructions that the user has already provided on how to accomplish the task 
- Used technical style of writing - be concise but do not lose any information
- Parts of the task might be accomplished, clearly state so and consider it stale instructions

Task output format:
<task>
{{restating the task}}
</task>
```

## [system]:
```md
In your next message respond only with the task immediately followed by the changes to be made to the files.
```

# [assistant, latest response]:
```md
<task>
The task is to modify the function `fileContextSystemMessage` to include optional line numbers in the beginning of each line of the content. The line numbers should start from zero. The existing code does not add line numbers to the content.
</task>
<change>
<path>src/document-helpers/file-context.ts</path>
<range-to-replace>
export function fileContextSystemMessage(
  fileContexts: FileContext[],
  includeLineNumbers: boolean,
) {
  /* @crust Your task is to Optionally add line numbers starting from zero to the content.
     You should add line numbers in the beginning of each line within the
     content as such 0: line 1\n1: line 2 */
  const filesContextXmlPrompt = fileContexts
    .map(
      (fileContext) =>
        '<file>\n' +
        `<path>${fileContext.filePathRelativeToWorkspace}</path>\n` +
        `<content>\n${fileContext.content}\n</content>\n` +
        '</file>',
    )
    .join('\n')

  const filesContextXmlPromptSystemMessage: OpenAiMessage = {
    content: 'Given files:\n' + filesContextXmlPrompt,
    role: 'system',
  }
  return filesContextXmlPromptSystemMessage
}
</range-to-replace>
<description>
Context: function
Input: fileContexts: array of FileContext objects, includeLineNumbers: boolean to determine whether to include line numbers or not
Output: OpenAiMessage object
1: For each file context map to a string formatted as a file tag with path and content tags inside
2: If includeLineNumbers is true, prepend each line in the content with its zero-based line number and a colon
3: Join all file strings with a newline in between
4: Return a system message with the joined file strings preceded by "Given files:\n"
</description>
<replacement>
export function fileContextSystemMessage(
  fileContexts: FileContext[],
  includeLineNumbers: boolean,
) {
  const filesContextXmlPrompt = fileContexts
    .map(
      (fileContext) => {
        let content = fileContext.content;
        if (includeLineNumbers) {
          content = fileContext.content.split('\n').map((line, index) => `${index}: ${line}`).join('\n');
        }
        return '<file>\n' +
          `<path>${fileContext.filePathRelativeToWorkspace}</path>\n` +
          `<content>\n${content}\n</content>\n` +
          '</file>';
      }
    )
    .join('\n');

  const filesContextXmlPromptSystemMessage: OpenAiMessage = {
    content: 'Given files:\n' + filesContextXmlPrompt,
    role: 'system',
  }
  return filesContextXmlPromptSystemMessage
}
</replacement>
</change>