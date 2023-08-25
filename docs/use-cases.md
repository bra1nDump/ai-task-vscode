- Add export to all constants in a file
- Update data structure string -> { content: string, someFlag: boolean }
  - compilation will fail and you want to automatically fix it across the codebase
  - ![Example data structure change](fix-tsc-value.png)
  - Maybe you show it how to fix one of these problems manually
  - You can also provide heuristics for how to fix it, the problem old as day is - oh, I now need this new data thats unavailable in this context, let me pass it in as a parameter, oh, oh oh.
  - Solve this publically! Github will literally roll this out in a week / month
- Split a then chain into multiple awaits

- Find all places in the code base with plural or singular variable names not matching the type can be inferred

## When I was creating a new chase bugs command

I will pretend that I have a smart tool to convert my desires into code assuming it has ability to create new files and edit existing files et.

Previously I was very discouraged from multi file edits because I looked at one old commit and saw that it was going to be hard to create that commit with a single multi file edit. The idea with multi file edits is that it will take multiple small intermediate steps to get there. You usually start out with a stub one implementing a new feature. For example like the but renaming idea by Isaiah.

To create code to chase and fix errors I roughly see providing these instructions
Actually I am providing these instructions but just to myself

- Create top level command chase-errors in this directory in a new file
- Register it in the extension.ts
- Updated in the package
- Rename release.ts chase-bread.ts, and its test file
- ...I have not actually completed this and continued coding the way I knew how
