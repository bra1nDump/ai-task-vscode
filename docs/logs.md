# September 18 - Flattened the prompt, notes on what kind of changes developer make

- Change type from string to an array of strings
- Add a field to some type
- Merge 2 types, split a single type
- Move a function
- Move parameters up / down the call stack
- Split a function into two for pagination
- Error handling code

# September 13 - Trying out on a real project, result satisfactory, contemplating about prompt benchmarking

Content below is duplicated in [[prompt-testing]]
Having some reliable way to know which print is better is really nice.
Ideally I would keep accumulating a list of inputs and desired outputs and then for each prompt iteration I would run the tests and see how many of them pass.
More so I would want to see the quality of the passes.

This all seems like a fair bit of work. Alternatively I can work on inline completion which is mostly independent of the prompt quality. I can also work on the user experience for targeting ranges and including context providers. I can also work on the language server.
I have been working on prompt engineering for the past 5 days so why do I think things will change for the better? Meaning I will not have to iterate on the prompt as much.
Because if I will continue doing what I have been which is tried to get multi file edit to work nicely - the test harness would be really useful.
Again this will not remove the time I spent on the iterations, it will simply make it more efficient.
I think what I can start with is keeping bookmarks of branches where my simple use case sits and then I can return to those places to see how the new prompt works. Yes it will be manual, but having the test cases is essential for both manual and automated testing so this seems like it will have to happen either way.

Don't seem like a very nice thing to have. I estimate the time to set it up to be around two days.
Prompt food also has nice interface where you can run it from within javascript (it itself is written in typescript)
<https://promptfoo.dev/docs/usage/node-package>

What it will basically provide me is iterating over a list of tests where the test variable is the test name.

```typescript
import promptfoo from 'promptfoo';

(async () => {
  const results = await promptfoo.evaluate({
    prompts: ['v0-decoupled-with-task-no-structured-chain-of-thought-prompting', 'v1-with-chain-of-thought-prompting'],
    providers: [
      'openai:gpt-4',
      (prompt, context) => {
        // OPTION 1. Constrain the inputs and purely iterate on the prompt
        // This will read the input files from a directory with a matching name within the fixture directory
        const inputFiles = await getFilesForFixture(context.vars.useCaseId);
        let messages = [];
        switch (prompt) {
          case 'v0-decoupled-with-task-no-structured-chain-of-thought-prompting':
            messages = v0MultiFileEdit(inputFiles);
          case 'v1-with-chain-of-thought-prompting':
            // ...
        }

        /* OPTION 2. Run end to end tests in sample projects and compare the resulting files instead of resulting llm output
        This will need to run as part of the tests and at that point prompt foo is only needed for grading which can be done with an extra API call 
        Prompt food actually supports this by using assertions https://promptfoo.dev/docs/integrations/mocha-chai
        This will similarly require us to setup a directory for each testcase, and run the top level command by passing 
        different version ides for the prompt to use

        - I think all the tests need to run within the same workspace, meaning I either need to have a separate test configuration per test, or I need to dynamically hydrate the current workspace for the test. I think the latter is the way to go.
        - I wonder if from within the test I can change the workspace directory. I don't see why this would not be possible. I can also simply copy the directory from the snapshots into the root as a setup for each test.
        - This way I can also track historically the improvements. Unfortunately I would still have to maintain the prompts for different versions.
        - This will currently not capture errors but I can probably inject them manually
        */
        
        return {
          output: '<LLM output>',
        };
      },
    ],
    tests: [
      {
        vars: {
          useCaseId: 'plan-refactor',
        },
      },
      {
        vars: {
          useCaseId: 'miro-board-cleanup',
        },
      },
    ],
  });
  console.log('RESULTS:');
  console.log(results);
})();
```

# September 9 - Prompt engineering for a typical refactor

<https://platform.openai.com/playground/p/teFt8UDSIlrreBJlEMJmCG7P?model=gpt-4>

Realizing that not only the Xml change format distracts the model, but sheer amount of code distracts it.
When being asked to narrow down to the functions that need to be changed, and then follow up with asking for the exact changes, the model is able to produce a much better result.

# Random the sin inspiration

![Alt text](cool-vscode-icon.png)

# September 5 - Finished simple and flawed DocumentSnapshot implementation for backdating edits

kirilldubovitskiy@Kirills-MacBook-Pro bread % ./get-lines-of-code.sh
===============================================================================

Language            Files        Lines         Code     Comments       Blanks
===============================================================================

JavaScript              2          136           85           29           22
 JSON                    2          108          108            0            0
 Shell                   1            2            1            1            0
 TypeScript             33         3289         2259          660          370
-------------------------------------------------------------------------------

Markdown               24         5526            0         5050          476
 |- JSON                 1            9            9            0            0
 (Total)                           5535            9         5050          476
