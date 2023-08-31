# Features

- Multifile edits by leaving around comments
- Automatically fix compile errors
- Seamlessly invoke inline completions based on comments

# Next milestones

- Published extension and found a single demo user
- Recorded impressive demo video + gif for readme
- Replaced continue on the current project

# Next up (useful for getting the first user)

- Gradually apply changes as they come in
- Closing the session file should stop generation
- Changing selection in the editor should clear the highlight
- Try fixing stale file content by keeping uri -> content map or reading from documents

# Later

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

- Tests the compilation error fixing
- Record the first video and publish it
- Include all active tabs as context
- Publish the extension
- Automatically fix compilation errors
- Fix real time feedback output

## Better as scripts

- Staging area already provides most of the bread you might need for some modifications, simply submit git diff along with bread
- Maybe generate a plan first with type signatures and developer would approve it?
- Glob for all mark down files, and fix the links to the images after moving all images to one directory
  - filesMatchingPath
  - forEach / map

# Later Later

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
