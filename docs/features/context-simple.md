# Design

Also see [[scripting]], that provides you access to actual javascript expressions to do things using low level tasks.

The rich context is simply a string that can be expanded into more context + a prompt.

- As a v0 we will use existing file snapshots for @breaded or files with problems -> `File[]`
- Next run `ContextExtractorFromComments` on each of the files to get more `ContextExpression[]`
- Next run `Compiler` on each of the `ContextExpression` to get `ExpandedContext`
  - Optionally we can replace the original compiled context inline with compiled blob
  - Similar functionality would be useful for adding problem / type information inline to files

```ts
// This would be either a virtual script created by the command runner,
// or the .task.md file, or chunk off text from within @bread comment
type ContextExpression = string

type ExpandedContext = {
  // Gets produced from either a Context (usually the same content as the sript itself)
  resolvedContextExpression: string

  // Files that got included for example along with @bug or @<file-name> providers
  filesPulledInByContext: File[]

  // or from some custom @url google.com/ @shell "git diff" command
  plainBlobsPulledInByOtherContextProviders: string[]
}

// Lets ditch this for now
interface ContextItem<T> {
  name: string
  sourceProviderName: string
  value: T
}

type ContextQuery = {
  // prefixAfterMatchingAliasOrName will be prefix in: @<provider> <prefix>
  prefixAfterMatchingAliasOrName?: string
  // fullPrefix will be the full prefix including the @<provider>, this is done to support autocompletions without the
  // narrowing to provider name
  fullPrefix: string
}

interface ContextProvider<T> {
  name: string
  aliases: string[]

  // We migtht not want to type @file hello.ts, instead we want to simply type @hello and should start getting autocomplete
  // Instead just pass the query with both including prefix and not including
  // waitForNameOrAliasToMatch: boolean
  // This is for autocomplete
  autoCompleteOnPrefix(query: ContextQuery): string[]

  /**
   * Converts an instance of a context item to someting that can be added into the llm session as context
   */
  async resolve(withParameter: string): Promise<ContextItem<T>>
}

class FileContextProvider extends ContextProvider<File> {
  name = 'file'
  aliases = ['files']
  autoCompleteOnPrefix(query: ContextQuery) {
    // Assumes we have a file manager
    const currentFilePaths = this.fileManager.relativeFilePathsInWorkspace()
    return currentFilePaths.filter((filePath) =>
      filePath.startsWith(query.prefixAfterMatchingAliasOrName),
      || filePath.startsWith(query.fullPrefix)
    )
  }

  async resolve(withParameter: string): Promise<ContextItem<File>> {
    const filePath = withParameter
    return await this.fileManager.getFile(filePath)
  }
}

type PlainBlob = string
class ShellContextProvider implements ContextProvider<PlainBlob> {
  name = 'shell'
  aliases = ['sh', 'cmd']
  autoCompleteOnPrefix(query: ContextQuery) {
    // This is a shell command, so we don't really want to autocomplete it, its dynamic
    return []
  }

  async resolve(withParameter: string): Promise<ContextItem<PlainBlob>> {
    // Run the shell command
    const terminal = vscode.window.createTerminal('ai-task')
    terminal.sendText(withParameter)
    // ?? No idea how to get the response from the terminal! I think it is opend as a text editor so we can read it from there ??
  }
}

// Should we autocomplete provider names automatically? - Yes, less work on the provider implementation side
// How do we sort these? First name completions are prioritized, next any autoCompleteOnPrefix matches.
// Maybe section the completions by provider name? Does autocomplete support sections? I don't think so
// It will also be tricky to accept autocomplete for a provider name, and immediately start autocompleting the prefix
// Some vscode api digging needed most likely to trigger autocompletion on accepting the command name completion.

// The compiler would output things that would eventually settle into a session
// It might take a couple of rounds to settle into a session
type Compiler = (
  input: ContextExpression,
  contextProviders: ContextProvider[],
) => ExpandedContext

// There might be more Context Expressions in each of the files. Find by finding comments with @bread mentions
type ContextExtractorFromComments = (input: EditableFile) => ContextExpression[]

type Session = {
  // Different tasks might want different context but lets not worry about that
  // Each of these will map to a standard function that takes in a session and interprets the reponse
  // topLevelTaskId: Task
  // This contains all editable files or files for reference
  fileManager: FileManager

  selection: Selection // This is useful for inline typing. I think we want to take this when we create a new session, should be done when FileManager captures the matching file as well. Maybe we can include this in the file snapshot data?

  // Context / @url @shell @google providers
  prompts: string[]
}
```

# Archive

The rough idea is I want to create some sort of compilation step that I will use later on to compile bread scripts
For now I want to start using this idea by compiling a fake script that simply references `@<context provider expression>`
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

```txt
# This is a context provider will pull all the files with @bread mentions. This provider will also erase itself from the prompt resulting from this script.
@files-with-bread

# This will remain in the final prompt for this particular script
Look for tasks and informational comments tagged with @bread in your input files and generate changes to accomplish them.
```
