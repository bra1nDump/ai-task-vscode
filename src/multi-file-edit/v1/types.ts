/*
  Created a new interface
  interface Streamed {
    isStreamFinalized: boolean
  }
  I will later extend Change RangeToReplace to be Streamed
  I will also create a custom string container that will be Streamed

  I'm delaying this abstraction right now in favor off actually writing code into the files.

  Workaround
  - I will require old chunk to be fully completed before trying to write to a file, 
  this is because we want to know the range and the file we're writing to before we start writing.
  - I will also make nu chunk optional that will signal that the old chunk is finally complete 
*/

export type TargetRange =
  | {
      type: 'fullContentRange'
      isStreamFinalized: boolean
      fullContent: string
    }
  | {
      type: 'prefixAndSuffixRange'
      isStreamFinalized: boolean
      prefixContent: string
      suffixContent: string
    }

export interface Replacement {
  isStreamFinalized: boolean
  content: string
}

export interface Change {
  description: string
  oldChunk: TargetRange
  newChunk: Replacement
}

export interface FileChange {
  /** If not present - means its streaming.
   * We will use this field early to show the file targeted with a change */
  filePathRelativeToWorkspace?: string
  change: Change
  isStreamFinilized: boolean
}

export interface LlmGeneratedPatchXmlV1 {
  /**
   * @task
   * - I have updated the type to be a string instead of a string array, I am also ditching markdown list format for the plan and now it will be free form within <plan> tags make changes acordingly across the files.
   * - Simplify code for printing out the plan, make sure you are still printint out the delta and not the entire plan
   */
  plan: string
  changes: FileChange[]
  /** Not used now, but it's much easier to add a new field to an object type versus an array */
  isStreamFinalizedUnused: boolean
}

export const isChangeFinalized = (change: Change) =>
  change.newChunk.isStreamFinalized && change.oldChunk.isStreamFinalized
