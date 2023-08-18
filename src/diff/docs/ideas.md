# Formats

## Format v1 - old chunk / new chunk
<file path="">
<change summary="Updating imports to account for previous change">
<old-chunk>
import { useQuery } from 'react-query';
</old-chunk>
<new-chunk>
import { useQuery } from 'react-query';
import { useMutation } from 'react-query';
</new-chunk>
</change>

### Improvements / issues
- When deleting or overriding big portions of the code old-chunk will be large. And it gets printed out before the new-chunk so the perceived delay is large.
- With truncation it basically is the same as providing prefix / suffix context.
- I feel like its better to name the old chunk as range, and the new chunk as replacement.
- Lets get the functions working before I do more iterations on this
  - Lets also get the application of diffs as well
- Instead of generating diff, just override the code first. Present the diff once the generation is completed
- Usually there are no repeated file lines in a code file. Unless its tests, or unless its
- Alt+select allows to select multiple ranges in vscode. This is very useful when you want to make multi edits
  - They can also be parallelized

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

