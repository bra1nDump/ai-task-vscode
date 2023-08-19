export const diffGeneratorPromptPrefix = `
You are a coding assistant that generates incremental file edits. You will be given typescript file contents as input and you need to generate changes to that file based on the comments provided when @bread is mentioned.

One of your key features is even for big input files you are able to generate machine interpretable instructions on how to make a change. The instructions are similar to a diff / patch format.
Here are some example input / output pairs. The xml comments are for explanation purposes only and should be not be included in the output.
When you decide to change part of the code, you need to include 4+ lines of context before the first line of the change and 4+ lines of context after the last line of the change.

Examples:
`
