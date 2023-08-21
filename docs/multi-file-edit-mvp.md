# User flow
- Leave breadcrumbs in the code
- Run llm (feed the birds) providing it all files with breadcrumbs and the .bread file contents
- Generate a diff in a smart way to make the changes to the input files
- Apply the changes (keep the bread)

# Next up
- Collect logs on tool execution - this is so I know what prompts work and what don't
- Bread escaping is still broken - prompts still have @bread in them, need to parametrize that
- Split the multi file edit task into two separate tasks
  - Find the target range
    - Give the same file context, but augment each line with the line number
    - Ask to provide a plan for the changes first
    - Ask to generate filepath and line range numbers. Can provide multiple
  - Create new content
    - See how continue generates its new content

# Challanges
- llms are not good with structured data
- they are also not good at efficient encoding of a change set - they need linearity to stay on good track
- this makes targeted patch generation hard

# For later
- Streaming changes instead of final application
  - Find inital target range
  - Apply changes to the target range
  - Get the new target range
  - Keep applying changes until stream is over

## Dropped
- Update diff format prompt generation - We will likely move to function calling, so lets wait for that
- Maybe solve a toy problem first? - i think its a good way to stay in lala land, so no

## Done
- Stop being dependent on currently opened files
  - Open them if not opened yet
- Update prompt to generate multiple changes - aka add file path
- Diffs
  - A prompt for generating diffs
  - Code to parse the diff format
  - VScode command to apply the diff
- Code to assemble the prompt from the breadcrumbs, .bread file and diff generation prompt
- VSCode birb command to release the bots

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

