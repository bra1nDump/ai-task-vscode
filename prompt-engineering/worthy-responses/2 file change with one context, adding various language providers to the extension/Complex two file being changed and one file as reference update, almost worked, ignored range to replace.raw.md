
# Messages submitted:

## [system]:
```md
You are a coding assistant.
You will be given editable files with line numbers and optional information blobs as input.
Your task is defined by @task mentions within your input.
Tasks might mention @run, @tabs and others - these are how the user starts the task and adds additional information, these are not directly related to the task.
Your output should address the task by making file changes, creating new files and running shell commands (assume macOS).
Only address the task you are given and do not make any other changes.
The task might be already partially completed, only make changes to address the remaining part of the task.
You will first output how you understand the task along with compact key ideas.
Immediately after you will output changes.

Format notes:
Use </truncated> to shorten <range-to-replace> if it is longer than 5 lines.
Never use </truncated> or other means of truncation within <replacement> - type out entire content.

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

Input:
<file>
<path>src/hello-world.ts</path>
<content>
0:// @task create a main file that calls hello world. Then compile and run it using node.
1:function helloWorld() {
2:  console.log('Hello World');
3:}
</content>
</file>

Output:
<task>
Create a main.ts file that uses helloWorld function.
Compile it and run it using node.
</task>

<change>
<path>main.ts</path>
<range-to-replace>
0:
</range-to-replace>
<replacement>
import { helloWorld } from './hello-world';
helloWorld();
</replacement>
</change>

<terminal-command>
tsc main.ts && node main.js
</terminal-command>


```

## [user]:
```md
<information-blob>Coding style for the project:
- Prefer functional style using map filter and similar operators instead of loops when appropriate
- Don't use any type or declare variables without a type, unless it can be inferred from the value being assigned</information-blob>

<file>
<path>src/context/language-features/codeLensProvider.ts</path>
<content>
0:/* @task @tabs Similarly how completion item provider was implemented and added
1:   to the extension add a code lens provider that will show a run button above
2:   task mentions @run  */
3:
</content>
</file>
<file>
<path>src/extension.ts</path>
<content>
0:import { completeInlineTasksCommand } from 'commands/completeInlineTasks'
1:import { TaskExpressionCompletionItemProvider } from 'context/language-features/completionItemProvider'
2:import { SessionContext } from 'session'
3:import * as vscode from 'vscode'
4:
5:export async function activate(context: vscode.ExtensionContext) {
6:  console.log('activating bread extension')
7:
8:  // Poor men's dependency injection
9:  const sessionRegistry = new Map<string, SessionContext>()
10:  const commandWithBoundSession = completeInlineTasksCommand.bind({
11:    extensionContext: context,
12:    sessionRegistry,
13:  })
14:
15:  // Commands also need to be defined in package.json
16:  context.subscriptions.unshift(
17:    vscode.commands.registerCommand(
18:      'ai-task.completeInlineTasks',
19:      commandWithBoundSession,
20:    ),
21:  )
22:
23:  context.subscriptions.unshift(
24:    /* Not sure how to register a command on enter,
25:     * markdown formatter extension I believe does have this key binding and it
26:     * inserts - if the previous line was a list item
27:     */
28:    /* vscode.commands.registerCommand(
29:         'ai-task.onEnterKey',
30:         (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit) => {
31:           // Insert a line of text at the current cursor position
32:           const position = textEditor.selection.active
33:           edit.insert(position, 'You pressed the enter key!')
34:         },
35:       ), */
36:
37:    // Kickoff on @run mention
38:    vscode.workspace.onDidChangeTextDocument((event) => {
39:      /* Ideally will want to make sure we are within a comment,
40:       could also be multiline and bread mention can be anywhere */
41:      const isRunInLine = (document: vscode.TextDocument, line: number) => {
42:        const lineText = document.lineAt(line).text
43:        return lineText.includes('@run')
44:      }
45:
46:      if (
47:        event.contentChanges.length > 0 &&
48:        /* only trigger on new line or space
49:         * I use starts with because some extensions might modify the text
50:         * before the edit, for example in typescript doc string it will add
51:         * another * to the new line
52:         */
53:        (event.contentChanges[0].text.startsWith('\n') ||
54:          event.contentChanges[0].text === ' ') &&
55:        // only trigger if @run is in the line
56:        isRunInLine(event.document, event.contentChanges[0].range.start.line)
57:      ) {
58:        console.log('triggering command trough @run mention')
59:        /* Previously I was undoing the enter change,
60:         but it introduces additional jitter to the user experience */
61:        void commandWithBoundSession()
62:      }
63:    }),
64:  )
65:
66:  const allLanguages = await vscode.languages.getLanguages()
67:
68:  /* This needs to support other identifiers for tasks,
69:     it seems like I should lift the configuration out of the session,
70:     and make it a global configuration. Register task expression language
71:     providers 
72:     The closest matching example I have found so far https://github.com/microsoft/vscode/blob/ba36ae4dcca57ba64a9b61e5f4eca88b6e0bc4db/extensions/typescript-language-features/src/languageFeatures/directiveCommentCompletions.ts
73:     */
74:  context.subscriptions.unshift(
75:    vscode.languages.registerCompletionItemProvider(
76:      allLanguages.map((language) => {
77:        return { language, scheme: 'file' }
78:      }),
79:      new TaskExpressionCompletionItemProvider({
80:        taskIdentifier: 'task',
81:        enableNewFilesAndShellCommands: true,
82:        includeLineNumbers: true,
83:      }),
84:      '@',
85:    ),
86:  )
87:}
88:
</content>
</file>
<file>
<path>src/context/language-features/completionItemProvider.ts</path>
<content>
0:import { SessionConfiguration } from 'session'
1:import * as vscode from 'vscode'
2:
3:/**
4: * Almost entirely copied from https://github.com/microsoft/vscode/blob/ba36ae4dcca57ba64a9b61e5f4eca88b6e0bc4db/extensions/typescript-language-features/src/languageFeatures/directiveCommentCompletions.ts#L78
5: * The range is important otherwise @ character is not included and matched
6: * against
7: */
8:export class TaskExpressionCompletionItemProvider
9:  implements vscode.CompletionItemProvider
10:{
11:  constructor(private sessionConfiguration: SessionConfiguration) {}
12:
13:  provideCompletionItems(
14:    document: vscode.TextDocument,
15:    position: vscode.Position,
16:    token: vscode.CancellationToken,
17:  ): vscode.ProviderResult<vscode.CompletionItem[]> {
18:    const line = document.lineAt(position.line).text
19:    const prefix = line.slice(0, position.character)
20:    const match = prefix.match(/(@[a-zA-Z\-]*)?$/)
21:    if (!match) {
22:      return []
23:    }
24:
25:    // TODO: make this configurable as we extend the context language
26:    const completionItems: vscode.CompletionItem[] = [
27:      '@' + this.sessionConfiguration.taskIdentifier,
28:      '@run',
29:      '@tabs',
30:      '@errors',
31:    ].map((label) => {
32:      const item = new vscode.CompletionItem(
33:        label,
34:        vscode.CompletionItemKind.Snippet,
35:      )
36:      /* I don't think showing details makes much sense,
37:       * at least let's wait until we have a dynamic set of context providers
38:       * item.detail = 'bread task expression'
39:       */
40:      item.range = new vscode.Range(
41:        position.line,
42:        Math.max(0, position.character - (match[1] ? match[1].length : 0)),
43:        position.line,
44:        position.character,
45:      )
46:      return item
47:    })
48:
49:    return completionItems
50:  }
51:}
52:
</content>
</file>
```

