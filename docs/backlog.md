# Features

- Multifile edits by leaving around comments
- Automatically fix compile errors
- Seamlessly invoke inline completions based on comments

# Next milestones

- [done] Published extension
- [done] Have a novel feature - probably working multi file edits
- [done] Recorded demo video showing basic usage + gif for readme
- [done] Release project on GitHub
- Found a single demo user
- Reached out to 5 potential collaborators
- Replaced continue on the current project

# Next up

- Test the extension works after the renaming
- Clean up top level directory in github - too many files are in the way of scrolling to the demos
- Remove content and just keep line numbers as ranges (speed) [1h]
  - Instead work on the truncation mechanism to truncate more aggressively
- Create a file if it's not there yet (cool looking) [1h]
- Create a cmd tag to run a shell command

```ts
const writeEmitter = new vscode.EventEmitter<string>();
const pty: vscode.Pseudoterminal = {
  onDidWrite: writeEmitter.event,
  open: () => writeEmitter.fire('\x1b[31mHello world\x1b[0m'),
  close: () => {}
};
vscode.window.createTerminal({ name: 'My terminal', pty });
// Example: Move the cursor to the 10th row and 20th column and write an asterisk
writeEmitter.fire('\x1b[10;20H*');
```

- Suggest respecting original indentation [20min]

## Record gifs for new file + cmd 3 more takes on the main video [2hr + 2hr editing] NO DAVINCI RESOLVE ?

Do I really need this? The gif is okaish right now

## Release - REALLY DON'T WANT TO DO THIS, BUT THIS IS ESSENTIAL

- Create issues for some of my todos here
- Style discord server, add basic documentation
- Ping friends asking to try it

## Promote, Recruit Cofounders - REALLY DON'T WANT TO DO THIS, BUT THIS IS ESSENTIAL

- Contact the embeddings person from habr, contact vlad
- Manually go over popular repositories in the space vscode extensions find top contributors
- Send them an email from a personal email sending the GitHub page + Discord

# Bread expressions

## Context providers (move to the context section)

- Instead of by default pulling in tabs and compile errors manually specify them
- Add context providers for
  - @bread, @bugs
  - Later @url, @search, @shell
  - Complex @semantic "Code that ads line numbers to the code"
  - Complex @dependencies (should probably be enabled by default, this would mean pulling in dependencies for first degree types used within the function)
  - Think about auto completion, specifically for @url would probably want some fixed websites will use often. For instance I would include vscode Api docs
  - Have them implement a common interface
- Compile the script to get context instead of getting context manually within two available commands

## Targeting

- For example if I only want to modify the given function, specify @function, if I only want to modify the following block, specify @block
- Show a similar preview as copilot does
- This would be useful for inline generations

## Language server draft for @bread context, and target ranges @function, @block

- Reuse the context provider definitions to provide autocomplete
- Find an existing language server that does something similar

# Later

## UX

- Onboarding
- Add play button to @bread comments - instead of @run
- Delay scroll into view until there's only a single match ? I thought it would already do that
- Indentation should ideally be taken into account when generating diffs to match the indentation preferred by the user. This is low priority since type script does not care about it
- Preview also scrolls up all the time as we are re-writing the document. I wonder if we were to append to the document instead of write to fs scroll would be preserved
- Preview for the high level oftentimes flickers. Not sure what causes itb but try larger outputs
  - we rewriting the entire file. Workaround documented in append function
- Provide token count on the input and provide approximate price
- Add discord server link to hight level output

## [Partially done with multi-file edit, focus on other things for now] Type at cursor - allows me to replace continue for personal use

- For example current model does not support inserts only some sort of replacement
- The simplest version is to keep reusing the multi file edit prompt and simply instruct to replace a single line with the comment /run
- We can also get rid of the planning stage (maybe we should also inject at using /plan directive)
- Maybe also take into account the @bread files + diagnostics

## Record Type at cursor

## Developer experience working on ai-task

