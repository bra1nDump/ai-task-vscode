# Features

- Multifile edits using @task comments
- Automatically fix compile errors after refactorings

# Next milestones

- Found a single demo user
- Reached out to 5 potential collaborators
- Replaced continue on the current project

# Before our demos

## New control flow

When user hits run (or runs command from command palette)
  - we create a new notebook
  - open it
  - do gynmnastics to add a new cell to it using commands (so if its already opend we append to the end)
  - start executing the cell

Now all actual file editing is kicked off from the notebook execution
  - We create a new session, given the cell execution to append high level results to
  - If the cell does not have a task in it
    - Similar to how we do this in completeInlineTasks, parse the cell content for @ mentions and modify context
    - use a simplified prompt to simply generate markdown reponse - no edits
    - dump context manager + previous cell contents into the messages

## Next up:
This is useful as there will be new people trying the product
- Add a shortcut to create a new notebook
- Add a walkthrough that will show how to create a new notebook (it will be created in the session folder)

Better format is better :D
- Create a cell with markdown showing discord link
- Smaller heading size for files / task etc - takes too much space
- In output remove start / end messages - redundant
- Don't show output of files submitted and others if there is no need

## If we have time
- Allow writing custom tasks in the notebook and actually running file editing on those
- This would require passing the custom @ task command to the completeInlineTasks function and passing it in correctly to the context manager or as a message.
- There is some command @command:notebook.action.toggleNotebookStickyScroll (open command pallet and explore "Notebook: " commands). No idea what this does, but might help with keeping the bottom part visible


## Later - after the demo
- When adding a task in a followup - include the output of the non-editing commands in the context.
  - This is useful if the user asks a question and when they like the answer (code related) they can run a task to apply them to the code instead of copy pasting and having to specify the same task 
  - This will also give better overall results because the prompt is easier when generating initial code suggestions - no mulit file edit. Next the multi-file edit can just focus on applying the known changes to the code - harder to fuck up
- Output markdown flickers - we should replace output with actual markdown cells so we can edit them inrementally to avoid this

Error: 
rejected promise not handled within 1 second: Error: Cannot modify cell output after calling resolve
extensionHostProcess.js:131
stack trace: Error: Cannot modify cell output after calling resolve
	at h.t (/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/out/vs/workbench/api/node/extensionHostProcess.js:127:105565)
	at Object.replaceOutput (/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/out/vs/workbench/api/node/extensionHostProcess.js:127:107002)
	at applyEdit (/Users/kirilldubovitskiy/projects/bread/dist/extension.js:1247:25)

# Later

Split up different user requests into different openai user messages. This will be closer to what the chat is used to do - adjust based on the user input.

Stability
- change prompt for new files for stability (just remove range-to-replace)
- fix imports in middle of a file - add example
- also add example of splitting a function - struggles to append, always decides to do 0: instead of appending to end of file maybe also new prompt ? insert?
- When context is large its a good idea to give the cursor as input so the model is grounded on the right task more likely

Users
- reach out to the 3 people willing to use the extension already and help them get setup on their project

IQ drop issues (a fallback if multi file is malfunctioning)
- make a @task-inline mode that simply prints to the cursor without the multi file complex prompt

# Better demos
https://github.com/novuhq/novu/issues/4438
https://github.com/bluesky-social/social-app/issues
- Requires signup
https://github.com/TabbyML/tabby/issues
https://github.com/bitwarden/clients/issues
https://github.com/mantinedev/mantine/issues
https://github.com/tldraw/tldraw/issues

# Bugs
- Document closed error keeps popping up :D
- Existing session running is flaky (repro when too many files found for instance)
- [Might be resolved] bug with task not stopping even after the task is finished, cancel still running?? This is probably outdated local version
  - Nope, just saw it not terminate again even though it prints Done in feedback doc. Seems to be triggered with racy "Document has been closed" error
  - Also didn't complete even witout the document error 
- prompt issue with merging two separate change sets into a single one
- Changing markdown files doesn't currently work, it opens the preview for the file, but then switches the preview to show the file we are trying to edit. Preview always shows the current md file on the left ...
  - It is also unable to actually apply change to the file for some reason - investigate
- [first issue] @+run causes the run to happen even if the space is not right after the run command
- still appears to be an issue when too many files are available for selection. Extension hangs on Join Discrod. Repro in show me plugin repo [bra1nDump.ai-task]Too many files matched: 239
  - Be smarter about this + show an error to end user suggesting a solution

