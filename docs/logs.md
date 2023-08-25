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
https://github.com/ReactiveX/IxJS/blob/f07b7ef4095120f1ef21a4023030c75b36335cd1/src/asynciterable/operators/memoize.ts

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