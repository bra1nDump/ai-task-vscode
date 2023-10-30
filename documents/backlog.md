# Features

- Multifile edits using @task comments
- Automatically fix compile errors after refactorings

# Next milestones

- Deliver a good demo for the Hecker news crowd (Tuesday morning is the deadline)

## Next up:

- Return OpenAI from activate so error extension can use it

- Show walkthrough after installing the extension (implement, but don't enable yet, so if (false) hack to disable it)

- ... clenup hacks produced while getting notebooks to work. Lets plan this one out before we do it. For now lets just document some ideas on how to improve the situation
  - Extract common context enrichment pieces into a separate function
  - Extract a single user message creation based on context manager contents

# Later
- think how things can be better scoped to a session - see some hacks I added to clean up the maps of edits / cell outputs in closing session
- Create a custom language that will extend markdown so it can be used in notebook cells to create runnable markdown cells. Currently if you have a markdown cell it it is not runnable.
  - Alternatively create a new editor based chat interface

- review how chat history is submitted and improve it. Currently the model gets super confused
  - Probably want to split into separate messages
  - Imrpove the "from inline command"
  - Don't submit last assistant output if its last - we are re-running the last command

- When context is large its a good idea to give the cursor as input so the model is grounded on the right task more likely
- make a @task-inline mode that simply prints to the cursor without the multi file complex prompt
- Maybe we should only give line number for ambigous things like empty lines or lines with duplicates in the file? Or just tough lines like { etc? We can add a comment to the line that will tell what the line roughly is // start of anonymous function?
- This will also make the input closer to what the model is used to
- Ask for confirmation before overriding files - for example I forgot to add @ tabs and overriden the current package.json

# Bugs

- Keep on the lookout for "Document closed error" - it keeps popping up during editing :D
- No task found" hangs the cell execution and you cant stop it
- Existing session running is flaky (repro when too many files found for instance)
- [Might be resolved] bug with task not stopping even after the task is finished, cancel still running?? This is probably outdated local version
  - Nope, just saw it not terminate again even though it prints Done in feedback doc. Seems to be triggered with racy "Document has been closed" error
  - Also didn't complete even witout the document error 
- prompt issue with merging two separate change sets into a single one
- [first issue] @+run causes the run to happen even if the space is not right after the run command
- still appears to be an issue when too many files are available for selection. Extension hangs on Join Discrod. Repro in show me plugin repo [bra1nDump.ai-task]

# Unsorted

- Output markdown flickers - not sure if there is a fix for this. We can't seem to append to those outputs, only replace them.
- Requiring a user to invoke the tool is difficult
- Lower latency

- Inquire on how to use vscode itself. We have a list of commands and probably can also lookup what they do on the web. We can also run vscode commands

## Notes
Cleanup is also very annoying which is the product of making comments in code.
Only works for inline generation or with auto-cleanup

## Re architecting multi file edit format and granularity
Oftentimes it misses up with the line numbers, for instance oftentimes it wants to append to the end of the file but it is off by one line.
I think a better way is to use something like function calling with an option to create a top level symbol in file. We can take care of actually inserting it into the file 

## UX - Product

- Follow up task to fix errors after making changes - should be a button in the markdown
- There should be stop and stop and undo buttons 
- Only addressed tasks within the open tabs, not the entire project
- New unsaved file should work as a @ task input
  - It also currently hangs in this case - investigate
- Keep reference to a terminal, don't keep creating new ones
- Copy the style of open-interpreter
- Onboarding
- Delay scroll into view until there's only a single match ? I thought it would already do that
- Indentation should ideally be taken into account when generating diffs to match the indentation preferred by the user. This is low priority since type script does not care about it
- Preview also scrolls up all the time as we are re-writing the document. I wonder if we were to append to the document instead of write to fs scroll would be preserved
- Provide token count on the input and provide approximate price

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
- Create a company and apply for open ai credits
- New file creation is confusing, we should use a different Xml tag for it. I can keep it on the level of parsing and not change the model 

- Refine the truncation mechanism to truncate more aggressively
  - Be more permissive when range to replace does not entirely match file contents. Basically only match on the line numbers, and I also thought we had the mechanism of matching any of the prefix or suffix lines it does not need to be all of themthe bug seems to be related to that
- Only provide certain lines as potential starts and finishes for the range

# Done
- Add a dedicated activity bar icon for the extension so it has an easy place to access
  - Add a button to create a new notebook
   
- Improve error handling when keys are wrong or limit is reached
  - getting the next chunk from the stream fails: I anticipate this will be difficult because of using async a troubles
  - When .next() fails we can either return in err1r to avoid throwing in the fore loop. But then we will need to handle the errors in every single for loop iteration. 
  - I think it's a good idea to do this on the top level, where we would communicate the error to the user. We can then simply not run the lower level for loops if there is an error.
    - The upside of passing the stream to the lower level is that we can create local state for these lower level functions. For example highlighting a range.
    - Still what we can do is it transformed the stream to simply terminate once an error during streaming is encountered.
    - Let's write some tests to see how it would work
- Currently we handle stream creation airs and airs within the stream separately
  - This is good because those errors are generally different, and we expect majority of the time the air will happen on stream creation
  - We still need to handle stream ending correctly or incorrectly, and having separate air handling for that
  - I'm wondering if we can merge the two together and have a single error handling mechanism for both cases
    - For example when the stream creation fails, we can return a single item in the stream which would be of type 'failedToStartStream' or something like that
    - This actually seems hacky, as for example we will not have an aboard controller from the stream, so do we need to create a fake one? Merging to failure modes that are different seems like a bad idea

- If user runs task by hitting play button - add cell programmatically. Should be the same experience as if they hit shift enter

- cleanup old high level document stuff - probably not going back to that ever so lets just kill it. Kill everything related to that (keep the abstraction for logging though)


- Don't open new tabs for files that are already open, don't open tabs in the same group with the preview / notebook

Too many files matched: 239
  - Be smarter about this + show an error to end user suggesting a solution

- Improve new line character usage across the code base. This will suck because we print many logs relying on \n. For now I will just fix the code that has to do with line splitting for range calculation because that definitely needs to be robust.

Stability
- change prompt for new files for stability (just remove range-to-replace)
- fix imports in middle of a file - add example
- also add example of splitting a function - struggles to append, always decides to do 0: instead of appending to end of file maybe also new prompt ? insert?

This is useful as there will be new people trying the product
- Add a shortcut to create a new notebook
- Add a walkthrough that will show how to create a new notebook (it will be created in the session folder)

Better format is better :D
- Create a cell with markdown showing discord link
- Smaller heading size for files / task etc - takes too much space
- In output remove start / end messages - redundant
- Don't show output of files submitted and others if there is no need

- release a windows compatible version
- kick off multi file editing with all tabs up for modification after a command with input

- Migrate from open the eye to hillicon for demos to be free
- Reach out to people from the meetup to try the extension, schedule demos

- @ completions popup everywhere, even when @is not typed. This is annoying and should be fixed

## Record gifs for new file + cmd 3 more takes on the main video [2hr + 2hr editing] NO DAVINCI RESOLVE ?

- Switch to mp4 - no looping needed


# Archive

- Highlighting contexts expressions with better files.
  - It is tricky to pick good token types as they are very likely to collide with the existing colors in the file, possibly confusing the user.
  - I can also provide my own a theme that will only effect my own tokens, but that is more work. Let's do this later