===============================================================================

Total                  62         9061         2453         5740          868
===============================================================================

# Gradually apply changes

- target range resolution should run on the file snapshots that were submitted to the LLM
- Resolution will be called while being coupled with the change application
- Resolution should only be performed for a single change - Only the change that's currently being processed is of interest to the applicator / continuous patcher

Reading cursorless code because they are dealing with a similar issue.
The way they have solved this problem is by

- Having a watcher of text edits globally
- Once a text edit was performed update the ranges that were registered
- Basically if you want to keep some range up to date you simply added to the RangeUpdater, and it is magically kept up to date. You are simply holding a mutable reference to the range I'm assuming?

It is a really good solution because it will also handle the cases when a human is editing the file alongside with the LLM. I assume other projects will have trouble with thus, and this is how we can stand out.
This will also take care of the case when multiple sessions are running at the same time. My original design assumed the LLM is the only thing performing and edit and it's only a single session, the state will be only the changes that come during this one session.

## The tradeoffs

### Implementing myself from scratch

- will probably result in a simpler algorithm
- likely contain multiple hard to fix bugs that will be hidden and I will have to continuously go back and fix it
- Will probably be faster to get to a working prototype

### Getting the code from cursorless

Key abstractions RangeUpdater, updateRangeInfos

- Handles more cases as described above for concurrent edits - will set aside from competition
- Is battle tested so as long as I integrate correctly should just work
- I think will work nicely with the repeated edits. Basically I will not unregistered the ranges until the session is complete. It should then continuously override the range
- I probably still need to modify the code because I don't want to pull in all the abstractions
- If I do decide to pull all the abstractions, I can then more easily take more things from cursor lists later on
  - I now need to have mappings from VSCode types, and bloating code with interfaces and transformations
  - I need common package
    - typings
    - utils
  - cursorless-engine
    - core/updateSelections
    - core/typings
- A good first step is to run the extension locally and see how it handles the range updates
- Next stage is probably simply copying the least amount of code possible to get it to compile
- Alternatively I can literally copy the entire thing, then it is guaranteed to compile!

It seems like I will be going back to pnpm...

The common package contains most of the abstract range and file types, which I already kind of have for myself. It also contains some of the nice arithmetics that I would have to use either way for my custom implementation so that's definitely getting borrowed.
Update selections looks actually pretty self contained,

### Big turn - what if I join cursorless with this llm shit?

It has many abstractions already, but whats more important it has 2 really strong vscode super experts + open source experts.
Approach - take this one feature - range updater out of the repo.
Later suggest factoring this out into its own package, and factor out other abstractions that are needed by both birds and cursorless.
Cursorless is a good name actually - it can be cursorless-voice and simply cursorless - the llm way of editing your codebase.
Voice / precise mode will deal with referencing tokens /
Create a separate project within the cursorless organization

#### Why do it?

- Work with experts
- Pipeline is kinda similarish
  - Targets (@bread comments, @file) -> modifiders, precise (smart, dynamic, un-structured) -> action, precize from one fo the tools (full replace, using one of the precize tools)

#### Why not do it?

- Overlap in abstractions is not high enough
  - Target locating is done by the llm and usually does not need to be as precise
  - Target locating is also very dynamic - not every function
  - Target is often an entire file - cursorless targets things within the file only
    - Can be expanded. Move file x to folder y is a great idea actually for voice
  - Action is also usually dynamic, simply re-write the thing
  - Actions can also use structured tools tho
    - For example when exploring code you can ask for every function, open the return type definition
- Long term we will not be referring to low level tokens / scopes at all?

### State of the code

```
cursorless-vscode % tokei -e "*fixture*" -e "*yaml"
===============================================================================
 Language            Files        Lines         Code     Comments       Blanks
===============================================================================
 BASH                    1           20           10            5            5
 C#                      1            1            1            0            0
 C++                     1            1            1            0            0
 CSS                     3           98           87            2            9
 Java                    1            6            6            0            0
 JavaScript             12          471          380           59           32
 JSON                   29         3756         3756            0            0
 Python                 62         4168         3370           99          699
 Sass                    2            8            0            8            0
 Scala                   1           51           36            6            9
 Scheme                 11          790          482          230           78
 Shell                   6          199          108           45           46
 SVG                    14         3245         3245            0            0
 TeX                     1          102           85           10            7
 Plain Text              2           11            0            9            2
 TOML                    2           11           10            0            1
 TSX                    22          769          679           25           65
 TypeScript            586        46923        34801         7036         5086
 XML                     1            3            3            0            0
-------------------------------------------------------------------------------
 HTML                    2           32           30            1            1
 |- CSS                  1            4            4            0            0
 |- JavaScript           1            2            1            1            0
 (Total)                             38           35            2            1
-------------------------------------------------------------------------------
 Markdown               39         2477            0         1664          813
 |- BASH                 4           12           12            0            0
 |- Batch                1            2            2            0            0
 |- JSON                 3           95           94            0            1
 |- TypeScript           1           21           21            0            0
 (Total)                           2607          129         1664          814
===============================================================================
 Total                 799        63142        47090         9199         6853
===============================================================================
```

