[ACCOMPLISHED]

# User flow
- Leave breadcrumbs in the code
- Run llm (feed the birds) providing it all files with breadcrumbs and the .bread file contents
- Generate a diff in a smart way to make the changes to the input files
- Apply the changes (keep the bread)

# Overcoming dynamic target range + target replacement issues
- Split the multi file edit task into two separate tasks
  - Find the target range
    - Give the same file context, but augment each line with the line number
    - Ask to provide a plan for the changes first
    - Ask to generate filepath and line range numbers. Can provide multiple
  - Create new content
    - See how continue generates its new content
- [Alternatively] Don't solve this problem!
  - Assume a person only performs a single targeted change
  - Have them select the region they want to change
    - [Alternatively] simply use an existing tool to make a change or make the changes by hand
    - Automatically pull git diff of the files with bread, this might be relevant
  - Finding the target range problem is solved for the initial edit
  - Finding follow up target ranges can be performed without llm - fast, predictable
  - Extending the target range using abstract syntax tree spawned from the error location might not work as well, but is easy enough to test. 
    - At that point we can simply keep extending the context using VSCode select more command until we get enough context to fix the problem
  - Bread mentions would still be useful because when making a change you still want to reference other documents. Ideally you can just mention it with file ought a complete language server in place of the edit comment
  - I need to start working with abstract syntax trees either way, so I might as well start now

# Challanges
- llms are not good with structured data
- they are also not good at efficient encoding of a change set - they need linearity to stay on good track
- this makes targeted patch generation hard

# For later
- Collect logs on tool execution - this is so I know what prompts work and what don't
  - This does not help the race with cursor or continue
  - I don't actually spend much time on developing the prompts and this could be probably still done within the playground just as well without setting up infrastructure


## Dropped
- Update diff format prompt generation - We will likely move to function calling, so lets wait for that
- Maybe solve a toy problem first? - i think its a good way to stay in lala land, so no

# Why this is a good first step
- Close to how I write code currently
- Allows me not to type out changes
- Allows to make multi file edits
- Bypasses the issue of finding the correct context automatically

## Inline annotation format
// @context Some single use instruction. This will be cleaned up after the change is complete
// @context:typical-change-id You mention this when you are documenting and leaving breadcrumbs for changes that you make often

// Maybe @bread ? :D

# Diff generation
Google search: https://tinyurl.com/2a4g5ghm

## Open AI forum discussion

https://community.openai.com/t/how-to-generate-automatically-applicable-file-diffs-with-chatgpt/227822

I’ve played around with this a bit while building my DesktopGPT plugin 4 that connects ChatGPT to your local files and applications.

DesktopGPT
The most reliable (but still finicky) way that I found is with simple find and replace. 

# Done old
- Bread escaping is still broken - prompts still have @bread in them, need to parametrize that
- Stop being dependent on currently opened files
  - Open them if not opened yet
- Update prompt to generate multiple changes - aka add file path
- Diffs
  - A prompt for generating diffs
  - Code to parse the diff format
  - VScode command to apply the diff
- Code to assemble the prompt from the breadcrumbs, .bread file and diff generation prompt
- VSCode birb command to release the bots