- Prevent starting a debug session if compilation failed. It's really annoying to accidentally tried debugging a simple compile error during runtime and not knowing about the compile error
- Logging is still kinda broken
  - \` appear in strange places (aka right after some </file> closes)
  - Files are not strictly ordered by timestamp, and the format all the title is to verbose
  - Running two sessions within the same minute concatenates the two files

## Split target selection into a separate task - address speed, reliability and dumbness due to complex prompt

- Let's try squeezing out as much as possible with the current model using better prompts
- We can also make some modifications to use line ranges as target ranges instead of printing the whole thing out
- We probably also want the breaded files to come last, not sure of that matters for the attention mechanism, but probably won't make it worse
- This has a hidden feature - allowing us to parallelize code generation if the user allows it

This is a complex task that will require rewriting roughly 1/3 of the code base if not more
Will function calling help me getter faster? I would not need to deal with Xml parsing, but I will have to deal with new apis and parsing partial JSON

## Uncategorized

- Improve new line character usage across the code base. This will suck because we print many logs relying on \n. For now I will just fix the code that has to do with line splitting for range calculation because that definitely needs to be robust.
- Create a company and apply for open eye credits

# Done

- Make repository public on GitHub
- Re-brand to ai-task
  - .task.context ?
- Add a gif to the readme

- Rebrand - ai-task, to show the extension on video update image
  - New Icon, new identifier, new name

- If you cancel the execution, the preview should close, also once the execution finishes the preview should close also
  - Not sure if its quite possible, or desired, done

## Record multi file edit

- Take notes on what videos you want to record. Record three while you do the following

Things to showcase

- Multi file edit
- Simple compile error fix after a data structure factor
- Referencing project wide context
- Were not actually that useful :D I should probably record new ones and actually watch how they come out
  - Watch all the demo videos you have recorded so far
  - Look through some examples of the generations that were successful and worthy responses

- Flatten and simplified the prompt
- Make the pseudocode go before the target range. Also have it described the changes to the algorithm of the entire algorithm.
- Configure if we want pseudocode or not
- Continue to line range targets
- Content based matching has bugged out when there were multiple matches within the same file of the same string
- Remove plan craziness with custom list parsing and simply use `<plan>` tags
- Print pseudocode for replacement
- Delay deleting the content until replacement is final or until it is not empty
- Scroll into view when editing - very annoying to look for it
- Currently all edits push individually to the undue stack tremendously polluting it. Only have the final edit pushed to the undue stack
- When we make edits we do big replacements causing flicker due to language highlighter needing to parse the change.10
  - A simple solution is to at the time of applying the change get the current text for the range we're trying to edit, if it is the prefix of the replacement, drop that prefix from the replacement and insert at end of original target range
- Refactor so the prompts for multi file edit all left together disk

## Play with prompts for multi file edits, try improving the planning stage

### Wednesday Gradually apply changes as they come in, while supporting multiple edits within the file

- Finally gradually apply changes
  - Use existing end to end test end to end.
- Closing the session file should stop generation
- Changing selection in the editor should clear the highlight

- Deduplicate files with problems, generally deduplicate files?
- Allow backdate edits using line range tracker - DocumentSnapshot
  - [done] Implemented the base class
  - Change the range output of the LLM to be line numbers
    - Might further decrease quality off completions since the model will not have the quote off the code it is modifying. This will be addressed with splitting into tasks to provide range to edit
    - A workaround is to convert the content based line ranges to LineRanges the first time it becomes available in the mapper
  - Adjust the mapper that maps to resolved changes to be stateful
    - The mapper should be returned from a file context aggregator
    - The file context should be read from the snapshots only before being placed to the LLM to ensure consistency
    - I need to refactor file context providing helpers to return uris instead of file context directly
    - Next a FileContextManager should be created which will keep track of of a map with relative file paths to DocumentSnapshot
    - It should be available in SessionContext as we will need to dispose off subscriptions once the session ends
- Stale files, specifically making it impossible to do multi-edits in the same file
  - <https://github.com/microsoft/vscode/issues/15723>
  - openTextDocument should work ..
- Too many things to clean up after the session
  - [maybe] Use fs to write to files instead of opening documents
    - Hide logger implementation in the context object
  - Preview high level
  - High level .md itself
  - Low level .md
- Tests the compilation error fixing
- Record the first video and publish it
- Include all active tabs as context
- Publish the extension
- Automatically fix compilation errors
- Fix real time feedback output

# Later Later

- Errors don't show up if files are not active - run tsc if its a typescript project
- Find target edit range using ast
- Use function calling to try and improve the diff generation
- Making legal moves
  - Factoring out variables
  - Splitting up functions
  - Renamings
- Create copies of the repo and try different approaches and then try to compile
- Context - see what continue did. @google @url @< some actual symbol from code > are good starts
  - ![cursor-learning-documentation](cursor-learning-documentationpng)
- Keep bread in the codebase until the change is complete
  - Also add @bread comments as llm runs and touches files due to bread mentions
- Watch for // bread: Refactor this function :hits-enter 2ce? Once such a comment is detected - automatically run the llm and apply the changes
- @url: @shell
- Copy paste tsc output to the bread file
- Try again
- Run wipe table command to remove all bread
- Artificially delay generation by roughly one line so we can more intelligently change only the lines that need chaning. See how continue did this (ask continue with code selection)
- Replace bread with in editor selections
- UI Cool fade in lines that are still being generated instead of streaming - its distracting
- Extract prompts from linter setup, for example lintrc
- Run on enter, customize the pattern //b or //// do xyz [Enter key] - starts running the llm
- Will cause bugs later - you cannot edit while llm is working on it, otherwise when time comes to modify it it will be outdated.
  - This sucks, the editor contents also need to be saved ... otherwise fs read will not be accurate. Hmm. Maybe I should just check if there is an editor opened for a given uri and if yes
  - Well this is a big problem, you cannot access editors that are not in focus. Task output is also considered an editor
  - The rough idea is to watch editors and when they change cache their content, store in a map. When we try reading a file - first try reading from the map, only after from fs
