
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
<path>src/document-helpers/document-snapshot.ts</path>
<content>
/*
The problem this is solving:
On we're submitting files to the LLM we're submitting a snapshot.
 * As the LLM responds with the changes to be applied to the file, the file
 * might have already changed due to user actions or other LLM edits. The
 * format that the LLM responds with is a line range in the old file.
 * Once the LLM picks range to change, it streams in the new content to be used
 * as a replacement for the original range. The way the changes are applied is
 * we replace the full range with the new content every time the new content is
 * updated.

 * The idea is to take a snapshot of a document, while doing so subscribe to
 * the onDidChangeTextDocument event. Continuously collect all contentChanges
 * that happen to the document.
 * Provide a method toCurrentDocumentRange(rangeInSnapshot: LineRange) to
 * convert the line range from the original snapshot to the range in the
 * current document.

Consider this example usage of the API:

```
const documentSnapshot = new DocumentSnapshot(document)
const originalDocumentText = fileSnapshot.getSnapshotText

Original text:
`Line 0
Line 1
Line 2
Line 3
Line 4
Line 5
`
```

```ts
// The outer loop is responsible for getting the next range to replace
for await (const changeStream = await llm.changeSet()) {
    const rangeInSnapshot = changeStream.rangeInSnapshotToReplace
    for await (const newContent of changeStream.growingReplacement) {
        // We need to get the current range in the document, since it might have shifted due to other edits
        // before this point in time
        const currentTargetRange = fileSnapshot.toCurrentDocumentRange(rangeInSnapshot)

        // Replaced the adjusted original range with the new newContent
        // This replacement will result in the documentSnapshot receiving the update from the onDidChangeTextDocument event

        // and for future calls to toCurrentDocumentRange to return the correct range adjusted for this recent edit, 
        // as well as all the previous edits that happened
        await editor.edit((editBuilder) => {
            editBuilder.replace(currentTargetRange, newContent)
        })
    }
}
```

```
Line ranges are encoded in the following way:
LineRange Ls, Le - Represents the range of Range(Ls, 0, Le, lengthOfLine(Le))


Let's say the LLM responds with the following changes (infer partial states yourself)


Change 0
- rangeInSnapshot: LineRange 0, 0
- Final New Content:
`Line 0
Prepended New Line 0`

    Iteration 0
    - currentTargetRange: LineRange 0, 0
    - newContent: ""
    - explanation: This replaces the 0th line with empty content overriding "Line 0", which does not change the line range within the document.
    
    Iteration 1
    - currentTargetRange: LineRange 0, 0
    - newContent: "Prepended New Line 0" 
    - explanation: Since the previous replace did not have any affect, the range is still empty, and we are adding a new line to the beginning of the document, the range is now LineRange 0, 0. Notice it changed from an empty range to a non-empty range. This is because the line content grew from empty to non-empty

    Iteration 2
    - currentTargetRange: LineRange 0, 0
    - newContent: "Prepended New Line 0\nLine 0" 
    - explanation: This restores the original line. Because we have added a
    between the pretended and the original line, the range is now LineRange 0, 1. This will result in ranges that appear after this range to be shifted down by 1 line.

Document content after fully applying the change:
`Prepended Line 0
Line 0
Line 1
Line 2
Line 3
Line 4
Line 5
`

Change 1
- rangeInSnapshot: LineRange 1, 3
- Final New Content:
`Replaced Line 1
Line 2
Replaced Line 3
Added Line 4`

    Iteration 0
    - currentTargetRange: LineRange 2, 4
    - newContent: ""
    - explanation: This effectively removes line 1-3 (from the snapshot), or lines 2-4 (in the current document) and replaces it with empty content. This sets up the stage for the next edits to be applied. The the original range now becomes lines LineRange 2, 2 after the replacement.
        
    Iteration 1
    - currentTargetRange: LineRange 2, 2
    - newContent: "Replaced Line 1"
    - explanation: The range after this replacement it does not change, since the new content occupies the same line range, now the line is just not empty.

    Iteration 2
    - currentTargetRange: LineRange 2, 2
    - newContent: "Replaced Line 1\nLine 2"
    - explanation: Range after this replacment changes as we have added an additional line to the new content, the range is now LineRange 2, 3.

    Iteration 2.5
    - currentTargetRange: LineRange 2, 3
    - explanation: Sometimes we might recieve not full lines, we need to make sure this gets handled.
    - newContent: "Replaced Line 1\nLine 2\nRe"
    - explanation: Range after this replacment changes as we have added an additional line to the new content, the range is now LineRange 2, 4

    Iteration 3
    - currentTargetRange: LineRange 2, 4
    - newContent: "Replaced Line 1\nLine 2\nReplaced Line 3"
    - explanation: The line range has not changed since the last line simply got longer.

    Iteration 4
    - currentTargetRange: LineRange 2, 4
    - newContent: "Replaced Line 1\nLine 2\nReplaced Line 3\nAdded Line 4"
    - explanation: After applying the final new content the range becomes LineRange 2, 5. We will not call toCurrentDocumentRange anymore but if we did this is the range et with output.

- Document content after fully applying the change:
`Prepended New Line 0
Line 0
Replaced Line 1
Line 2
Replaced Line 3
Added Line 4
Line 4
Line 5
`
```
*/

