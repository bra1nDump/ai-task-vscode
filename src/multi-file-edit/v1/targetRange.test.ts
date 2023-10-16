import assert = require('assert')
import { findTargetRangeInFileWithContent } from './resolveTargetRange'
import { TargetRange } from './types'
import * as vscode from 'vscode'

suite('findTargetRangeInFileWithContent', () => {
  test('should return undefined for non-matching content', () => {
    const oldChunk: TargetRange = {
      type: 'fullContentRange',
      isStreamFinalized: true,
      fullContent: 'nonexistent',
    }
    const documentContent = 'Hello\nWorld'
    const result = findTargetRangeInFileWithContent(oldChunk, documentContent)
    assert.ok(!result)
  })

  test('should handle empty document content', () => {
    const oldChunk: TargetRange = {
      type: 'fullContentRange',
      isStreamFinalized: true,
      fullContent: '',
    }
    const documentContent = ''
    const result = findTargetRangeInFileWithContent(oldChunk, documentContent)
    assert.deepStrictEqual(result, new vscode.Range(0, 0, 0, 0))
  })

  test('should handle single line replacement', () => {
    const oldChunk: TargetRange = {
      type: 'fullContentRange',
      isStreamFinalized: true,
      fullContent: 'Hello',
    }
    const documentContent = 'Hello\nWorld'
    const result = findTargetRangeInFileWithContent(oldChunk, documentContent)
    assert.deepStrictEqual(result, new vscode.Range(0, 0, 0, 5))
  })

  test('should handle prefix and suffix range', () => {
    const oldChunk: TargetRange = {
      type: 'prefixAndSuffixRange',
      isStreamFinalized: true,
      prefixContent: 'Hello',
      suffixContent: 'World',
    }
    const documentContent = 'Hello\nThis is a test\nWorld'
    const result = findTargetRangeInFileWithContent(oldChunk, documentContent)
    assert.deepStrictEqual(result, new vscode.Range(0, 0, 2, 5))
  })
})
