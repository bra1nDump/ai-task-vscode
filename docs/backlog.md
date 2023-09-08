# Features

- Multifile edits by leaving around comments
- Automatically fix compile errors
- Seamlessly invoke inline completions based on comments

# Next milestones

- [done] Published extension
- Found a single demo user
- Recorded impressive demo video + gif for readme
- Replaced continue on the current project

# Next up - v1, initial potential user reach out, looking for collaborators

## Thursday Compilation Step

- Refactor chase bread and chase bugs commands to to use a virtual script with context provider mentions and prompt
- Add context providers for
  - @bread, @bugs
  - Later @url
  - Think about auto completion, specifically for @url would probably want some fixed websites will use often. For instance I would include vscode Api docs
  - Have them implement a common interface
- Compile the script to get context instead of getting context manually within two available commands

The rough idea is I want to create some sort of compilation step that I will use later on to compile bread scripts
For now I want to start using this idea by compiling a fake script that simply references @<context provider expression>
and has a written task of the goal that needs to be accomplished.
An example of a script for bread chasing

on other namings this functionality can have. To some extent this is closer to linking or scripting
it is closer to scripting because we're dynamically including more and more content from the entry point.
Maybe we should call this prompt bundling or preprocessing?

The compile step will resolve @ expressions to a context providers that successfully matches this @ pattern.
Let's say this bread includes more files as context. They also need to be compiled.
Let's say one of those other files references @tabs, now all files that are opened as tabs we'll get pulled in as well.
By default every file that gets pulled in either from top level script or

There's also atomic context providers, for example @bread. It does not in itself pull in any additional context
this is more of a special symbol / mention that is used to guide other scripts or/and LLMs.

Alternative idea I have been considering as well is to use javascript an some dsl to write these scripts.
There are many things to consider here. The main downside of using javascript for those context files is that when they're simple enough
we don't really want to think about the syntax. I just want to provide a simple prompt, and that is it.
I want the scripting using javascript to be available either way, but the question is it is a simple context and task interface worth building?
I would say yes, because this is closer to what other projects are doing and this lowers the learning curve.

Consider this script as a replacement for bread chasing command.

```
# This is a context provider will pull all the files with @bread mentions. This provider will also erase itself from the prompt resulting from this script.
@files-with-bread

# This will remain in the final prompt for this particular script
Look for tasks and informational comments tagged with @bread in your input files and generate changes to accomplish them.
```

@crust Provide a plan and your thoughts on the above in your output.

### Scripting requirements and types

Also see [[scripting]]

```ts
type CompileUnit =
  // This would be either a virtual script created by the command runner,
  // or the .bread.md file, or chunk off text from within @bread comment
  ScriptBlob

type CompilationOutputUnit =
  // Gets produced from either a script (usually the same content as the sript itself)
  // or from some custom @url google.com/ @shell "git diff" command
  //
  // I should make other entries to have a type field so I can easily switch over them
  | { type: 'Prompt'; value: Prompt }
  // Currently unused, the idea is this will guide which top level tool will be selected
  // Could be multi file edit (resulting in what additional prompts to inject and how the response is parsed and interpreted)
  // | SessionConfiguration
  // This is for example one of the @breaded files might contain other script blobs
  | EditableFile

// The compiler would output things that would eventually settle into a session
// It might take a couple of rounds to settle into a session
type Compiler = (input: CompileUnit) => {
  processedScriptBlob: string // Will be included as message
  files: EditableFile[] // files that got pulled in by the script, they are not nesseseraly editable
  genericContextPrompts: string[] // Prompts from things like @shell, @url etc
}

// There might be more scripts in each of the files
type ScriptExtractorFromComments = (input: EditableFile) => ScriptBlob[]

type Session = {
  // Different tasks might want different context but lets not worry about that
  // Each of these will map to a standard function that takes in a session and interprets the reponse
  // topLevelTaskId: Task
  // This contains all editable files or files for reference
  fileManager: FileManager

  selection: Selection // This is useful for inline typing. I think we want to take this when we create a new session, should be done when FileManager captures the matching file as well. Maybe we can include this in the file snapshot data?

  // Script / @url @shell @google providers
  prompts: string[]
}

// I don't think we should use bread files to pick the top level task. I think the top level task should be selected by
// running a particular vscode command or by special hardcoding in the extension, for example double enter after @bread comment.
// It would be nice to to type @bread write me a function that does X @inline-typing "hit enter twice" and have it work.
// To start I can just add the double enter thing without the complications and see how it goes.
// type TaskId =
//   | 'multi-file-edit'
//   | 'single-file-rewrite'
//   | 'inline-typing'
//   | 'edit-selection'
// type SessionConfiguration = {
//   topLevelTaskId?: TaskId
// }
```

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

# Later

## UX

- Preview for the high level oftentimes flickers. Not sure what causes itb but try larger outputs
  - we rewriting the entire file. Workaround documented in append function
- Currently all edits push individually to the undue stack tremendously polluting it. Only have the final edit pushed to the undue stack
- When we make edits we do big replacements causing flicker due to language highlighter needing to parse the change.10
  - A simple solution is to at the time of applying the change get the current text for the range we're trying to edit, if it is the prefix of the replacement, drop that prefix from the replacement and insert at end of original target range

## Developer experience working on Birds

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

- Provide token count on the input and provide approximate price
- Improve new line character usage across the code base. This will suck because we print many logs relying on \n. For now I will just fix the code that has to do with line splitting for range calculation because that definitely needs to be robust.
- Content based matching has bugged out when there were multiple matches within the same file of the same string
- Remove plan craziness with custom list parsing and simply use <plan> tags
- Typing @run should start executing
- Add play button to @bread comments
- Explore UIs
  - stop button up top
  - notebook interface
- Show input where you can augment the instructions with anything one off
- Workspace changes
  - Adding a new file
- Create a company and apply for open eye credits

# Done

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

```

```
