vscode.language.getDiagnostics() only returns diagnostics for opened tabs :/

### Problem matchers

Use tsc directly with a problem matcher to get the errors? - better do language server straight up
How to get problem matcher to work?
Can I run tsc using a javascript, so from the extension code itself? .. probably a bad idea
<https://github.com/microsoft/vscode/blob/41e940f76f5deda197bc5930b044c55607ba1cbc/extensions/typescript-language-features/package.json#L1520-L1550>



## Language server draft for @bread context, and target ranges @function, @block

- Reuse the context provider definitions to provide autocomplete
- Find an existing language server that does something similar
