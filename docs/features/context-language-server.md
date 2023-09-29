vscode.language.getDiagnostics() only returns diagnostics for opened tabs :/

### Problem matchers

Use tsc directly with a problem matcher to get the errors? - better do language server straight up
How to get problem matcher to work?
Can I run tsc using a javascript, so from the extension code itself? .. probably a bad idea
<https://github.com/microsoft/vscode/blob/41e940f76f5deda197bc5930b044c55607ba1cbc/extensions/typescript-language-features/package.json#L1520-L1550>



## Language server draft for @bread context, and target ranges @function, @block

- Reuse the context provider definitions to provide autocomplete
- Find an existing language server that does something similar


[Related](/docs/features/context-simple.md)

# Goal:
- High level I want to record better looking demos to be more likely to viral

- Have completions for @ task and other @ expressions in the task comment
- Have highlighting for these expressions
- Provide code lenses for @ task and possibly other expressions (this will actually be done in the extension).

# Longer term considerations:
- Language server is started as a separate standalone process, so it does not have access to the extension itself. The extension is what it defines the task syntax and currently context providers. 
- Right now I simply plan to hard code simple strings in the server, but we want a single source of truth.
- How do we support user defined context providers later? 
- This rows a curveball at my original plan to avoid any servers and have a single runtime.

# Next up:
- Create CodeLensProvider, CallerProvider end CompletionItemProvider. No need to create a server

# Archive

Let's not worry about long term considerations for now and just get something working. 
Starting with lsp-sample from vscode-extension-samples

```ts
/* https://github.com/microsoft/vscode/blob/ba36ae4dcca57ba64a9b61e5f4eca88b6e0bc4db/extensions/typescript-language-features/src/languageFeatures/directiveCommentCompletions.ts#L20
   Directives might be different from completions, 
   This handler provides the initial list of the completion items. */
connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    /* WARNING FAILURE, @ prefixed keywords are not being suggested,
     * I have also realized there is a much easier way to provide completions
     * with completion providers. I NEVER NEEDED THE LANGUAGE SERVER GODDAMN
     * IT. Putting on a branch and forgetting about it
     */
    const keywords = ['@' + 'taskkkkkk', 'runningShoes', 'tabs', 'errors']

    return keywords.map((keyword, index) => ({
      label: `${keyword}`,
      kind: CompletionItemKind.Text,
      data: index + 1,
    }))
  },
)
```