import {
  workspace,
  Position,
  Range,
  TextDocument,
  TextDocumentContentChangeEvent,
} from 'vscode'
import { FileContext } from './file-context'

export interface LineRange {
  start: number
  end: number
}

export type Result<Value, Error> =
  | { type: 'success'; value: Value }
  | { type: 'error'; error: Error }

export function resultMap<Value, NewValue, Error>(
  f: (value: Value) => NewValue,
  result: Result<Value, Error>,
): Result<NewValue, Error> {
  if (result.type === 'success') {
    return { type: 'success', value: f(result.value) }
  } else {
    return result
  }
}

export class DocumentSnapshot {
  /**
   * The snapshot could have two different formats:
   * - File context verbatim
   * - File context with line numbers
   *
   * This gets decided by the option passed to the constructor.
   *
   * Having cline numbers is useful for:
   * - Disambiguating between lines with the same
   * - Speeding up process of targeting LLM changes to specific lines
   * - Splitting multi file editing into tasks of targeting and editing
   * separately
   *
   * Potential issues:
   * - Without splitting the task line targeting will most work as well. It
   * should still provide improvements in reliability but not in speed in the
   * first iteration
   * - More tokens in the input and output
   */
  public snapshotContext: FileContext

  private contentChanges: TextDocumentContentChangeEvent[] = []

  /**
   * We are keeping the document as reference which might be risky
   * because I'm not sure what happens if the document is closed.
   * Is it still accessible?
   * Maybe write a simple Unittest to test this similar to how I did with
   * VSCode edit apis
   */
  constructor(
    public document: TextDocument,
    public includeLineNumbers: boolean,
  ) {
    const documentContent = document.getText()
    /* @crust we now store both content with lines and without in the same
       field based on the passed in option.
       Your task is to change the code in this function accordingly */

    const path = workspace.asRelativePath(document.uri)

    this.snapshotContext = {
      filePathRelativeToWorkspace: path,
      content: documentContent,
    }

    const contentWithLineNumbers = documentContent
      .split('\n')
      .map((line, index) => `${index}: ${line}`)
      .join('\n')
    this.snapshotContextWithLineNumbers = {
      filePathRelativeToWorkspace: path,
      content: contentWithLineNumbers,
    }

    workspace.onDidChangeTextDocument((change) => {
      if (change.document !== document) {
        return
      }

      this.contentChanges.push(...change.contentChanges)
    })
  }

