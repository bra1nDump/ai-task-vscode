
# Messages submitted:

## [system]:
```md

- You are a coding assistant that generates incremental file changes
- You will be given files along with some task
- You might generate changes to some file if it's necessary to accomplish the task
- Start by making changes you are most confident about
- Respect indentation of the original range you are replacing
- If you're only replacing a single line, only print out that line as a target range
- Avoid replacing large ranges if most of the code remains the same. Instead use multiple smaller targeted changes

Examples:

Given two files (omitted for brevity) and a task to make changes based on crust mentions. The following are acceptable changes to generate.
<change>
<path>src/hello-world.ts</path>
<description>Parametrising function with a name of the thing to be greeted</description>
<range-to-replace>
function helloWorld() {
    // crust pass name to be greeted
    console.log('Hello World');
}
</range-to-replace>
<replacement>
function hello(name: string) {
    console.log(`Hello ${name}`);
}
</replacement>
</change>
<change>
<path>src/main.ts</path>
<description>Use hello world from a helper module and use environment variable to get the user name</description>
<range-to-replace>
// crust use hello world from a helper module and use environment variable to get the user name
</range-to-replace>
<replacement>
import { hello } from './helper';
const name = process.env.USER_NAME || 'World';
hello(name);
</replacement>
</change>



Given two files (omitted for brevity) and a task to make changes based on crust mentions. The following are acceptable changes to generate.
<change>
<path>src/hello-world.ts</path>
<description>Parametrising function with a name of the thing to be greeted</description>
<range-to-replace>
function helloWorld() {
    // crust pass name to be greeted
    console.log('Hello World');
}
</range-to-replace>
<replacement>
function hello(name: string) {
    console.log(`Hello ${name}`);
}
</replacement>
</change>
<change>
<path>src/main.ts</path>
<description>Use hello world from a helper module and use environment variable to get the user name</description>
<range-to-replace>
// crust use hello world from a helper module and use environment variable to get the user name
</range-to-replace>
<replacement>
import { hello } from './helper';
const name = process.env.USER_NAME || 'World';
hello(name);
</replacement>
</change>



Given this file:
<file>
<path>src/quicksort.py</path>
<content>
# @crust Refactor thus using recursion
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

Given a task to address @crust comments, the following is a reasonable change to make. Notice the use of </truncated>. Use it when the range you were replacing is large. Ranges over 5 lines long should be truncated.
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


```

