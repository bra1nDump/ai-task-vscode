/**
 * Gathered the problems in the code base
 * Inline comments with the diagnostic errors within the files
 *   (will mess up target range matching algorithm though)
 *   We can strip out those lines from the old chunks after they are returned
 * Alternatively we can use line ranges as the target range
 *   This we'll need refactoring to happen in the multi file edit module.
 */
export async function chaseBugsCommand() {
  console.log('Bird watch is on the way for those pesky bugs')
  await new Promise((resolve) => setTimeout(resolve, 1000))
}
