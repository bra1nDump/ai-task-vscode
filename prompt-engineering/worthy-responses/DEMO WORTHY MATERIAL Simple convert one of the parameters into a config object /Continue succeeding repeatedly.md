Given this inputted repeatedly produced correct output.

Birds failed twice and on the third try succeeded
Fourth time also succeeded, but selected too much context and truncated output

It will also try to change other functions. It would repeatedly target the entire function as a replacement target

```ts
/* @crust your job is to refactor breadIdentifier parameter by moving it into a configuration object argument passed as the last argument
 * to this function. Don't touch other parameters. Only modify the function
 * signature
 */
export function createMultiFileEditingMessages(
  breadIdentifier: string,
  fileContexts: FileContext[],
  taskPrompt: string,
) {

```