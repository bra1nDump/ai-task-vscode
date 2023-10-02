# Features

- Multifile edits by leaving around comments
- Automatically fix compile errors after refactorings

# Next milestones

- [done] Published extension
- [done] Have a novel feature - probably working multi file edits
- [done] Recorded demo video showing basic usage + gif for readme
- [done] Release project on GitHub
- Found a single demo user
- Reached out to 5 potential collaborators
- Replaced continue on the current project

# Next up

## Record gifs for new file + cmd 3 more takes on the main video [2hr + 2hr editing] NO DAVINCI RESOLVE ?

- Switch to mp4 - no looping needed
- Pretty up readme
- Fix the name: ai-task coding assistant
- Have a task alias - ai-task? for demo / brand purposes

# Bugs

- Changing markdown files doesn't currently work, it opens the preview for the file, but then switches the preview to show the file we are trying to edit. Preview always shows the current md file on the left ...
  - It is also unable to actually apply change to the file for some reason - investigate

# Unsorted

## UX - Product

- Cleanup @task mentions after running
- One printing out task, in the examples use `code`  also use a better key ideas format to keep things short and more readable. Developers do love lists
- Highlighting contexts expressions with better files.
  - It is tricky to pick good token types as they are very likely to collide with the existing colors in the file, possibly confusing the user.
  - I can also provide my own a theme that will only effect my own tokens, but that is more work. Let's do this later
- Only addressed tasks within the open tabs, not the entire project
- New unsaved file should work as a @ task input
  - It also currently hangs in this case - investigate
- Keep reference to a terminal, don't keep creating new ones
- Copy the style of open-interpreter
- Onboarding
- Add play button to @bread comments - instead of @run
- Delay scroll into view until there's only a single match ? I thought it would already do that
- Indentation should ideally be taken into account when generating diffs to match the indentation preferred by the user. This is low priority since type script does not care about it
- Preview also scrolls up all the time as we are re-writing the document. I wonder if we were to append to the document instead of write to fs scroll would be preserved
- Preview for the high level oftentimes flickers. Not sure what causes itb but try larger outputs
  - we rewriting the entire file. Workaround documented in append function
- Provide token count on the input and provide approximate price
- Add discord server link to hight level output

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


# Done

- @ completions popup everywhere, even when @is not typed. This is annoying and should be fixed

