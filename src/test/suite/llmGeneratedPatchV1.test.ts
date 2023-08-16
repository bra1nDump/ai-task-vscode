import * as assert from 'assert';
import { parseLlmGeneratedPatchV1 } from '../../diff/llmGeneratedPatchV1';

const singleChangeSimplePatch = `
<file-change-output> <!-- All edits within this container apply to the same file -->
<change description="Parametrising function with a name of the thing to be greeted">
<old-chunk> <!-- The old chunk of code that is being replaced -->
function helloWorld() {
    // @typist pass name to be greeted
    console.log('Hello World');
}
</old-chunk>
<new-chunk> <!-- The new content to replace the old content between the prefix and suffix -->
function hello(name: string) {
    console.log(\`Hello \${name}\`);
}
</new-chunk>
</change>
</file-change-output>
`;

const twoChangePatch = `
<file-change-output>
<change description="Watching the current document for changes, if the change contains typist, find its position and insert a decoration at that position. Adding in the body of the activate function">
<old-chunk>
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from typist!');
	});

    // @typist When a user adds a magic word @typist in the current file, add a button on top of that line with a play button

	context.subscriptions.push(disposable);
}

</old-chunk>
<new-chunk>
	// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from typist!');
	});

    workspace.onDidChangeTextDocument((event) => {
        const editor = window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const text = document.getText();
            const lines = text.split('\n');
            const magicWord = 'typist';
            const decorationsArray = [];

            // Loop over each line of text in the document
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // If the magic word is found in the line, create a decoration
                if (line.includes(magicWord)) {
                    const decoration = { range: new Range(i, 0, i, 0), hoverMessage: 'Play Button' };
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
<change desription="Symbols that are not imported were used in the previous change. Adding in the header of the file">  <!-- Changes can be out of order. Changes should never overlap. -->
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
`;


suite('Can parse example patches', () => {
	test('Simple patch', () => {
		const patch = parseLlmGeneratedPatchV1(singleChangeSimplePatch);

		console.log(JSON.stringify(patch, null, 2));

		// Parsing succeeded
		assert.notEqual(patch, undefined);

		// There is one change that is not empty
		assert.notEqual(patch?.fileChangeOutput.change.length, 0);
		assert.equal(patch?.fileChangeOutput.change[0].newChunk.length, 1);
	});

	test('Complex patch', () => {
		const patch = parseLlmGeneratedPatchV1(twoChangePatch);

		console.log(JSON.stringify(patch, null, 2));

		assert.notEqual(patch, undefined);

		// Change is not empty
		assert.notEqual(patch?.fileChangeOutput.change.length, 0);

		// There are two changes that are not empty
		assert.equal(patch?.fileChangeOutput.change.length, 2);
		assert.equal(patch?.fileChangeOutput.change[0].newChunk.text.length, 1);
		assert.equal(patch?.fileChangeOutput.change[1].newChunk.text.length, 1);

		// Old chunks are not empty either
		assert.equal(patch?.fileChangeOutput.change[0].oldChunk.text.length, 1);
		assert.equal(patch?.fileChangeOutput.change[1].oldChunk.text.length, 1);
	});
});