# Unsorted

- keeping tasks is not a bad idea - keeping a history like in chatgpt is good
- Requiring a user to invoke the tool is difficult
- Lower latency

- Inquire on how to use vscode itself. We have a list of commands and probably can also lookup what they do on the web. We can also run vscode commands

## Notes
When doing a refactor the log of tasks is very useful for upcoming tasks. We might want to include this in the following prompts by default somehow. ... Chat interface strikes again? Notebooks?

Cleanup is also very annoying which is the product of making comments in code.
Only works for inline generation or with auto-cleanup

## Re architecting multi file edit format and granularity
Oftentimes it misses up with the line numbers, for instance oftentimes it wants to append to the end of the file but it is off by one line.
I think a better way is to use something like function calling with an option to create a top level symbol in file. We can take care of actually inserting it into the file 

## UX - Product

- Don't open new tabs for files that are already open, don't open tabs in the same group with the preview / notebook
- Follow up task to fix errors after making changes - should be a button in the markdown
- There should be stop and stop and undo buttons 
- Cleanup @task mentions after running
- Highlighting contexts expressions with better files.
  - It is tricky to pick good token types as they are very likely to collide with the existing colors in the file, possibly confusing the user.
  - I can also provide my own a theme that will only effect my own tokens, but that is more work. Let's do this later
- Only addressed tasks within the open tabs, not the entire project
- New unsaved file should work as a @ task input
  - It also currently hangs in this case - investigate
- Keep reference to a terminal, don't keep creating new ones
- Copy the style of open-interpreter
- Onboarding
- Delay scroll into view until there's only a single match ? I thought it would already do that
- Indentation should ideally be taken into account when generating diffs to match the indentation preferred by the user. This is low priority since type script does not care about it
- Preview also scrolls up all the time as we are re-writing the document. I wonder if we were to append to the document instead of write to fs scroll would be preserved
- Preview for the high level oftentimes flickers. Not sure what causes itb but try larger outputs
  - we rewriting the entire file. Workaround documented in append function
- Provide token count on the input and provide approximate price

## Demo 
- Have a task alias - ai-task? for demo / brand purposes
- Have audio - probably why retention so low - peoplea are not entertained
- Have better splash screen 
- Less stuff happening in the demo - no command line running
- Shorter video


## Developer experience working on ai-task

- Create issues for some of my todos here
- Prevent starting a debug session if compilation failed. It's really annoying to accidentally tried debugging a simple compile error during runtime and not knowing about the compile error

## Split target selection into a separate task - address speed, reliability and dumbness due to complex prompt

- Let's try squeezing out as much as possible with the current model using better prompts
- We can also make some modifications to use line ranges as target ranges instead of printing the whole thing out
- We probably also want the breaded files to come last, not sure of that matters for the attention mechanism, but probably won't make it worse
- This has a hidden feature - allowing us to parallelize code generation if the user allows it

This is a complex task that will require rewriting roughly 1/3 of the code base if not more
Will function calling help me getter faster? I would not need to deal with Xml parsing, but I will have to deal with new apis and parsing partial JSON

## Uncategorized

- Improve new line character usage across the code base. This will suck because we print many logs relying on \n. For now I will just fix the code that has to do with line splitting for range calculation because that definitely needs to be robust.
- Create a company and apply for open ai credits
- Suggest respecting original indentation [20min]
- New file creation is confusing, we should use a different Xml tag for it. I can keep it on the level of parsing and not change the model 

- Refine the truncation mechanism to truncate more aggressively
  - Be more permissive when range to replace does not entirely match file contents. Basically only match on the line numbers, and I also thought we had the mechanism of matching any of the prefix or suffix lines it does not need to be all of themthe bug seems to be related to that
- Only provide certain lines as potential starts and finishes for the range

# Done

- release a windows compatible version
- kick off multi file editing with all tabs up for modification after a command with input

- Migrate from open the eye to hillicon for demos to be free
- Reach out to people from the meetup to try the extension, schedule demos

- @ completions popup everywhere, even when @is not typed. This is annoying and should be fixed

## Record gifs for new file + cmd 3 more takes on the main video [2hr + 2hr editing] NO DAVINCI RESOLVE ?

- Switch to mp4 - no looping needed