  toCurrentDocumentLineRange(
    rangeInSnapshot: LineRange,
  ): Result<LineRange, string> {
    /* We need to continuously update the range as we apply the changes
     * since the changes that have arrived are valid for the newest version of
     * the document at the time
     */
    const currentRange: LineRange = { ...rangeInSnapshot }

    /*
     * There are 3 cases we need to handle:
     * 1. The contentChange is strictly before the range we're looking to
     * adjust
     * - Most likely this isn't edit by hand in a different part of the file or
     * this is an LLM changing a different part of the file for cases when
     * we're changing multiple ranges.

     * - We need to find line displacement (difference from new line count to
     * old line count for a given content change). We might need to record this
     * information at the time of the change, since it might need us to access
     * the document. - We need to adjust the range by the line displacement by
     * adding the displacement to the start and end of the currentRangeb

     * 2. The contentChange is strictly after the range we're looking to adjust
     * - This will not effect the range we're looking to adjust, so we can
     * ignore it

     * 3. The contentChange exactly matches the range we're looking to adjust
     * - The most common case. This will constantly happen as the LLM updates
     * the same range with more and more content as it becomes available. -
     * Idea to simplify: I'm now thinking applying only deltas instead of the
     * entire content because we would only need to keep track of a single
     * position where to insert the text. Is will also allow us to edit the
     * code that LLM has already printed out and we might want to change by
     * hand already while it's still working on the rest of that same change.

     * - This is kind of similar to the first case because we also need to find
     * the line displacement. The only differences we only add thus to the end
     * range, because the range is strictly expanding or staying the same when
     * we are simply adding more characters to the last line in the range.

     * 4. Change is an insert in the end of the tracked range. In this case we
     * want to extend the range by an extra line if necessary. Please explain
     * this case similar to the cases above. Please add another case to the if
     * statements below to handle this case.

     * default. The contentChange is partially overlapping the range we're
     * looking to adjust.
     * - This is a complex case that we should not encounter with basic usage.
     * Simply return and error.
      */
    for (const contentChange of this.contentChanges) {
      const lineDisplacement =
        contentChange.text.split('\n').length -
        // Off by one
        1 -
        contentChange.range.end.line +
        contentChange.range.start.line
      if (
        contentChange.range.end.isBefore(new Position(currentRange.start, 0))
      ) {
        // Case 1: contentChange is strictly before the range
        currentRange.start += lineDisplacement
        currentRange.end += lineDisplacement
      } else if (contentChange.range.start.line > currentRange.end) {
        // Case 2: contentChange is strictly after the range
        continue
      } else if (
        /* Not using isEqual because for it to work we would need to know the
           length of the last line in the range at the time that this
           contentChange was applied */
        contentChange.range.start.isEqual(
          new Position(currentRange.start, 0),
        ) &&
        contentChange.range.end.line === currentRange.end
      ) {
        // Case 3: contentChange exactly matches the range
        currentRange.end += lineDisplacement
      } else if (
        contentChange.range.start.line === currentRange.end
        /* We don't store document stayed at that point and time,
         * so we can't check this. Let's just assume it's true for now. The
         * assumption is broken if the user edits the overlapping ranch within
         * document while the LLM is running.
           && contentChange.range.start.character ===
           document.lineAt(currentRange.end).text.length */
      ) {
        /* Case 4: contentChange is an insert in the end of the tracked range
           Extend the range by an extra line if necessary */
        currentRange.end += lineDisplacement
      }
      // Default: contentChange is partially overlapping the range
      else {
        return { type: 'error', error: 'Range is partially overlapping' }
      }
    }

    return { type: 'success', value: currentRange }
  }

  toCurrentDocumentRange(rangeInSnapshot: LineRange): Result<Range, string> {
    return resultMap(
      (lineRange) => lineRangeToVscodeRange(lineRange, this.document),
      this.toCurrentDocumentLineRange(rangeInSnapshot),
    )
  }
}

