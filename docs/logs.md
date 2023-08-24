# Multiplexing a async iterable
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