# [assistant, latest response]:
```md
<task>
Implement and add a code lens provider to the extension. This code lens provider should display a "run" button above task mentions. The implementation should follow the same style as the completion item provider.
</task>

<change>
<file-create>
<path>src/context/language-features/codeLensProvider.ts</path>
<content>
import * as vscode from 'vscode';

export class TaskCodeLensProvider implements vscode.CodeLensProvider {
    public onDidChangeCodeLenses?: vscode.Event<void>;

    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];

        for (let line = 0; line < document.lineCount; line++) {
            const lineText = document.lineAt(line).text;
            
            if (lineText.includes('@run')) {
                const range = new vscode.Range(line, 0, line, lineText.length);
                const command: vscode.Command = {
                    title: "Run",
                    command: 'ai-task.completeInlineTasks',
                    arguments: []
                };
                const codeLens = new vscode.CodeLens(range, command);
                codeLenses.push(codeLens);
            }
        }

        return codeLenses;
    }
}
</content>
</file-create>
</change>

<change>
<path>src/extension.ts</path>
<range-to-replace>
0:import { completeInlineTasksCommand } from 'commands/completeInlineTasks'
1:import { TaskExpressionCompletionItemProvider } from 'context/language-features/completionItemProvider'
2:import { SessionContext } from 'session'
3:import * as vscode from 'vscode'
</range-to-replace>
<replacement>
import { completeInlineTasksCommand } from 'commands/completeInlineTasks'
import { TaskExpressionCompletionItemProvider } from 'context/language-features/completionItemProvider'
import { TaskCodeLensProvider } from 'context/language-features/codeLensProvider'
import { SessionContext } from 'session'
import * as vscode from 'vscode'
</replacement>
</change>

<change>
<path>src/extension.ts</path>
<range-to-replace>
85:    ),
86:  )
87:}
</range-to-replace>
<replacement>
    ),
  )

  context.subscriptions.unshift(
    vscode.languages.registerCodeLensProvider(
      allLanguages.map((language) => {
        return { language, scheme: 'file' }
      }),
      new TaskCodeLensProvider(),
    ),
  )
}
</replacement>
</change>