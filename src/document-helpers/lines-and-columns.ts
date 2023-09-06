/// PASTED FROM https://github.com/eventualbuddha/lines-and-columns/blob/main/src/index.ts

export interface SourceLocation {
  line: number
  column: number
}

const LF = '\n'
const CR = '\r'

export class LinesAndColumns {
  private readonly length: number
  private readonly offsets: readonly number[]

  constructor(string: string) {
    this.length = string.length
    const offsets = [0]

    for (let offset = 0; offset < string.length; )
      switch (string[offset]) {
        case LF:
          offset += LF.length
          offsets.push(offset)
          break

        case CR:
          offset += CR.length
          if (string[offset] === LF) offset += LF.length

          offsets.push(offset)
          break

        default:
          offset++
          break
      }

    this.offsets = offsets
  }

  locationForIndex(index: number): SourceLocation | null {
    if (index < 0 || index > this.length) return null

    let line = 0
    const offsets = this.offsets

    while (offsets[line + 1] <= index) line++

    const column = index - offsets[line]
    return { line, column }
  }

  indexForLocation(location: SourceLocation): number | null {
    const { line, column } = location

    if (line < 0 || line >= this.offsets.length) return null

    if (column < 0 || column > this.lengthOfLine(line)) return null

    return this.offsets[line] + column
  }

  lengthOfLine(line: number): number {
    const offset = this.offsets[line]
    const nextOffset =
      line === this.offsets.length - 1 ? this.length : this.offsets[line + 1]
    return nextOffset - offset
  }
}