/**
 * Translation requires document because we need to 1 how long the last line in
 * the range is
 */
export function lineRangeToVscodeRange(
  lineRange: LineRange,
  document: TextDocument,
): Range {
  return new Range(
    lineRange.start,
    0,
    lineRange.end,
    document.lineAt(lineRange.end).text.length,
  )
}

/**
 * Lossy translation to line range.
 * I'm not sure when we would want to use this, but it's here if we need it.
 * I anticipate we might want to use this when we process the text document
 * change events to converting the line ranges.
 */
export function vscodeRangeToLineRange(range: Range): LineRange {
  return { start: range.start.line, end: range.end.line }
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
<file>
<path>src/document-helpers/document-snapshot.test.ts</path>
<content>
import * as vscode from 'vscode'
import * as assert from 'assert'

import { DocumentSnapshot, vscodeRangeToLineRange } from './document-snapshot'

suite('DocumentSnapshot', () => {
  setup(async () => {
    // Close all editors prior to opening new ones
    await vscode.commands.executeCommand('workbench.action.closeAllEditors')
  })

  test('Works correctly on a simple example from the API design', async function () {
    const initialContent = `Line 0
Line 1
Line 2
Line 3
Line 4
Line 5
`
    const expectedContentAfterEdits = `Prepended New Line 0
Line 0
Replaced Line 1
Line 2
Replaced Line 3
Added Line 4
Line 4
Line 5
`
    const doc = await vscode.workspace.openTextDocument({
      content: initialContent,
    })
    const editor = await vscode.window.showTextDocument(doc)
    const documentSnapshot = new DocumentSnapshot(editor.document)

    // See more details on this example in header for DocumentSnapshot
    const changes = [
      {
        rangeInSnapshot: { start: 0, end: 0 },
        rangeInCurrentDocumentBeforeApplying: { start: 0, end: 0 },
        content: '',
      },
      {
        rangeInSnapshot: { start: 0, end: 0 },
        rangeInCurrentDocumentBeforeApplying: { start: 0, end: 0 },
        content: 'Prepended New Line 0',
      },
      {
        rangeInSnapshot: { start: 0, end: 0 },
        rangeInCurrentDocumentBeforeApplying: { start: 0, end: 0 },
        content: 'Prepended New Line 0\nLine 0',
      },
      {
        rangeInSnapshot: { start: 1, end: 3 },
        rangeInCurrentDocumentBeforeApplying: { start: 2, end: 4 },
        content: '',
      },
      {
        rangeInSnapshot: { start: 1, end: 3 },
        rangeInCurrentDocumentBeforeApplying: { start: 2, end: 2 },
        content: 'Replaced Line 1',
      },
      {
        rangeInSnapshot: { start: 1, end: 3 },
        rangeInCurrentDocumentBeforeApplying: { start: 2, end: 2 },
        content: 'Replaced Line 1\nLine 2',
      },
      {
        rangeInSnapshot: { start: 1, end: 3 },
        rangeInCurrentDocumentBeforeApplying: { start: 2, end: 3 },
        content: 'Replaced Line 1\nLine 2\nRe',
      },
      {
        rangeInSnapshot: { start: 1, end: 3 },
        rangeInCurrentDocumentBeforeApplying: { start: 2, end: 4 },
        content: 'Replaced Line 1\nLine 2\nReplaced Line 3',
      },
      {
        rangeInSnapshot: { start: 1, end: 3 },
        rangeInCurrentDocumentBeforeApplying: { start: 2, end: 4 },
        content: 'Replaced Line 1\nLine 2\nReplaced Line 3\nAdded Line 4',
      },
    ]

    for (const change of changes) {
      const rangeInSnapshot = change.rangeInSnapshot
      const content = change.content

      await new Promise((resolve) => setTimeout(resolve, 10)) // Artificial delay

      const currentTargetRange =
        documentSnapshot.toCurrentDocumentRange(rangeInSnapshot)

      if (currentTargetRange.type === 'error') {
        assert.fail(currentTargetRange.error)
      } else {
        const lineRangeToBeReplaced = vscodeRangeToLineRange(
          currentTargetRange.value,
        )
        assert.deepStrictEqual(
          lineRangeToBeReplaced,
          change.rangeInCurrentDocumentBeforeApplying,
        )
        await editor.edit((editBuilder) => {
          editBuilder.replace(currentTargetRange.value, content)
        })

        /* console.log(
         * `\n\nDocument after replacing line range
         * ${lineRangeToBeReplaced.start}-${lineRangeToBeReplaced.end} with
         * '${content}':`,
           )
           console.log(editor.document.getText()) */
      }
    }

    assert.equal(editor.document.getText(), expectedContentAfterEdits)
  })

  /* We first replace it with the line with different content. Next we insert a
     new line character and the content for the next line. Asserted the
     original line range 0-0 expanded to include the second line because the
     insert extended the range. */
  test('Inserts at the end of the track range extend it', async function () {
    const initialContent = `Original Line`
    const expectedContentAfterEdits = `New Line\nAdded Line Dummy`

    const doc = await vscode.workspace.openTextDocument({
      content: initialContent,
    })
    const editor = await vscode.window.showTextDocument(doc)
    const documentSnapshot = new DocumentSnapshot(editor.document)

    const changes = [
      {
        rangeInSnapshot: { start: 0, end: 0 },
        rangeInCurrentDocumentBeforeApplying: { start: 0, end: 0 },
        content: 'New Line',
      },
      {
        rangeInSnapshot: { start: 0, end: 0 },
        rangeInCurrentDocumentBeforeApplying: { start: 0, end: 0 },
        content: 'New Line\nAdded Line',
      },
      /* This loss change is simply to assert the range after applying the
         previous change */
      {
        rangeInSnapshot: { start: 0, end: 0 },
        /* The range is expanded to include the second line because the insert
           extended the range. */
        rangeInCurrentDocumentBeforeApplying: { start: 0, end: 1 },
        content: 'New Line\nAdded Line Dummy',
      },
    ]

    for (const change of changes) {
      const rangeInSnapshot = change.rangeInSnapshot
      const content = change.content

      await new Promise((resolve) => setTimeout(resolve, 10)) // Artificial delay

      const currentTargetRange =
        documentSnapshot.toCurrentDocumentRange(rangeInSnapshot)

      if (currentTargetRange.type === 'error') {
        assert.fail(currentTargetRange.error)
      } else {
        const lineRangeToBeReplaced = vscodeRangeToLineRange(
          currentTargetRange.value,
        )
        assert.deepStrictEqual(
          lineRangeToBeReplaced,
          change.rangeInCurrentDocumentBeforeApplying,
        )
        /* Check if the current text within the range we are replacing is a
         * suffix of the new content. If that is the case find the delta and
         * insert it at the end of the range instead of replacing the full
         * range. We are emulating the optimization we're doing on the apply
         * edits where we convert a replacement to an insertat
         */
        await editor.edit((editBuilder) => {
          const currentContent = editor.document.getText(
            currentTargetRange.value,
          )
          if (content.startsWith(currentContent)) {
            const delta = content.slice(currentContent.length)

            editBuilder.insert(currentTargetRange.value.end, delta)
          } else {
            editBuilder.replace(currentTargetRange.value, content)
          }
        })
      }
    }
    assert.equal(editor.document.getText(), expectedContentAfterEdits)
  })
})

</content>
</file>
```

## [user]:
```md
Here's a list of compilation errors in some of the files:
File: src/document-helpers/document-snapshot.ts
Error message: Property 'snapshotContextWithLineNumbers' does not exist on type 'DocumentSnapshot'.
Range:
- Line start 227
- Line end 227


File: src/document-helpers/document-snapshot.test.ts
Error message: Expected 2 arguments, but got 1.
Range:
- Line start 32
- Line end 32
Related info: An argument for 'includeLineNumbers' was not provided.

File: src/document-helpers/document-snapshot.test.ts
Error message: Expected 2 arguments, but got 1.
Range:
- Line start 130
- Line end 130
Related info: An argument for 'includeLineNumbers' was not provided.


- Most likely this is due to a refactor user has started but not finished
- Based on @crust mentions and the errors you should guess what was the refactor in the first place
- Collect all relevant information about the refactor that might help you fix the errors

Addressing errors:
- Often the location of the error is not the place that you want to make changes to
- Make sure you're not masking the compile error, but rather making required changes to the logic of the program


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
Based on the provided context, the task is to refactor the DocumentSnapshot class to store two separate snapshot contexts - one including line numbers and one without line numbers. This is decided based on the `includeLineNumbers` option passed to the constructor of the DocumentSnapshot class. The snapshots are used to keep track of changes happening in the document due to actions like user edits or edits from the Language Server (LLM). 

Specific instructions for the task include:
- Modify the constructor of the DocumentSnapshot class to create and store a snapshot with line numbers if the `includeLineNumbers` option is set to true.
- Modify the tests in `document-snapshot.test.ts` file to pass the `includeLineNumbers` option while creating the DocumentSnapshot object.

Note: A portion of the task seems to have been accomplished already, but not entirely. The constructor of DocumentSnapshot class is already modified to create two separate snapshots. However, it's storing both snapshots in different fields. This needs to be corrected to store both snapshots in the `snapshotContext` field based on the `includeLineNumbers` option.
</task>

<change>
<path>src/document-helpers/document-snapshot.ts</path>
<range-to-replace>
const documentContent = document.getText();
const path = workspace.asRelativePath(document.uri);

this.snapshotContext = {
  filePathRelativeToWorkspace: path,
  content: documentContent,
};

const contentWithLineNumbers = documentContent
  .split('\n')
  .map((line, index) => `${index}: ${line}`)
  .join('\n');
this.snapshotContextWithLineNumbers = {
  filePathRelativeToWorkspace: path,
  content: contentWithLineNumbers,
};
</range-to-replace>
<description>
Context: inside the constructor of DocumentSnapshot class
1: Get document content and its relative path
2: If `includeLineNumbers` option is true, add line numbers to the document content
3: Store the snapshot context with or without line numbers in `snapshotContext` field based on `includeLineNumbers` option
</description>
<replacement>
const documentContent = document.getText();
const path = workspace.asRelativePath(document.uri);

let snapshotContent = documentContent;
if (this.includeLineNumbers) {
  snapshotContent = documentContent
    .split('\n')
    .map((line, index) => `${index}: ${line}`)
    .join('\n');
}

this.snapshotContext = {
  filePathRelativeToWorkspace: path,
  content: snapshotContent,
};
</replacement>
</change>

<change>
<path>src/document-helpers/document-snapshot.test.ts</path>
<range-to-replace>
const documentSnapshot = new DocumentSnapshot(editor.document);
</range-to-replace>
<description>
Context: inside the tests of DocumentSnapshot class
1: Create a DocumentSnapshot object with `includeLineNumbers` option set to true
</description>
<replacement>
const documentSnapshot = new DocumentSnapshot(editor.document, true);
</replacement>
</change>

<change>
<path>src/document-helpers/document-snapshot.test.ts</path>
<range-to-replace>
const documentSnapshot = new DocumentSnapshot(editor.document);
</range-to-replace>
<description>
Context: inside the tests of DocumentSnapshot class
1: Create a DocumentSnapshot object with `includeLineNumbers` option set to true
</description>
<replacement>
const documentSnapshot = new DocumentSnapshot(editor.document, true);
</replacement>
</change>