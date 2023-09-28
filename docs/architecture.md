Assumes you have read [README.md](/README.md).

# Control flow overview
- The user in their current file types @ run and presses space, or press 'Cmd+Y' (macOS) or 'Ctrl+Y' (Windows, Linux), or manually invoke the command from the command palette.
- All of these actions trigger the [completeInlineTasks](/src/commands/completeInlineTasks.ts) command.

- [Create new session](/src/session/index.t.ts)
    - Creates at new entries within .task/sessions with raw and high level files. Raw contains what the LLM receives as input and its subsequent output. High level contains the markdown that will be displayed to the user while the session is running.
    - [documentManager](/src/context/manager.ts)
        - It starts out empty but will later be populated with documents and static content. 
        - This is what produces the bulk of the dynamic portion of the prompt. 
        - It plays a crucial role when backdating edits received from the LLM (file might have already been changed since the LLM received it). 
- We collect all the context mentioned by the users such as @ tabs @ errors within the command, all context gets added to context manager
  - This part can be improved a lot, right now I simply search for strength matches within the files, we want to define some actual syntax four context expressions. We should design it in away that users can add their custom expressions later. [More on this](/docs/features/context-simple.md) and [here](/docs/features/context-language-server.md)

- Kick off [multi file edit](/src/multi-file-edit/v1/index.ts). 
    - This is really not a great name, since this is now also handles new file creation and terminal comment running.
    - Originally I thought I will experiment with various monolithic prompts and output formats for multi file editing.  
    - In reality I have iterated on the same version saving checkpoints of what the static part of the prompt looked like [checkpoints](/prompt-engineering/checkpoints/multi-file-edit/)

- This creates a static prompt, in dynamic part of the prompt from session contact manager
- It then kicks off [LLM](/src/helpers/openai.ts)
    - This returns a stream that instead of containing the deltas, I contains the entire response at that point in time. The response is a string continuously being appended to.
    - I'm using a library called ix to handle to provide operators like map and filter for asynchronous iterators. I had to implement a ixMultiplex operator to allow multiple 'subscribers' (for await loops) to the same stream without exhausting it on the first iteration. Most likely I have just not found an operator that already exists that does this.
- This stream is then mapped over parsed using prompt version dependent parser
- [Warning] The data structure is a little confusing, as on a stream produces a new item, the item is usually completely new and independent of the last item. In our case every item in the stream is the more up to date version of the changes we are trying to perform. At the moment will really only care about the last change, we might simplify the stream element to just be the last change. 

- [The cool part] [Resolving changes](/src/multi-file-edit/v1/resolveTargetRange.ts) produced by the LLM to actual edits that can be applied to real documents
    - After parsing the stream we can't quite apply the changes just yet to the real files/documents.
    - This happens because during the next step we are continuously applying partial changes messing up the original offsets.
    - Not to mention that the user might have changed the file manually or other LLM tasks were running in parallel.
    - This step will also create new files if they don't exist (yes it's not great, see comments in the file)

- [The cool part 2] [Continuously applying changes](/src/multi-file-edit/applyResolvedChange.ts)
    - Applying the changes involves many different things: focusing on the text editor with the file that is updated, highlighting ranges to be updated, reporting progress to the user through the high level markdown file, actually applying changes, etc.
    - I have split these different things into separate stateful stream consumers (functions with variables and for await loops)
    - Each of these consumers use their state to know what they have done in the past, usually which changes they have fully processed or partially processed. Right now all of these consumers effectively only work on the very last change. (see Warning above)
    - The current way to apply changes has many pitfalls, most of all is its fragile stateful nature relying on things like the file being opened in the editor prior to performing an edit. These features might force re architecture:
        - Allow parallel edits (some sort of change queue, or applying changes in the background using workspace edits)
        - Allowing the user to interrupt the LLM and continue later after adjusting it's course

