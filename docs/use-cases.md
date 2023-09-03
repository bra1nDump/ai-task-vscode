These are some uncategorized examples of concrete things I have tried or wanted to do with gpt.
Won a high level category view see [[direction]]

# [Scripting / summarization / auto selection] Migrate from pnpm to npm

- Update scripts
- Update docs

Is ai needed for this?

# Add helpers for ``` and new lines to appendToDocument and logger

I have a function that appends to a document, but it does not create leading new lines, I want to have more helpers like
appendNewLine
or appendNewMarkdownBlock.
I then want to find all uses of that function and automatically refactor to use the new abstractions.

### Blocked by

- Simple @search context provider
- Scripting
- Or automatic symbol / summaries

# I got mermaid to finally work with esbuild etc, I now have a shit load of code thats just 'chilling'

I want to strip it, I want to also just reorganize the code in a better way but keep it working.
Very generic ...

# I want to document decision making in the code base

I know the codebase, but other people don't and I will not either soon.
So I can run a script to ask me questions about the codebase to add more documentation.

## Blocked by

- Whole codebase understanding
- Prompt to identify 'gaps' in decision documentation
- Symbol extraction for code base
- Interrupts for user input

# Moving away from using strings as statuses: two part refactor with first creating a constant, and then updating all references

## Blocked by

- Stale file issue for multi edits on a single file