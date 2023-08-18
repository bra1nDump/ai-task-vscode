export const singleChangeSimplePatch = `
<!-- All edits within this container apply to the same file -->
<file-change-output>
<change>
<!-- The old chunk of code that is being replaced -->
<description>Parametrising function with a name of the thing to be greeted</description>
<old-chunk>
function helloWorld() {
    // @bread pass name to be greeted
    console.log('Hello World');
}
</old-chunk>
<!-- The new content to replace the old content between the prefix and suffix -->
<new-chunk>
function hello(name: string) {
    console.log(\`Hello \${name}\`);
}
</new-chunk>
</change>
</file-change-output>
`

export const singleChangeSimplePatchPartial = `
<file-change-output>
<change>
<description>Parametrising function with a name of the thing to be greeted</description>
<old-chunk>
function helloWorld() {
    // @bread pass name to be greeted
    console.log('Hello World');
}
</old-chunk>
<new-chunk>
function hello(name: string) {

`

export const twoChangePatch = `
<file-change-output>
<change>
<description>Watching the current document for changes, if the change contains bread, find its position and insert a decoration at that position. Adding in the body of the activate function</description>
<old-chunk>
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from bread!');
	});

    // @bread When a user adds a magic word @bread in the current file, add a button on top of that line with a play button

	context.subscriptions.push(disposable);
}

</old-chunk>
<new-chunk>
	// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from bread!');
	});

    workspace.onDidChangeTextDocument((event) => {
        const editor = window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const text = document.getText();
            const lines = text.split('\n');
            const magicWord = 'bread';
            const decorationsArray = [];

            // Loop over each line of text in the document
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // If the magic word is found in the line, create a decoration
                if (line.includes(magicWord)) {
                    const decoration = { range: new Range(i, 0, i, 0), hoverMessage: 'Eat Bread' };
                    decorationsArray.push(decoration);
                }
            }

            // Create a decoration type with a button
            const decorationType = window.createTextEditorDecorationType({
                after: {
                    contentText: '▶️',
                    margin: '0 0 0 1em',
                    textDecoration: 'none; cursor: pointer;',
                },
            });

            // Set the decorations in the editor
            editor.setDecorations(decorationType, decorationsArray);
        }
    });

    context.subscriptions.push(disposable);
}

</new-chunk>
</change>
<!-- Changes can be out of order. Changes should never overlap. -->
<change>
<description>Symbols that are not imported were used in the previous change. Adding in the header of the file</description>
<old-chunk>
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, window, commands } from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
</old-chunk>
<new-chunk>
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, window, commands, workspace, Range } from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
</new-chunk>
</change>
</file-change-output>
`

export const patchWithTruncatedOldChunk = `
<file-change-output>
<change>
<description>Keeping track of </description>
<!-- When a big part of the old chunk is changed, simply truncate the middle using </truncated> tag, only provide the start and end of the old chunk -->
<old-chunk>
    // Display a message box to the user
		vscode.window.showInformationMessage('Hello World from bread!');
	});

</truncated>

  context.subscriptions.push(disposable);
}
</old-chunk>
<new-chunk>
	  // Display a message box to the user
		vscode.window.showInformationMessage('Hello World from bread!');
	});

  // Function to handle on change event
  function generateBreadRunnerDecorationsFor(editor) {
      const document = editor.document;
      const text = document.getText();
      const lines = text.split('\n');
      const magicWord = 'bread';

      // Loop over each line of text in the document
      for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // If the magic word is found in the line, create a decoration
          if (line.includes(magicWord)) {
              const decoration = { range: new Range(i, 0, i, 0), hoverMessage: 'Eat Bread' };
              decorationsArray.push(decoration);
          }
      }
      return decorationsArray;
  }

  // Display a message box to the user
  vscode.window.showInformationMessage('Hello World from bread!');

  // Create a decoration type with a button
  const breadRunnerDecorationType = window.createTextEditorDecorationType({
      after: {
          contentText: '▶️',
          margin: '0 0 0 1em',
          textDecoration: 'none; cursor: pointer;',
      },
  });
  workspace.onDidChangeTextDocument((event) => {
      const editor = window.activeTextEditor;
      if (editor) {
        // Save the new decorations
        const breadRunnerDecorations = generateBreadRunnerDecorationsFor(editor);
        editor.setDecorations(breadRunnerDecorationType, breadRunnerDecorations);
      }
  });

  context.subscriptions.push(disposable);
}
</new-chunk>
</change>
</file-change-output>
`
