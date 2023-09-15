
# Messages submitted:

## [system]:
```md
How to make a multi file change.

Suggestions:
- Only make changes based on your task
- Only replace logically complete chunks of code. Avoid replacing sub expressions. Examples:
  - A body of small function
  - A block of code surrounded with new lines
  - A for loop and some variables defined right before it
- Avoid replacing large ranges if most of the code remains the same. Instead use multiple smaller targeted changes
- Make sure symbols you are using are available in scope or define them yourself

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

Given a task to address @crust comments, the following is a reasonable change to make. Notice the use of </truncated>. Use it only two truncate range to replace when it is large (over 5 lines). Never truncate replacement.
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
<path>.crust.md</path>
<content>
This project is a VSCode extension that invokes LLMs to help users edit their code files using natural language.
All the code is in typescript and nothing should have an any type.

</content>
</file>
<file>
<path>src/multi-file-edit/applyResolvedChange.ts</path>
<content>
import * as vscode from 'vscode'
import { AsyncIterableX, last as lastAsync } from 'ix/asynciterable'
import { SessionContext } from 'session'
import { queueAnAppendToDocument } from 'helpers/vscode'
import { ResolvedChange } from './types'
import { targetRangeHighlightingDecoration } from './targetRangeHighlightingDecoration'

/**
 * Currently top level extension command invokes this after applying v1
 * specific transformations to resolve the changes.
 * I think top level extension command should only call a single function from v1
 * and that function in turn will use this application function.
 */
export async function startInteractiveMultiFileApplication(
  growingSetOfFileChanges: AsyncIterableX<ResolvedChange[]>,
  context: SessionContext,
) {
  await Promise.allSettled([
    // It would be nice to have access to LLM stream here (or elsewhere )
    // so we can show the user the prompt that was used to generate the changes, along with the changes
    // This is to get more realtime feedback and for debugging
    showFilesOnceWeKnowWeWantToModifyThem(growingSetOfFileChanges, context),
    highlightTargetRangesAsTheyBecomeAvailable(
      growingSetOfFileChanges,
      context,
    ),
    applyChangesAsTheyBecomeAvailable(growingSetOfFileChanges, context),
    showWarningWhenNoFileWasModified(growingSetOfFileChanges, context),
  ])
}

export type ChangeApplicationResult =
  | 'appliedSuccessfully'
  | 'failedToApplyCanRetry'

async function applyChangesAsTheyBecomeAvailable(
  growingSetOfFileChanges: AsyncIterableX<ResolvedChange[]>,
  context: SessionContext,
) {
  const appliedChangesIndices = new Set<number>()
  for await (const changesForMultipleFiles of growingSetOfFileChanges)
    for (const [index, change] of changesForMultipleFiles.entries())
      if (
        !appliedChangesIndices.has(index) &&
        // We only want to start applying once we know the range we are replacing
        change.rangeToReplaceIsFinal
      ) {
        await applyResolvedChangesWhileShowingTheEditor(change)

        // Add the index to the set of applied changes once the change we applied is final
        if (change.replacementIsFinal) appliedChangesIndices.add(index)
      }
}

async function highlightTargetRangesAsTheyBecomeAvailable(
  growingSetOfFileChanges: AsyncIterableX<ResolvedChange[]>,
  context: SessionContext,
) {
  const highlightedChanges = new Set<number>()
  const finalizedChanges = new Set<number>()
  const highlightingRemovalTimeouts = new Map<number, NodeJS.Timeout>()
  for await (const changesForMultipleFiles of growingSetOfFileChanges)
    for (const [index, change] of changesForMultipleFiles.entries()) {
      // As long as the change is not finalized (or we have not cancelled the session)
      // we want to keep highlighting alive.
      // This code continuously clears out that old timer and creates a new one for every time a change updates.
      if (!finalizedChanges.has(index)) {
        // Clear the timeout if it exists
        const previousTimeout = highlightingRemovalTimeouts.get(index)
        if (previousTimeout) clearTimeout(previousTimeout)

        // Set a new timeout to clear the highlighting, this implementation also handles when we abort the session
        // Assumption: LLM produces at least a token a second
        const timeout = setTimeout(() => {
          // Only dehighlight of the editor is visible
          const editor = vscode.window.visibleTextEditors.find(
            (editor) => editor.document.uri.path === change.fileUri.path,
          )
          editor?.setDecorations(targetRangeHighlightingDecoration, [])
        }, 1000)
        highlightingRemovalTimeouts.set(index, timeout)

        // Mark as finalized only once the replacement stopped changing.
        // This effectively starts the timer to remove the highlighting.
        if (change.replacementIsFinal) finalizedChanges.add(index)
      }

      // Highlight the range if it was not already highlighted
      if (!highlightedChanges.has(index) && change.rangeToReplace) {
        // Decorations can only be set on active editors
        const editor = await vscode.window.showTextDocument(change.fileUri)
        // We want to show the user the area we're updating
        editor.revealRange(
          change.rangeToReplace,
          vscode.TextEditorRevealType.InCenter,
        )

        // Set the decoration, vscode automatically keeps track of the decoration ranges
        // so no need to keep them up to date, they will expand with the content
        // WARNING: Only works if we don't replace the range, I think apending should work
        editor.setDecorations(targetRangeHighlightingDecoration, [
          change.rangeToReplace,
        ])

        if (change.replacementIsFinal) highlightedChanges.add(index)
      }
    }
}

async function showFilesOnceWeKnowWeWantToModifyThem(
  growingSetOfFileChanges: AsyncIterableX<ResolvedChange[]>,
  context: SessionContext,
) {
  const shownChangeIndexes = new Set<string>()
  for await (const changesForMultipleFiles of growingSetOfFileChanges)
    for (const change of changesForMultipleFiles)
      if (!shownChangeIndexes.has(change.fileUri.fsPath)) {
        const document = await vscode.workspace.openTextDocument(change.fileUri)
        const relativeFilepath = vscode.workspace.asRelativePath(change.fileUri)
        await queueAnAppendToDocument(
          context.markdownHighLevelFeedbackDocument,
          `\n### Modifying: ${relativeFilepath}\n`,
        )
        await vscode.window.showTextDocument(document)
        shownChangeIndexes.add(change.fileUri.fsPath)
      }
}

