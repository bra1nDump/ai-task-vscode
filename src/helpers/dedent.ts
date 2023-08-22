export function dedentAndTrim(str: string): string {
  return str.replace(/(\n)\s+/g, '$1').trim()
}
