# User flow
- Leave breadcrumbs in the code - single use [later persistent]
- You then create a .bread file that contains text instruction of what to do with the temporary breadcrubs
- You run the llm (release the birbs (government bots)) providing it all files with breadcrumbs and the .bread file contents
- Generate a diff in a smart way to make the changes to the input files
- Apply the changes (keep the bread)
- Copy paste tsc output to the bread file
- Try again
- Run wipe table command to remove all bread

?? Maybe?
Watch for // bread: Refactor this function :hits-enter 2ce?
Once such a comment is detected - automatically run the llm and apply the changes

# Next @url: @shell

# To build
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