## [system]:
```md
Given files:
<file>
<path>src/multi-file-edit/v1/parse.ts</path>
<content>
import {
  extractXmlElementsForTag,
  extractSingleXmlElement,
  trimUpToOneTrailingNewLine,
  trimUpToOneLeadingNewLine,
} from 'xml/parser'
import { TargetRange, LlmGeneratedPatchXmlV1, FileChange } from './types'

/*
For reference the new format is

@crust Notice the new format of the plan.
Old format relied on having a markdown list of items, which is not very flexible.

Old format:
- Item 1
- Item 2

New format supports any content within the tags:
<plan>
Some free thoughts without particular structure

- Plan item one
</plan>

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
*/
export function parsePartialMultiFileEdit(xml: string): LlmGeneratedPatchXmlV1 {
  // Plan is encoded using - as a bullet point for each item
  // Extract the plan before the first change tag
  const planItems: string[] = []
  const [planSection] = xml.split('<change>')
  // Extract plan items using regex,
  // account for first item being in the beginning of the string or on a new line
  const planItemsRegex = /(?:^|\n)- (.*)/g
  let match: RegExpExecArray | null
  while ((match = planItemsRegex.exec(planSection)) !== null)
    planItems.push(match[1])

  const fileChangeOutputs = extractXmlElementsForTag(xml, 'change')

  // TODO: Drop the new lines right after opening tags range-to-replace and replacement and right before closing tags

  const fileChanges = fileChangeOutputs.map((fileChangeOutput): FileChange => {
    const path = extractSingleXmlElement(fileChangeOutput.content, 'path')
    const description = extractSingleXmlElement(
      fileChangeOutput.content,
      'description',
    )
    const oldChunk = extractSingleXmlElement(
      fileChangeOutput.content,
      'range-to-replace',
    )

    // Handle case where old chunk is truncated
    // Warning: Partial truncated printing out will still show
    const oldChunkParts = oldChunk?.content.split('</truncated>') ?? []
    let oldChunkContent: TargetRange

    if (!oldChunk)
      oldChunkContent = {
        type: 'fullContentRange',
        isStreamFinalized: false,
        fullContent: '',
      }
    else if (oldChunkParts.length === 2) {
      // Similar logic to the one embedded in the Xml parsing for regular tags
      const prefixContent = trimUpToOneTrailingNewLine(oldChunkParts[0])
      const suffixContent = trimUpToOneLeadingNewLine(oldChunkParts[1])
      oldChunkContent = {
        type: 'prefixAndSuffixRange',
        prefixContent,
        suffixContent,
        isStreamFinalized: oldChunk.isClosed,
      }
    } else if (oldChunkParts.length === 1)
      oldChunkContent = {
        type: 'fullContentRange',
        fullContent: oldChunk.content,
        isStreamFinalized: oldChunk.isClosed,
      }
    else throw new Error('Unexpected number of old chunk parts')

    const newChunk = extractSingleXmlElement(
      fileChangeOutput.content,
      'replacement',
    )

    // Strange code due to switching the encoding from multiple changes within a single file tag
    // to a more flat xml encoding but keeping the old data structure
    // Ideally we want to group the changes by file, but the hell with it for now
    const singularChangeForAFile = {
      description: description?.content ?? '',
      oldChunk: oldChunkContent,
      newChunk: {
        content: newChunk?.content ?? '',
        isStreamFinalized: newChunk?.isClosed ?? false,
      },
    }

    return {
      filePathRelativeToWorkspace: path?.content,
      change: singularChangeForAFile,
      isStreamFinilized: fileChangeOutput.isClosed,
    }
  })

  return {
    changes: fileChanges,
    isStreamFinalizedUnused: false,
    plan: planItems,
  }
}

</content>
</file>
<file>
<path>src/multi-file-edit/v1/index.ts</path>
<content>
import * as vscode from 'vscode'

import {
  FileContext,
  fileContextSystemMessage,
} from 'document-helpers/file-context'
import { OpenAiMessage, streamLlm } from 'helpers/openai'
import { from } from 'ix/asynciterable'

import { startInteractiveMultiFileApplication } from 'multi-file-edit/applyResolvedChange'
import { parsePartialMultiFileEdit } from './parse'
import { makeToResolvedChangesTransformer } from './resolveTargetRange'
import { multiFileEditV1FormatSystemMessage } from './prompt'
import { SessionContext } from 'session'
import { queueAnAppendToDocument } from 'helpers/vscode'

import { map as mapAsync } from 'ix/asynciterable/operators'

export async function startMultiFileEditing(
  taskPrompt: string,
  breadIdentifier: string,
  sessionContext: SessionContext,
) {
  const outputFormatMessage =
    multiFileEditV1FormatSystemMessage(breadIdentifier)

  const fileContexts = sessionContext.documentManager.getFileContexts()
  const fileContextMessage = fileContextSystemMessage(fileContexts)

  const userTaskMessage: OpenAiMessage = {
    role: 'user',
    content: `Your task: ${taskPrompt}
You should first output a bullet list plan of action roughly describing each change you want to make. The format should be:
- Plan item one
- Item two

