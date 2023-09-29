Solutions 
- Always suggested to take full expressions, I need to do a better job with thus and my examples
- Splitting up the task to be able to provide more context around the replacement

<change>
<path>src/extension.ts</path>
<range-to-replace>
90:    vscode.languages.registerCodeLensProvider(
91:      allLanguages.map((language) => {
92:        return { language, scheme: 'file' }
93:      }),
94:      new TaskCodeLensProvider(),
95:    ),
</range-to-replace>
<replacement>
const sessionConfiguration = {
  taskIdentifier: 'task',
  enableNewFilesAndShellCommands: true,
  includeLineNumbers: true,
};

vscode.languages.registerCodeLensProvider(
  allLanguages.map((language) => {
    return { language, scheme: 'file' }
  }),
  new TaskCodeLensProvider(sessionConfiguration),
),
</replacement>
</change>

The full context was
  context.subscriptions.unshift(
    vscode.languages.registerCodeLensProvider(
      allLanguages.map((language) => {
        return { language, scheme: 'file' }
      }),
      new TaskCodeLensProvider(),
    ),
  )


