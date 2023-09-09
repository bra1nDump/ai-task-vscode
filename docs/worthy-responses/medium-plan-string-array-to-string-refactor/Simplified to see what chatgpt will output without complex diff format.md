## [system]:

```md
Given files:
<file>
<path>src/multi-file-edit/v1/index.ts</path>
<content>
import \* as vscode from 'vscode'

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

/\*
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
<path>src/multi-file-edit/v1/test-helpers.ts</path>
<content>
import * as vscode from 'vscode'
import { applyResolvedChangesWhileShowingTheEditor } from '../applyResolvedChange'
import { Change, LlmGeneratedPatchXmlV1 } from './types'
import { makeToResolvedChangesTransformer } from './resolveTargetRange'
import { SessionDocumentManager } from 'document-helpers/document-manager'
import { findSingleFileMatchingPartialPath } from 'helpers/vscode'

export async function resolveAndApplyChangesToSingleFile(
changes: Change[],
editor: vscode.TextEditor,
) {
const sessionDocumentManager = new SessionDocumentManager()
await sessionDocumentManager.addDocuments('test', [editor.document.uri])

const resolver = makeToResolvedChangesTransformer(sessionDocumentManager)
const resolvedChanges = await resolver({
changes: changes.map((change) => ({
change,
isStreamFinilized: true,
filePathRelativeToWorkspace: vscode.workspace.asRelativePath(
editor.document.uri,
),
})),

    // Doesn't matter what we put here, plan is only for informational purposes
    plan: [],
    isStreamFinalizedUnused: false,

})

return Promise.all(
resolvedChanges.map(async (resolvedChange) => {
return await applyResolvedChangesWhileShowingTheEditor(resolvedChange)
}),
)
}

export async function resolveAndApplyChangesToMultipleFiles(
patch: LlmGeneratedPatchXmlV1,
) {
const documentUris = await Promise.all(
patch.changes.map((fileChange) =>
findSingleFileMatchingPartialPath(
fileChange.filePathRelativeToWorkspace!,
).then((x) => x!),
),
)
const sessionDocumentManager = new SessionDocumentManager()
await sessionDocumentManager.addDocuments('test', documentUris)
const resolvedChanges = await makeToResolvedChangesTransformer(
sessionDocumentManager,
)(patch)

// Need to apply serially to hold the application assumption that only a single editor is open at the same time
for (const resolvedChange of resolvedChanges)
await applyResolvedChangesWhileShowingTheEditor(resolvedChange)
}

export const makeTemporaryFileWriterAndOpener = (temporaryFileName: string) => {
const temporaryFileUri = vscode.Uri.joinPath(
vscode.workspace.workspaceFolders![0].uri,
temporaryFileName,
)
// Writes content to a temporary file and opens it in an editor
return async (content: string) => {
await vscode.workspace.fs.writeFile(
temporaryFileUri,
new TextEncoder().encode(content),
)
// TODO: This is a hack to make sure the file is saved to disk before we read it
await new Promise((resolve) => setTimeout(resolve, 200))
const document = await vscode.workspace.openTextDocument(temporaryFileUri)
const editor = await vscode.window.showTextDocument(document)
return editor
}
}

export async function openExistingFile(relativeFilePath: string) {
const fileUri = vscode.Uri.joinPath(
vscode.workspace.workspaceFolders![0].uri,
relativeFilePath,
)
const document = await vscode.workspace.openTextDocument(fileUri)
const editor = await vscode.window.showTextDocument(document)
return editor
}

</content>
</file>
```

## [user]:

```md
Your task: Fix these problems: File: src/multi-file-edit/v1/index.ts
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

File: src/multi-file-edit/v1/parse.ts
Error message: Type 'string[]' is not assignable to type 'string'.
Range:

- Line start 125
- Line end 125
  Related info: The expected type comes from property 'plan' which is declared here on type 'LlmGeneratedPatchXmlV1'

File: src/multi-file-edit/v1/test-helpers.ts
Error message: Type 'never[]' is not assignable to type 'string'.

Paying attention to inline comments with @crust print some plan explaining how you would approach fixing this.
Also print the code snippets that you think you want to modify.
```
