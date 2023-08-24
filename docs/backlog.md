# Features
- Multifile edits by leaving around comments
- Automatically fix compile errors

# Next milestones
- Try to replace continue on the current project
- Automatically fix compilation errors

# Next up (useful for recording a video)
- Add a keybinding and add a talon command
- Real time feedback on what the extension is doing
  - Open a file in column two showing which files were submitted as input, also providing a relative link to them
  - Installed the extension locally, and trying hard not to use other extensions
  - Highlight ranges that will be edited
  - Printing out the plan 
    - Probably more has shown sets to keep track of what we have already printed out and only print out once its completed streaming 
    - At the same time I can start thinking about how to print out the it deltas for the same element
    - I should probably also use Xml for the plan separators, and might as well flatten out the change tags
- Ability to stop the execution
  - A command, so you can add a keybinding to it
  - More intuitively you would just close the editor with the logs (it will probably be annoying because it will always need saving? Can I just save it all the time after writing)
- Show input where you can augment the instructions with anything one off

# Later
- Run on double enter ??
- Instead of reading from the file system, read from opening a document since it might have more unsaved changes
- Apply changes as a stream of text edits
- Workspace changes
  - Adding a new file
- Making legal moves
  - Factoring out variables
  - Splitting up functions
  - Renamings
- Staging area already provides most of the bread you might need for some modifications, simply submit git diff along with bread
- Maybe generate a plan first with type signatures and developer would approve it?

# Later Later
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