```ts
export interface LlmGeneratedPatchXmlV1 {
  /**
   * - I have updated the type to be a string instead of a string array, make changes acordingly across the files
   *   to account for this change, including the fixes to address the compilation errors due to this refactor.
   * - First You should update the parsing code to support it. The new desired format is to have the plan printed out within <thoughts>...</thoughts> tags.
   * - Next update the code where we print out the plan to use the new format. Use a simple string variable to keep track of the current plan already printed and compute the delta to be printed next
   */
  plan: string
  changes: FileChange[]
  /** Not used now, but it's much easier to add a new field to an object type versus an array */
  isStreamFinalizedUnused: boolean
}

// Update this function to address the refactoring changes

/*
- Change the type of the plan to be a string instead of a string array
- bla bla 
*/

/*
- Change the type of the plan to be a string instead of a string array
- bla bla foo
*/

// Split the stream into stream with plan and changes to apply
// Process in parallell
// Currently has an issue where I am unable to log the delta and am forced to wait until an item is fully generated
// Refactor: Parsing should pass deltas or I need to implement local delta generation
async function showPlanAsItBecomesAvailable() {
    const planStream = parsedPatchStream.pipe(mapAsync((x) => x.plan))
    const loggedPlanIndexWithSuffix = new Set<string>()
    void highLevelLogger(`\n# Plan:\n`)
    for await (const plan of planStream)
        for (const [index, item] of plan.entries()) {
        // Find the last suffix that was logged
        const latestVersion = `${0}: ${item}`
        const lastLoggedVersion = [...loggedPlanIndexWithSuffix]
            .filter((x) => x.startsWith(`${index}:`))
            .sort((a, b) => b.length - a.length)[0]
        // Only logged the delta or the first version including the item separator
        if (lastLoggedVersion) {
            const delta = latestVersion.slice(lastLoggedVersion.length)
            void highLevelLogger(delta)
        } else void highLevelLogger(`\n- ${item}`)

        loggedPlanIndexWithSuffix.add(latestVersion)
        }
}
```

# The responses awesome, and is exactly what I want

```ts
async function showPlanAsItBecomesAvailable() {
    const planStream = parsedPatchStream.pipe(mapAsync((x) => x.plan))
    let loggedPlan = ""
    
    void highLevelLogger(`\n# Plan:\n`)
    for await (const plan of planStream) {
        // Compute the delta to be printed next
        const delta = plan.substr(loggedPlan.length); 

        void highLevelLogger(`\n- ${delta}`);

        // Update the logged plan
        loggedPlan = plan;
    }
}
```