async function showWarningWhenNoFileWasModified(
  growingSetOfFileChanges: AsyncIterableX<ResolvedChange[]>,
  context: SessionContext,
) {
  const finalSetOfChangesToMultipleFiles = await lastAsync(
    growingSetOfFileChanges,
  )
  if (!finalSetOfChangesToMultipleFiles)
    await queueAnAppendToDocument(
      context.markdownHighLevelFeedbackDocument,
      '\n## No files got changed thats strange\n',
    )
}

export async function applyResolvedChangesWhileShowingTheEditor(
  resolvedChange: ResolvedChange,
): Promise<ChangeApplicationResult> {
  const document = await vscode.workspace.openTextDocument(
    resolvedChange.fileUri,
  )
  const editor = await vscode.window.showTextDocument(document)

  /*
  This will throw if the editor has been de allocated! 
  This is likely to happen if the user switches tabs while we are applying the changes
  We don't want everything to fail simply because the user switched tabs or closed it.

  The issue was discovered when awaiting all the changes to be applied creating a race condition for the active editor.
  For the time being I will basically do serial applications similar to how we do it in the extension()

  Ideally we should support two ways of applying changes:
  1. Apply changes to the current editor
  2. Apply changes to the document in the background

  We can try to perform the edit on the editor, and if fails we will perform it on the document.
  Ideally we also want to prevent opening the same editor multiple times within the session.
  This most likely will require another abstraction to keep track of things we have already shown to the user.
  */

  debug('Applying change to editor')
  debug('Document before replacement', document.getText())
  const { start, end } = resolvedChange.rangeToReplace
  debug(
    `Replacing range: ${start.line}, ${start.character} - ${end.line}, ${end.character}`,
  )
  debug('Replacing content:', document.getText(resolvedChange.rangeToReplace))
  debug('With:', resolvedChange.replacement)

  // @crust Currently were replacing the full range even if the range is mostly the same. We should check if the old content is a prefix of the new content. If that is the case we should instead use an insert at position of the end of the old content and insert the delta between the old and the new content. write the code below.
  const isApplicationSuccessful = await editor.edit((editBuilder) => {
    editBuilder.replace(
      resolvedChange.rangeToReplace,
      resolvedChange.replacement,
    )
  })

  debug('Document after replacement', document.getText())

  return isApplicationSuccessful
    ? 'appliedSuccessfully'
    : 'failedToApplyCanRetry'
}

function debug(...args: any[]) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  // console.log(...args)
}

</content>
</file>
```

## [user]:
```md


Your task is spread out across multiple files with main goals tagged with @crust
```

## [system]:
```md
Creating thoughts:
- Collect all of the information relevant to the task the user is trying to accomplish and restate the task
- Restate any specific instructions that the user has already provided on how to accomplish the task 
- Sometimes parts of the task are already accomplished, clearly state so and consider it stale instructions
- Your detailed plan to accomplish the task

Format:
<thoughts>
{{restating the task and any specific instructions the user has provided}}
{{detailed plan on how to accomplish the task}}
</thoughts>

Creating changes:
- Right after the thoughts block output any changes following "How to make a multi file change"
- Provide a detailed plan for each change using <description>...</description>

First output thoughts, then changes
```

# [assistant, latest response]:
```md
<thoughts>
The task requires modifying multiple files based on the @crust tags. The goal is to ensure that no variables are of the type 'any' in the Typescript code, and only replace the logical chunks of code as per the guidelines. 

The specific instructions from the @crust tags mention replacing the full range even if the range is mostly the same. The proposed solution is to check if the old content is a prefix of the new content. If that is the case, instead of replacing the entire range, the change should be inserted at the position of the end of the old content and insert the delta between the old and the new content. 

The detailed plan would include going over each file and identifying @crust tags. Based on the instructions in the tag, appropriate changes would be made. In the given example, the specific code modification would be made in the 'applyResolvedChangesWhileShowingTheEditor' function in 'src/multi-file-edit/applyResolvedChange.ts' file. 
</thoughts>

<change>
<path>src/multi-file-edit/applyResolvedChange.ts</path>
<description>Replace the existing logic for applying changes with the logic that checks if the old content is a prefix of the new content and inserts the delta between the old and the new content at the end of the old content instead of replacing the entire range</description>
<range-to-replace>
const isApplicationSuccessful = await editor.edit((editBuilder) => {
    editBuilder.replace(
      resolvedChange.rangeToReplace,
      resolvedChange.replacement,
    )
  })
</range-to-replace>
<replacement>
let isApplicationSuccessful;
const oldContent = document.getText(resolvedChange.rangeToReplace);
if (resolvedChange.replacement.startsWith(oldContent)) {
    const delta = resolvedChange.replacement.substr(oldContent.length);
    isApplicationSuccessful = await editor.edit((editBuilder) => {
        editBuilder.insert(
            resolvedChange.rangeToReplace.end,
            delta,
        )
    });
} else {
    isApplicationSuccessful = await editor.edit((editBuilder) => {
        editBuilder.replace(
            resolvedChange.rangeToReplace,
            resolvedChange.replacement,
        )
    });
}
</replacement>
</change>