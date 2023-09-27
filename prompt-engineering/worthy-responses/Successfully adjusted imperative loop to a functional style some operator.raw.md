
# Messages submitted:

## [system]:
```md
You are a coding assistant.
You will be given editable files with line numbers and optional information blobs as input.
Your task is defined by @task mentions within your input.
You will address the task by making changes to some files.
Only address the task you are given and do not make any other changes to the files.
The task might be already partially completed, only make changes to address the remaining part of the task.
You will first output how you understand the task along with compact key ideas.
Immediately after you will output changes.

Changes format notes:
Use </truncated> to shorten <range-to-replace> if it is longer than 5 lines. Never truncate replacement.

Examples of your input and output pairs follow.

Input: 
<file>
<path>src/main.ts</path>
<content>
0:// @task Refactor by extracting and parametrizing a greeting function into a helper file
1:console.log('Hello World');
2:
</content>
</file>

<file>
<path>src/greet.ts</path>
<content>
0:
</content>
</file>

Output:
<task>
Move greeting code from `main.ts` to `greeter.ts`. Parametrize the greeting function to accept a name to be greeted. Use the new function in `main.ts` to greet the user found in the `USER_NAME` environment variable defaulting to `World`.
</task>

<change>
<path>src/greet.ts</path>
<range-to-replace>
0:
</range-to-replace>
<replacement>
export function hello(name: string) {
    console.log(`Hello ${name}`);
}
</replacement>
</change>
<change>
<path>src/main.ts</path>
<range-to-replace>
0:// @task Refactor by extracting and parametrizing a greeting function into a helper file
1:console.log('Hello World');
</range-to-replace>
<replacement>
import { hello } from './helper';
const name = process.env.USER_NAME || 'World';
hello(name);
</replacement>
</change>


Input:
<file>
<path>counter.ts</path>
<content>
0:// @task use a single div instead of a list to show the count
1:const Counter: React.FC = () => {
2:  const [count, setCount] = useState<number>(0);
3:
4:  return (
5:    <div>
6:      <button onClick={() => count > 0 && setCount(count - 1)}>-</button>
7:      <button onClick={() => setCount(count + 1)}>+</button>
8:      <ul>
9:        {Array.from({ length: count },
10:         (_, i) =>
11:           <li key={i}>Item {i + 1}</li>)
12:        }
13:      </ul>
14:    </div>
15:  );
16:};
</content>
</file>

Output:
<task>
Use a single div instead of a list to show the count.
</task>

<change>
<path>counter.ts</path>
<range-to-replace>
8:      <ul>
9:        {Array.from({ length: count },
10:         (_, i) =>
11:           <li key={i}>Item {i + 1}</li>)
12:        }
13:      </ul>
</range-to-replace>
<replacement>
      <div>{count}</div>
</replacement>
</change>


Input:
<file>
<path>duplicate.ts</path>
<content>
0:// @task optimize
1:function deduplicate(arr: number[]): number[] {
2:  const result: number[] = []
3:  for (const item of arr) {
4:    if (!result.includes(item)) {
5:      result.push(item)
6:    }
7:  }
8:  return result
9:};
</content>
</file>

Output:
<task>
Optimize the function. 
Key ideas: Let's use a set to keep track of unique items.
</task>

<change>
<path>duplicate.ts</path>
<range-to-replace>
1:function deduplicate(arr: number[]): number[] {
2:  const result: number[] = []
<truncated/>
8:  return result
9:};
</range-to-replace>
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

## [user]:
```md
<information-blob>Coding style for the project:
- Prefer functional style using map filter and similar operators instead of loops when appropriate
- Don't use any type or declare variables without a type, unless it can be inferred from the value being assigned</information-blob>

