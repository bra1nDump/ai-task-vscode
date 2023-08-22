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
  changes: Change[]
}

export interface LlmGeneratedPatchXmlV1 {
  fileChanges: FileChange[]
}
