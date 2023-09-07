# Features

- Multifile edits by leaving around comments
- Automatically fix compile errors
- Seamlessly invoke inline completions based on comments

# Next milestones

- [done] Published extension
- Found a single demo user
- Recorded impressive demo video + gif for readme
- Replaced continue on the current project

# Next up (useful for getting the first user)

## Make user experience of the current features acceptable

### Wednesday Gradually apply changes as they come in, while supporting multiple edits within the file

- Finally gradually apply changes
  - Use existing end to end test end to end.
- Closing the session file should stop generation
- Changing selection in the editor should clear the highlight
- Provide token count on the input and provide approximate price

### Wednesday Compilation Step

- Refactor chase bread and chase bugs commands to to use a virtual script with context provider mentions and prompt
- Add context providers for
  - @bread, @bugs, @url
  - Think about auto completion, specifically for @url would probably want some fixed websites will use often. For instance I would include vscode Api docs
  - Have them implement a common interface
- Compile the script to get context instead of getting context manually within two available commands

## Thursday Record demo video for multi file edit

## Thursday Type at cursor - allows me to replace continue

- For example current model does not support inserts only some sort of replacement
- The simplest version is to keep reusing the multi file edit prompt and simply instruct to replace a single line with the comment /run
- We can also get rid of the planning stage (maybe we should also inject at using /plan directive)

## Friday Language server draft for @bread scripts (inline)

- Reuse the context provider definitions to provide autocomplete

## Friday Record Type at cursor

## Saturday Release - REALLY DON'T WANT TO DO THIS, BUT THIS IS ESSENTIAL

- Make repository public on GitHub
- Create issues for some of my todos here
- Style discord server, add basic documentation
- Ping friends asking to try it

## Sunday Promote, Recruit Cofounders - REALLY DON'T WANT TO DO THIS, BUT THIS IS ESSENTIAL

- Manually go over popular repositories in the space vscode extensions find top contributors
- Send them an email from a personal email sending the GitHub page + Discord

## Bugs

- Logging is still kinda broken
  - \` appear in strange places (aka right after some </file> closes)
  - Files are not strictly ordered by timestamp, and the format all the title is to verbose
  - Running two sessions within the same minute concatenates the two files
- Preview for the high level oftentimes flickers. Not sure what causes itb but try larger outputs
  - we rewriting the entire file. Workaround documented in append function

# Later

## Split target selection into a separate task - address speed, reliability and dumbness due to complex prompt

- Let's try squeezing out as much as possible with the current model using better prompts
- We can also make some modifications to use line ranges as target ranges instead of printing the whole thing out
- We probably also want the breaded files to come last, not sure of that matters for the attention mechanism, but probably won't make it worse
- This has a hidden feature - allowing us to parallelize code generation if the user allows it

This is a complex task that will require rewriting roughly 1/3 of the code base if not more
Will function calling help me getter faster? I would not need to deal with Xml parsing, but I will have to deal with new apis and parsing partial JSON

## Uncategorized

- Improve new line character usage across the code base. This will suck because we print many logs relying on \n. For now I will just fix the code that has to do with line splitting for range calculation because that definitely needs to be robust.
- Content based matching has bugged out when there were multiple matches within the same file of the same string
- Prevent starting a debug session if compilation failed. It's really annoying to accidentally tried debugging a simple compile error during runtime and not knowing about the compile error
- Support source maps to jump from test stack traces directly to the file https://www.npmjs.com/package/source-map-support
- Remove plan craziness with custom list parsing and simply use <plan> tags
- Typing @run should start executing
- Add play button to @bread comments
- Explore UIs
  - stop button up top
  - notebook interface
- Refactor logging - try getting this to work automatically
- Show input where you can augment the instructions with anything one off
- Ability to stop the execution
  - A command, so you can add a keybinding to it
  - More intuitively you would just close the editor with the logs (it will probably be annoying because it will always need saving? Can I just save it all the time after writing)
- Workspace changes
  - Adding a new file
- Tokenizer - show request stats - people would be spending their hard earned money on this
- Run on double enter ??
- Instead of reading from the file system, read from opening a document since it might have more unsaved changes
- Apply changes as a stream of text edits
- Create a company and apply for open eye credits

# Done

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
  - https://github.com/microsoft/vscode/issues/15723
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
