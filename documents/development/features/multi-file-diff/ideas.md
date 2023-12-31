# Overview

The quality of the code produced is poor

# Shitty code is produced

Hypotheses - model gets distracted simply buy too much context.
I am able to get much better results when I trim the context down to just the function that I am trying to change p.

## Still record the video to showcase the potential
- Try on miro repository (url provider would be really nice here because I can just give the lint to the review)
- Over specify the task and get the video working

## Improve chain of thought prompt before creating the more work fix. 

Questions were already asking:
- Collect all of the information relevant to the task the user is trying to accomplish and restate the task
- Make sure to restate any specific instructions that the user has already provided on how to accomplish the task 
- Sometimes parts of the task are already accomplished, clearly state so and consider it stale instructions

Questions we can ask of the model:
- Which function should we change? (helps model target)
- Can we change a smaller scope to accomplish the task?
- Are there any helper functions we can reuse?

Other ideas:
- We can also provide examples of how this chain of thought
- I'm now thinking restating part of the task and providing detailed reasoning for the code change right before generating the change might help the model focus on the particular change it is making


## Split up the generation
Step 1
- Extract the task that we are trying to accomplish
- Locate the functions (with a chain of reasoning zoom in to a code block) that need to be changed
  - Code blocks are preferred to functions because sometimes functions are too long
- Locate possible dependencies: like imports, helper functions, entire files

Step 2, for each code block to update
- Include the high level task, the dependencies, as context
- Print out the code block to change right before we ask for the updated block

### Considerations
- It is tough to get the dependencies right, it is much easier to simply include all of the code
- The models will get better and this will be redundant work
- Parallelization has good side effects, and can be presented as a novel feature

### 

### Ideas

- I have always been testing on the same example, let's find other ones
- Play with the prompt - have it generate a longer more detailed plan


# Formats

## Format v1 - old chunk / new chunk

<file path="">
<change summary="Updating imports to account for previous change">
<range-to-replace>
import { useQuery } from 'react-query';
</range-to-replace>
<replacement>
import { useQuery } from 'react-query';
import { useMutation } from 'react-query';
</replacement>
</change>

## Old improvements

- When deleting or overriding big portions of the code range-to-replace will be large. And it gets printed out before the replacement so the perceived delay is large.
- With truncation it basically is the same as providing prefix / suffix context.
- I feel like its better to name the old chunk as range, and the new chunk as replacement.
- Lets get the functions working before I do more iterations on this
  - Lets also get the application of diffs as well
- Instead of generating diff, just override the code first. Present the diff once the generation is completed
- Usually there are no repeated file lines in a code file. Unless its tests, or unless its
- Currently applying the defend place will mess up the original file, subsequently messing up the target range location mechanism. Options
  - Find the initial range in the file, apply the change to it but now update the VSCode range of the target to match the new range
  - Cash the initial file contents and apply the changes to the cashed version. Incompatible with the current implementation as it operates directly within the vas code editor
- Current implementation overall sucks because it is fully VSCode dependent, I don't think I necessarily want to change that in the time being though
  - It will make this running as a commandline tool harder as well as will complicate unit testing
- `async function findAndCollectBreadedFiles(): Promise&lt;FileContext[] | undefined&gt; {` it is smart enough to escape < >
- Got error: `command failed with error code 2: error parsing glob '**/${': unclosed alternate group; missing '}' (maybe escape '{' with '[{]'?)`

## Format v2 - open ai function calling

Instead of xml encoding, we can use function calling fomat to encode the changes.
Can we use lang chain for this?

A neat python library is https://github.com/jxnl/instructor, uses pydantic to call functions.
Is there an alternative for typescript
Clearly supports steaming https://openai-function-call.onrender.com/multitask/#:~:text=30%7D%0A%5D%7D-,Streaming%20Tasks,-Since%20a%20MultiTask

https://github.com/hwchase17/langchainjs/blob/65e59d669889ef07a564c5ec8fd23e21ed1aa68a/examples/src/models/chat/openai_functions_zod.ts

Function calling is used in the agents, but how? I don't think it will structurize the tools as well.
https://github.com/hwchase17/langchainjs/blob/65e59d669889ef07a564c5ec8fd23e21ed1aa68a/langchain/src/agents/initialize.ts#L177

How would streaming work?

- Again seems like we need to write a custom parser
- There is one that looks promising but requires more digging into to acomplish the task compared to having chat gpt write the parser for us https://github.com/uhop/stream-json/tree/master

# Generally useful ideas

- How do we help it 'plan' what it will do?
  - Which classes / functions will it modify?
- Best change location encoding approach
  - Line numbers?
  - Infer line numbers from function names?
- Its useful to say where the change is made - header, function body, for loop, etc

# Benchmarking

- Create the best ever diff prompt
- Create a dataset of commits (single file commits?, with smaller files?)
- For each proposed format Vi create a function `encodeChangeVi(oldFile, newFile) -> LLMUnderstoodDiffFormatVi`
- Split the commit dataset into prompt and test
- For each format Vi
  - Create a prompt from the prompt dataset by applying `encodeChangeVi(oldFile, newFile)` to each commit
  - For each of the test commits subtracting the newfile - so message + oldfile
    - Run the prompt on the commit message + old file, should get `LLMUnderstoodDiffFormatVi` type as output
    - Compute the correct output by running `encodeChangeVi(oldFile, newFile)` on the commit
    - Compute the loss between the two outputs - probably need to ask gpt to do this too - promptfoo?

# Handle indentation

We can format the file after the fact, but thats just ugly as the response is streaming.
I want to get the indentation right the first time.

We should infer based on the indentation of the file after the context prefix.
Simply look at last line.
Adjust each line's indentation to match.

# Demand, Cursor, someone posted:

First off, cursor has been really great to use so far!
When trying to write frontend , I love asking cursor to write my css. However, it's slightly annoying since I have to ask it to create the css first (passing in my component file) where it then generates some class names and then i have to do the reverse where I pass in the css and ask it to fill in the class names on my component file. It would be great if this could be done in one go where I just pass in my component file and a css file and ask it to generate some styles.

dynx.