<file>
<path>src/chase-bread/command.ts</path>
<content>
0:import * as vscode from 'vscode'
1:import {
2:  findAndCollectBreadMentionedFiles,
3:  findAndCollectDotBreadFiles,
4:  getFilesContent,
5:} from 'document-helpers/file-search'
6:import { openedTabs } from 'helpers/vscode'
7:import { SessionContext, getBreadIdentifier } from 'session'
8:import { queueAnAppendToDocument } from 'helpers/vscode'
9:import { closeSession, startSession } from 'session'
10:import { startMultiFileEditing } from 'multi-file-edit/v1'
11:import { projectDiagnosticEntriesWithAffectedFileContext } from 'helpers/diagnostics'
12:
13:/**
14: * Generates and applies diffs to files in the workspace containing @bread
15: * mention.
16: *
17: * Collect all files in workspace with @bread mention
18: * Pack the files along with the diff generation prompts
19: * Call openai api (through langchain)
20: * Parse the diffs
21: * Apply them to the current file in place
22: */
23:export async function completeInlineTasksCommand(this: {
24:  extensionContext: vscode.ExtensionContext
25:  sessionRegistry: Map<string, SessionContext>
26:}) {
27:  if (this.sessionRegistry.size !== 0) {
28:    console.log(`Existing session running, most likely a bug with @run + enter`)
29:    return
30:  }
31:
32:  const sessionContext = await startSession(this.extensionContext)
33:  this.sessionRegistry.set(sessionContext.id, sessionContext)
34:
35:  void queueAnAppendToDocument(
36:    sessionContext.markdownHighLevelFeedbackDocument,
37:    '> Running ai-task\n',
38:  )
39:
40:  // Functionality specific to bread mentions
41:  const breadIdentifier = getBreadIdentifier()
42:  const fileUrisWithBreadMentions =
43:    await findAndCollectBreadMentionedFiles(breadIdentifier)
44:  if (fileUrisWithBreadMentions.length === 0) {
45:    void vscode.window.showErrorMessage(
46:      `No bread found, ai-task are getting hungry. Remember to add @${breadIdentifier} mention to at least one file in the workspace.`,
47:    )
48:    await closeSession(sessionContext)
49:    return
50:  }
51:
52:  await sessionContext.documentManager.addDocuments(
53:    'Files with bread mentions',
54:    fileUrisWithBreadMentions,
55:  )
56:
57:  /* .task files */
58:  const dotBreadFileUris = await findAndCollectDotBreadFiles(breadIdentifier)
59:  const breadFileBlobs = await getFilesContent(dotBreadFileUris)
60:  sessionContext.documentManager.addBlobContexts(breadFileBlobs)
61:
62:  /* Before we have proper task expression parsing,
63:   * we will just search all task files for a mention of special
64:   * sub-expressions
65:   */
66:  const breadMentionsFilesContent = await getFilesContent(
67:    fileUrisWithBreadMentions,
68:  )
69:
70:  // @task change to match project style @run space
71:  let includeTabs = false
72:  for (const fileContent of breadMentionsFilesContent) {
73:    if (fileContent.includes('@tabs')) {
74:      includeTabs = true
75:      break
76:    }
77:  }
78:  if (includeTabs) {
79:    const openTabsFileUris = openedTabs()
80:    await sessionContext.documentManager.addDocuments(
81:      'Open tabs',
82:      openTabsFileUris,
83:    )
84:  }
85:
86:  // Provide problems context
87:  const diagnosticsAlongWithTheirFileContexts =
88:    projectDiagnosticEntriesWithAffectedFileContext()
89:  const fileUrisWithProblems = diagnosticsAlongWithTheirFileContexts.map(
90:    (x) => x.uri,
91:  )
92:  await sessionContext.documentManager.addDocuments(
93:    'Files with problems',
94:    fileUrisWithProblems,
95:  )
96:
97:  /* Provide optional problem context + prompt
98:  Refactor: This should move to a static context provider */
99:  const problemContext = diagnosticsAlongWithTheirFileContexts
100:    .flatMap(({ uri, diagnostic }) => {
101:      if (diagnostic.severity !== vscode.DiagnosticSeverity.Error) {
102:        return []
103:      }
104:      const filePathRelativeToWorkspace = vscode.workspace.asRelativePath(uri)
105:
106:      return [
107:        `File: ${filePathRelativeToWorkspace}
108:  Error message: ${diagnostic.message}
109:  Range:
110:  - Line start ${diagnostic.range.start.line}
111:  - Line end ${diagnostic.range.end.line}
112:  ${
113:    diagnostic.relatedInformation
114:      ?.map((info) => `Related info: ${info.message}`)
115:      .join('\n') ?? ''
116:  }
117:  `,
118:      ]
119:    })
120:    .join('\n')
121:
122:  if (problemContext.length !== 0) {
123:    const compilationErrorContext = `Here's a list of compilation errors in some of the files:
124:  ${problemContext}
125:  
126:  - Most likely this is due to a refactor user has started but not finished
127:  - Based on @${breadIdentifier} mentions and the errors you should guess what was the refactor in the first place
128:  - Collect all relevant information about the refactor that might help you fix the errors
129:  
130:  Addressing errors:
131:  - Often the location of the error is not the place that you want to make changes to
132:  - Make sure you're not masking the compile error, but rather making necessary changes to the logic of the program
133:  `
134:
135:    sessionContext.documentManager.addBlobContexts([compilationErrorContext])
136:  }
137:
138:  console.log('fileManager', sessionContext.documentManager.dumpState())
139:
140:  await startMultiFileEditing(sessionContext)
141:
142:  await queueAnAppendToDocument(
143:    sessionContext.markdownHighLevelFeedbackDocument,
144:    '\n\n> Done\n',
145:  )
146:
147:  await closeSession(sessionContext)
148:  this.sessionRegistry.delete(sessionContext.id)
149:}
150:
</content>
</file>
<file>
<path>src/session/index.ts</path>
<content>
0:import { SessionContextManager } from 'document-helpers/document-manager'
1:import * as vscode from 'vscode'
2:
3:export interface SessionConfiguration {
4:  taskIdentifier: string
5:  includeLineNumbers: boolean
6:}
7:
8:export interface SessionContext {
9:  id: string
10:
11:  /**
12:   * Necessary for access to secrets to store API key the user enters */
13:  extensionContext: vscode.ExtensionContext
14:  configuration: SessionConfiguration
15:
16:  /**
17:   * This will be open to the side to show real time feedback of what is
18:   * happening in the session.
19:   */
20:  markdownHighLevelFeedbackDocument: vscode.TextDocument
21:
22:  /**
23:   * This is the document where raw LLM request is logged. This is mostly for
24:   * development.
25:   */
26:  markdownLowLevelFeedbackDocument: vscode.TextDocument
27:
28:  documentManager: SessionContextManager
29:
30:  /**
31:   * When the user closes the editor with high level feedback this is our
32:   * signal to abort the session. Once LLM is running this will be set to a
33:   * function that will abort it.
34:   *
35:   * In the future we will have additional controls, such a suspending,
36:   * aborting subtasks, etc.
37:   */
38:  sessionAbortedEventEmitter: vscode.EventEmitter<void>
39:
40:  /**
41:   * Will fire when the session has ended, if the session was aborted is
42:   * expected to be called after it. If it is not called, that means the
43:   * command most likely has a bug related to aborting. Will be disposed right
44:   * after.
45:   */
46:  sessionEndedEventEmitter: vscode.EventEmitter<void>
47:
48:  /**
49:   * This is a list of subscriptions that will be disposed when the session is
50:   * closed.
51:   */
52:  subscriptions: vscode.Disposable[]
53:}
54:
55:export async function startSession(
56:  context: vscode.ExtensionContext,
57:): Promise<SessionContext> {
58:  const {
59:    sessionMarkdownHighLevelFeedbackDocument,
60:    sessionMarkdownLowLevelFeedbackDocument,
61:  } = await createSessionLogDocuments()
62:
63:  const cachedActiveEditor = vscode.window.activeTextEditor
64:
65:  // Since we're opening to the side the focus is not taken
66:  await vscode.commands.executeCommand(
67:    'markdown.showPreviewToSide',
68:    sessionMarkdownHighLevelFeedbackDocument.uri,
69:  )
70:
71:  // Restore the focus
72:  if (cachedActiveEditor) {
73:    await vscode.window.showTextDocument(
74:      cachedActiveEditor.document,
75:      cachedActiveEditor.viewColumn,
76:    )
77:  }
78:
79:  /* Create document manager that will help us backdate edits throughout this
80:     sessiong */
81:  const documentManager = new SessionContextManager(true)
82:
83:  // Create an event emitter to notify anyone interested in session aborts
84:  const sessionAbortedEventEmitter = new vscode.EventEmitter<void>()
85:  /* Another emitter for when session ends no matter if it was aborted or it
86:     has run its course */
87:  const sessionEndedEventEmitter = new vscode.EventEmitter<void>()
88:
89:  const textDocumentCloseSubscription = vscode.window.tabGroups.onDidChangeTabs(
90:    ({ closed: closedTabs }) => {
91:      /* input contains viewType key: 'mainThreadWebview-markdown.preview'
92:         Label has the format 'Preview <name of the file>' */
93:      if (
94:        closedTabs.find((tab) => {
95:          /* Trying to be mindful of potential internationalization of the word
96:             'Preview' */
97:          const abortSignalDocumentName =
98:            sessionMarkdownHighLevelFeedbackDocument.uri.path.split('/').at(-1)!
99:          return tab.label.includes(abortSignalDocumentName)
100:        })
101:      ) {
102:        sessionAbortedEventEmitter.fire()
103:      }
104:    },
105:  )
106:
107:  void vscode.window.withProgress(
108:    {
109:      location: vscode.ProgressLocation.Notification,
110:      title: 'ai-task are chasing your bread',
111:      cancellable: true,
112:    },
113:    async (_progress, cancellationToken) => {
114:      // Cancelled from a button on the progress view
115:      cancellationToken.onCancellationRequested(() => {
116:        sessionAbortedEventEmitter.fire()
117:      })
118:
119:      // Does not matter how but the session has ended. Remove the progress.
120:      await new Promise((resolve) => {
121:        sessionEndedEventEmitter.event(resolve)
122:      })
123:    },
124:  )
125:
126:  return {
127:    id: new Date().toISOString(),
128:    extensionContext: context,
129:    configuration: {
130:      taskIdentifier: getBreadIdentifier(),
131:      includeLineNumbers: true,
132:    },
133:    markdownHighLevelFeedbackDocument: sessionMarkdownHighLevelFeedbackDocument,
134:    markdownLowLevelFeedbackDocument: sessionMarkdownLowLevelFeedbackDocument,
135:    documentManager,
136:    sessionAbortedEventEmitter,
137:    sessionEndedEventEmitter,
138:    subscriptions: [textDocumentCloseSubscription],
139:  }
140:}
141:
142:/** Persist session logs and cleanup */
143:export async function closeSession(
144:  sessionContext: SessionContext,
145:): Promise<void> {
146:  await sessionContext.markdownHighLevelFeedbackDocument.save()
147:  await sessionContext.markdownLowLevelFeedbackDocument.save()
148:
149:  /* Schedule closing the editors matching the documents
150:     Communicate to the user that the editors will be closed 
151:     
152:     We can also try closing the tab https://code.visualstudio.com/api/references/vscode-api#TabGroups
153:     I'm wondering if hide is not available only within code insiders
154:
155:   * Either way not sure if we should be closing the feedback preview, copilot
156:   * or continue don't really close their sidebar once they're don
157:     */
158:  /* setTimeout(() => {
159:   * hide is deprecated and the method suggested instead is to close active
160:   * editor - not what I want :(
161:       vscode.window.visibleTextEditors[0].hide()
162:
163:     }, 2000) */
164:
165:  // Dispose all subscriptions
166:  sessionContext.subscriptions.forEach(
167:    (subscription) => void subscription.dispose(),
168:  )
169:  void sessionContext.documentManager.dispose()
170:
171:  // Dispose event emitters
172:  sessionContext.sessionAbortedEventEmitter.dispose()
173:
174:  sessionContext.sessionEndedEventEmitter.fire()
175:  sessionContext.sessionEndedEventEmitter.dispose()
176:}
177:
178:async function findMostRecentSessionLogIndexPrefix(
179:  sessionsDirectory: vscode.Uri,
180:) {
181:  // Check if directory exists before reading
182:  const directoryExists = await vscode.workspace.fs
183:    .stat(sessionsDirectory)
184:    .then(
185:      () => true,
186:      () => false,
187:    )
188:  if (!directoryExists) {
189:    return 0
190:  }
191:
192:  const sessionLogFiles =
193:    await vscode.workspace.fs.readDirectory(sessionsDirectory)
194:  const sessionLogIndexPrefixes = sessionLogFiles.map(([fileName, _]) =>
195:    Number(fileName.split('-')[0]),
196:  )
197:  const mostRecentSessionLogIndexPrefix = Math.max(
198:    ...sessionLogIndexPrefixes,
199:    0,
200:  )
201:  return mostRecentSessionLogIndexPrefix
202:}
203:
204:async function createSessionLogDocuments() {
205:  const taskMagicIdentifier = getBreadIdentifier()
206:  const sessionsDirectory = vscode.Uri.joinPath(
207:    vscode.workspace.workspaceFolders![0].uri,
208:    `.${taskMagicIdentifier}/sessions`,
209:  )
210:
211:  const nextIndex =
212:    (await findMostRecentSessionLogIndexPrefix(sessionsDirectory)) + 1
213:
214:  const shortWeekday = new Date().toLocaleString('en-US', {
215:    weekday: 'short',
216:  })
217:  const sessionNameBeforeAddingTopicSuffix = `${nextIndex}-${shortWeekday}`
218:
219:  // High level feedback
220:  const sessionMarkdownHighLevelFeedbackDocument =
221:    await createAndOpenEmptyDocument(
222:      sessionsDirectory,
223:      `${sessionNameBeforeAddingTopicSuffix}.md`,
224:    )
225:  // Low level feedback
226:  const sessionMarkdownLowLevelFeedbackDocument =
227:    await createAndOpenEmptyDocument(
228:      sessionsDirectory,
229:      `${sessionNameBeforeAddingTopicSuffix}.raw.md`,
230:    )
231:
232:  return {
233:    sessionMarkdownHighLevelFeedbackDocument,
234:    sessionMarkdownLowLevelFeedbackDocument,
235:  }
236:}
237:
238:async function createAndOpenEmptyDocument(
239:  sessionsDirectory: vscode.Uri,
240:  name: string,
241:) {
242:  const highLevelFeedbackPath = vscode.Uri.joinPath(sessionsDirectory, name)
243:  await vscode.workspace.fs.writeFile(highLevelFeedbackPath, new Uint8Array())
244:  // VSCode is known to be slow to update the file system
245:  await new Promise((resolve) => setTimeout(resolve, 100))
246:
247:  const sessionMarkdownHighLevelFeedbackDocument =
248:    await vscode.workspace.openTextDocument(highLevelFeedbackPath)
249:  return sessionMarkdownHighLevelFeedbackDocument
250:}
251:
252:/* Refactor: We probably want a helper function to get the entire configuration
253:   for the session instead of just the bread */
254:export function getBreadIdentifier(): string {
255:  const breadIdentifierFromWorkspace = vscode.workspace
256:    .getConfiguration('ai-task')
257:    .get('taskMentionIdentifier')
258:
259:  /* We are using the environment override for simplified manual and automated
260:     testingbecause As we might be opening single files instead off full
261:     workspace with settings.json. */
262:  const atBreadIdentifierOverride: any =
263:    process.env.AT_BREAD_IDENTIFIER_OVERRIDE ?? breadIdentifierFromWorkspace
264:
265:  const safeAtBreadIdentifierOverride =
266:    typeof atBreadIdentifierOverride === 'string'
267:      ? atBreadIdentifierOverride
268:      : '@' + 'task' // Avoiding the magic string by splitting into half
269:
270:  return safeAtBreadIdentifierOverride
271:}
272:
</content>
</file>
<file>
<path>src/document-helpers/file-search.ts</path>
<content>
0:import * as vscode from 'vscode'
1:
2:import { getDocumentText } from 'helpers/vscode'
3:import { getBreadIdentifier } from 'session'
4:
5:/**
6: * Find all files in the workspace with @breadIdentifier mention
7: */
8:export async function findAndCollectBreadMentionedFiles(
9:  breadIdentifier: string,
10:): Promise<vscode.Uri[]> {
11:  const allFilesInWorkspace = await safeWorkspaceQueryAllFiles()
12:
13:  const fileContexts = await Promise.all(
14:    allFilesInWorkspace.map(
15:      async (fileUri): Promise<vscode.Uri | undefined> => {
16:        const fileText = await getDocumentText(fileUri)
17:        const containsBreadMention = fileText.includes(`@${breadIdentifier}`)
18:
19:        if (containsBreadMention) {
20:          return fileUri
21:        } else {
22:          return undefined
23:        }
24:      },
25:    ),
26:  )
27:
28:  const filteredFileContexts = fileContexts.filter(
29:    (fileContext): fileContext is vscode.Uri => fileContext !== undefined,
30:  )
31:
32:  return filteredFileContexts
33:}
34:
35:/**
36: * Find all files in the workspace with bread sub-extension
37: */
38:export async function findAndCollectDotBreadFiles(
39:  breadIdentifier: string,
40:): Promise<vscode.Uri[]> {
41:  const allFilesInWorkspace = await safeWorkspaceQueryAllFiles()
42:
43:  const fileContexts = allFilesInWorkspace.flatMap((fileUri) => {
44:    const isBreadDotfile = fileUri.path.includes(`.${breadIdentifier}`)
45:
46:    if (isBreadDotfile) {
47:      return [fileUri]
48:    } else {
49:      return []
50:    }
51:  })
52:
53:  return fileContexts
54:}
55:
56:/**
57: * Improvement ideas:
58: * Find a package that does glob and respects .gitignore
59: *
60: * Uggh, it will be kinda tough to create the correct glob pattern
61: * Tests for this functionality https://github.com/microsoft/vscode/blob/69b2435e14e5dbd442df58efcc72c28ad81e1ac2/extensions/configuration-editing/src/test/completion.test.ts#L204
62: * On top of that finding findFiles only accepts a single negative glob
63: * pattern, which is not enough for us Glob pattern docs
64: * https://code.visualstudio.com/api/references/vscode-api#GlobPattern
65: * Note findFiles does not respect the exclude search.exclude, only
66: * filesexclude by default this has caused node_modules to be included in the
67: * search :(
68: *
69: * Relative path match https://code.visualstudio.com/api/references/vscode-api#RelativePattern
70: * Do so for each folder in the workspace
71: * For now lets just hardcode the src folder
72: * I probably should just use a different finder at this point - ignore files
73: * in .gitignore
74: *   this also needs recursive search so ... later
75: */
76:
77:async function safeWorkspaceQueryAllFiles(): Promise<vscode.Uri[]> {
78:  const config = vscode.workspace.getConfiguration('ai-task')
79:
80:  const defaultExcludedDirectories = [
81:    'node_modules',
82:    '.git',
83:    'out',
84:    'dist',
85:    `.${getBreadIdentifier()}`,
86:    '.vscode-test',
87:  ]
88:  const additionalExcludedDirectories =
89:    config.get<string[]>('additionalExcludedDirectories') ?? []
90:  const excludedDirectories = [
91:    ...defaultExcludedDirectories,
92:    ...additionalExcludedDirectories,
93:  ]
94:
95:  const allFilesInWorkspace = await vscode.workspace.findFiles(
96:    '**/*.{ts,md,js,jsx,tsx,html,css,scss,less,json,yml,yaml}',
97:    `**/{${excludedDirectories.join(',')}}`,
98:    1000,
99:  )
100:
101:  if (allFilesInWorkspace.length === 0) {
102:    throw new Error('No files in workspace')
103:  } else if (allFilesInWorkspace.length > 200) {
104:    throw new Error(`Too many files matched: ${allFilesInWorkspace.length}`)
105:  }
106:
107:  return allFilesInWorkspace
108:}
109:
110:export async function getFilesContent(uris: vscode.Uri[]): Promise<string[]> {
111:  return Promise.all(
112:    uris.map(async (uri) => {
113:      const document = await vscode.workspace.openTextDocument(uri)
114:      return document.getText()
115:    }),
116:  )
117:}
118:
</content>
</file>
```

# [assistant, latest response]:
```md
<task>
Change the code to match the project style in the files "command.ts" and "index.ts". 
The specific task mentioned in the "command.ts" file is to replace the loop that checks for the presence of '@tabs' in the file content with a more functional style. 
No specific tasks are mentioned in the "index.ts" file, but the code should still be reviewed and updated to match the project style if necessary.
</task>

<change>
<path>src/chase-bread/command.ts</path>
<range-to-replace>
71:  let includeTabs = false
72:  for (const fileContent of breadMentionsFilesContent) {
73:    if (fileContent.includes('@tabs')) {
74:      includeTabs = true
75:      break
76:    }
77:  }
</range-to-replace>
<replacement>
const includeTabs = breadMentionsFilesContent.some(fileContent => fileContent.includes('@tabs'));
</replacement>
</change>