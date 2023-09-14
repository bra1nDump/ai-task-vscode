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
https://promptfoo.dev/docs/usage/node-package

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