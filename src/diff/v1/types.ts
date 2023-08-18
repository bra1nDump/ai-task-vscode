export type RangeToReplace =
  | {
      type: 'fullContentRange'
      fullContent: string
    }
  | {
      type: 'prefixAndSuffixRange'
      prefixContent: string
      suffixContent: string
    }

export type Replacement = string

export interface Change {
  description: string
  oldChunk: RangeToReplace
  newChunk: Replacement
}

export interface FileChangeOutput {
  changes: Change[]
}

export interface LlmGeneratedPatchXmlV1 {
  fileChangeOutput: FileChangeOutput
}
