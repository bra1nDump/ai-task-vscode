/*
 *TODO: Create a new type that will be used for both
 *type StreamingValue<Value> =
 *{ type: 'notStarted' }
 *| { type: 'streaming', value: Value }
 *| { type: 'finished', value: Value }
 *
 * During the refactor we should also merge change type and file change
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
  description?: string
  oldChunk: TargetRange
  newChunk: Replacement
}

export interface FileChange {
  /**
   * If not present - means its streaming.
   * We will use this field early to show the file targeted with a change
   */
  filePathRelativeToWorkspace: string
  change: Change
  isStreamFinilized: boolean
}

export interface LlmGeneratedPatchXmlV1 {
  /**
   * Contains short technical description of the task. Used to start the
   * chain of thought for the edits the model about to make
   */
  task: string
  changes: FileChange[]
  terminalCommands: string[]
  /**
   * Not used now, but it's much easier to add a new field to an object type
   * versus an array
   */
  isStreamFinalizedUnused: boolean
}

export const isChangeFinalized = (change: Change) =>
  change.newChunk.isStreamFinalized && change.oldChunk.isStreamFinalized
