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

# Replace all comments with more than three lines with block comments

# Replace all timeouts in all test files

# Rewrite explore vscode on change event.ts to remove the common setup code and instead use a helper function to bootstrap the editor

## Blocked by
- Use line range as targets instead of text because there will be multiple matches with repetitive test code

# Shortened the names of the worthy response files and move the more detailed description of what they're doing into the file body instead of the title

## Blocked by
- tree command
- file renaming tool

# I want to move a simple parameter into a configuration object for function
I should already be able to do so by making the change, this will produce compile errors
I can actually make the change with @crust as well.
But next I would have to update all the calls to the function to use the new parameter separately.
Ideally I could ad @references in the prompt to fix all the references to this function at the same time as it produces the change to the parameter

# Lift configuration to the parent function
I was passing a configuration to one function, but I realized I need those context in other places and the configuration should really be dictated from the session level. Lifting it will involve 
- Updating the type of the signature object to include configuration
- Making a decision where to pass the entire session object and where to extract the configuration only
- Updating ca sites
- Potentially moving other configuration like thanks into the existing configuration object on the session now 