# Sometime in August

Looking at all the use cases and thus directions I could go, I decided to test the current solution and try to market it as is to some users.

Next in line is probably better insights and control of the generation. I should be able to stop generation at any point. I should also better understand what files were included as context, and be able to navigate to them quickly.

I might later attempt continuing at cursor simply to replace continue for small modifications. Again this feels like the wrong direction to go as of right now. I have something working already, there might be use case I need to double down and check if there is a legitimate use case by trying to sell.

# August 31, Thursday

Issue: The issue where the document was shown in the editor on the first append has been resolved. We are now using vscode.workspace.fs to write to the file instead and maintaining a map of documents to their contents, similar to pending edits. We are assuming that we are the only ones writing to the file. No other functions were modified during this process.

Issue: @bread document is shown in editor on first append. Use vscode.workspace.fs to write to file instead. Maintain a map of documents to their contents. similar to pending edits.

- Assume we are the only ones writing to the file.
- DONT MODIFY OTHER FUNCTIONS, ONLY THIS ONE

[.bread/sessions/8-31-23, 10-12 AM.raw.md](../.bread/sessions/8-31-23,\ 10-12\ AM.raw.md)

Did not respect part of the instruction to maintain map of contents

# August 24, Thursday

Real time feedback on what the extension is doing

- Open a file in column two showing which files were submitted as input, also providing a relative link to them
- Installed the extension locally, and trying hard not to use other extensions
- Highlight ranges that will be edited
- Printing out the plan
  - Probably more has shown sets to keep track of what we have already printed out and only print out once its completed streaming
  - At the same time I can start thinking about how to print out the it deltas for the same element
  - I should probably also use Xml for the plan separators, and might as well flatten out the change tags

Today was pretty productive,
Last commit, and scripting ideas

===============================================================================
 Language            Files        Lines         Code     Comments       Blanks
===============================================================================

JavaScript              2          134           85           29           20
 JSON                    2          107          107            0            0
 Shell                   1            2            1            1            0
 Plain Text              1            4            0            4            0
 TypeScript             31         2490         1765          417          308
-------------------------------------------------------------------------------

Markdown               21         4145            0         3903          242
 |- JSON                 1            9            9            0            0
 (Total)                           4154            9         3903          242
===============================================================================

Total                  58         6882         1958         4354          570
===============================================================================

# August 23, Wednesday line count statistics

===============================================================================
 Language            Files        Lines         Code     Comments       Blanks
===============================================================================

JavaScript              2          129           85           25           19
 JSON                    2          108          108            0            0
 Markdown               20         3928            0         3747          181
 Plain Text              1            4            0            4            0
 TypeScript             28         2327         1663          366          298
===============================================================================

Total                  53         6496         1856         4142          498
===============================================================================

# Multiplexing a async iterable

I want to bring in @reactivex/ix-ts
as it implements my hacked together async interables
and supports multiplexing which I want

Will this was a fucking pain in the ass. Change pity was of great help but not enough and I still had to debug it manually.

I think there's currently a bug in this code as multiplexing is not handled
Just does something similar but not quiet I think
<https://github.com/ReactiveX/IxJS/blob/f07b7ef4095120f1ef21a4023030c75b36335cd1/src/asynciterable/operators/memoize.ts>

What I want is something like this:

```ts
const source = function* () {
  yield 1;
  yield 2;
  yield 3;
  yield 4;
};

const [origina, mirrored] = mirrorOrSomOtherOperator(source)

for (let item of origina) {
  console.log(`Next: ${item}`);
}

for (let item of mirrored) {
  console.log(`Next: ${item}`);
}
```

# Issues with multi-file edits

There are a couple

- I already give the bread comments effectively providing the location where I want the change to happen
- The model seems to be distracted and does not produce as good over code changes even though I tried multiple times, and continue or basic change but suggests the correct change from the first try

I was also doubting the fact that this is an effective way to actually program with the LLMs.
Actually combining voice control and native refactors and VSCode is really nice, I can move the functions to other or new files very easily. Vscode updates all the imports etc.

Anyways I have started a new document collecting use cases for multi file edits. Also I feel like I've already written this somewhere I just don't know where I wrote down these thoughts. Probably in the file itself actually
[multi-file-edit-use-cases.](../src/chase-errors/prompt-version-of-writing-this.md)