Next you should output changes if nessesary as outlined by the format previously.
`,
  }
  const messages = [outputFormatMessage, fileContextMessage, userTaskMessage]

  const highLevelLogger = (text: string) =>
    queueAnAppendToDocument(
      sessionContext.markdownHighLevelFeedbackDocument,
      text,
    )

  const lowLevelLogger = (text: string) =>
    queueAnAppendToDocument(
      sessionContext.markdownLowLevelFeedbackDocument,
      text,
    )

  const logFilePath = (fileContext: FileContext) => {
    const path = fileContext.filePathRelativeToWorkspace
    // Assumes we are in .bread/sessions
    void highLevelLogger(`- [${path}](../../${path})\n`)
  }

  // Log files that we are submitting as context
  void highLevelLogger(`\n# Files submitted:\n`)
  for (const fileContext of fileContexts) logFilePath(fileContext)

  // Provider pointer to low level log for debugging, it wants a relative to workspace path for some reason
  // The document path is .bread/sessions/<id>-<weekday>.raw.md, so we need to go up two levels since the
  // markdown file we are outputing to is in .bread/sessions as well
  // Likely not windows friendly as it uses /
  const relativePath = vscode.workspace.asRelativePath(
    sessionContext.markdownLowLevelFeedbackDocument.uri.path,
  )
  void highLevelLogger(`## [Raw LLM input + response](../../${relativePath})\n`)

  const [rawLlmResponseStream, abortController] = await streamLlm(
    messages,
    lowLevelLogger,
  )

  // Abort if requested
  sessionContext.sessionAbortedEventEmitter.event(() => abortController.abort())

  // Design Shortcoming due to multi casting
  // Parsing will be performed multiple times for the same payload, see openai.ts
  const parsedPatchStream = from(rawLlmResponseStream).pipe(
    mapAsync(({ cumulativeResponse, delta }) => {
      // Try parsing the xml, even if it's complete it should still be able to apply the diffs
      return parsePartialMultiFileEdit(cumulativeResponse)
    }),
  )

  // Split the stream into stream with plan and changes to apply
  // Process in parallell
  // Currently has an issue where I am unable to log the delta and am forced to wait until an item is fully generated
  // Refactor: Parsing should pass deltas or I need to implement local delta generation
  async function showPlanAsItBecomesAvailable() {
    const planStream = parsedPatchStream.pipe(mapAsync((x) => x.plan))
    const loggedPlanIndexWithSuffix = new Set<string>()
    void highLevelLogger(`\n# Plan:\n`)
    for await (const plan of planStream)
      for (const [index, item] of plan.entries()) {
        // Find the last suffix that was logged
        const latestVersion = `${index}: ${item}`
        const lastLoggedVersion = [...loggedPlanIndexWithSuffix]
          .filter((x) => x.startsWith(`${index}:`))
          .sort((a, b) => b.length - a.length)[0]
        // Only logged the delta or the first version including the item separator
        if (lastLoggedVersion) {
          const delta = latestVersion.slice(lastLoggedVersion.length)
          void highLevelLogger(delta)
        } else void highLevelLogger(`\n- ${item}`)

        loggedPlanIndexWithSuffix.add(latestVersion)
      }
  }

  async function startApplication() {
    const patchSteam = from(
      parsedPatchStream,
      makeToResolvedChangesTransformer(sessionContext.documentManager),
    )
    await startInteractiveMultiFileApplication(patchSteam, sessionContext)
  }

  await Promise.all([showPlanAsItBecomesAvailable(), startApplication()])
}

</content>
</file>
```

## [user]:
```md
Your task: Fix these problems: File: src/multi-file-edit/v1/parse.ts
Error message: Type 'string[]' is not assignable to type 'string'.
Range:
- Line start 125
- Line end 125
Related info: The expected type comes from property 'plan' which is declared here on type 'LlmGeneratedPatchXmlV1'

File: src/multi-file-edit/v1/index.ts
Error message: Property 'entries' does not exist on type 'string'.
Range:
- Line start 98
- Line end 98


File: src/multi-file-edit/v1/index.ts
Error message: 'delta' is declared but its value is never read.
Range:
- Line start 83
- Line end 83


File: src/multi-file-edit/v1/index.ts
Error message: Unsafe call of an `any` typed value.
Range:
- Line start 98
- Line end 98

}
You should first output a bullet list plan of action roughly describing each change you want to make. The format should be:
- Plan item one
- Item two

Next you should output changes if nessesary as outlined by the format previously.

```

# [assistant, latest response]:
```md
<change>
  <path>src/multi-file-edit/v1/parse.ts</path>
  <description>Change the type of 'plan' in 'LlmGeneratedPatchXmlV1' from 'string' to 'string[]'</description>
  <range-to-replace>
export function parsePartialMultiFileEdit(xml: string): LlmGeneratedPatchXmlV1 {
</range-to-replace>
  <replacement>
export function parsePartialMultiFileEdit(xml: string): LlmGeneratedPatchXmlV1[] {
</replacement>
</change>

<change>
  <path>src/multi-file-edit/v1/index.ts</path>
  <description>Change the type of 'plan' from 'string' to 'string[]' and remove unused 'delta'</description>
  <range-to-replace>
const planStream = parsedPatchStream.pipe(mapAsync((x) => x.plan))
</range-to-replace>
  <replacement>
const planStream = parsedPatchStream.pipe(mapAsync((x) => x.plan[]))
</replacement>
</change>

<change>
  <path>src/multi-file-edit/v1/index.ts</path>
  <description>Remove unused 'delta'</description>
  <range-to-replace>
const [rawLlmResponseStream, abortController] = await streamLlm(
    messages,
    lowLevelLogger,
  )
</range-to-replace>
  <replacement>
const [rawLlmResponseStream] = await streamLlm(
    messages,
    lowLevelLogger,
  )
</replacement>
</change>

<change>
  <path>src/multi-file-edit/v1/index.ts</path>
  <description>Fix unsafe call of an `any` typed value</description>
  <range-to-replace>
for (const [index, item] of plan.entries()) {
</range-to-replace>
  <replacement>
for (const [index, item] of Object.entries(plan)) {
</replacement>
</change>