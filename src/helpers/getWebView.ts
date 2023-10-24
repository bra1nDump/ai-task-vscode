export function getWebView() {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your WebView</title>
  </head>
  <body>
      <style>
        .vscode-button {
            padding: 8px 16px;
            border: none;
            border-radius: 2px;
            cursor: pointer;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            transition: background-color 0.2s;
            width: 100%;
        }
      
        .vscode-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
      </style>
      <p>Start changing your files using AI by creating a Task Notebook</p>
      <button class="vscode-button" onclick="runCommand()">Create Task Notebook</button>
      <script>
        const tsvscode = acquireVsCodeApi();
        function runCommand() {
            tsvscode.postMessage({
                command: 'createTaskNotebook'
            });
        }
      </script>
  </body>
  </html>

`
}

export interface WebViewMessage {
  command: 'createTaskNotebook'
}
