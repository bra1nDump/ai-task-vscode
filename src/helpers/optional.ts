export function undefinedIfStringEmpty(
  value: string | undefined,
): string | undefined {
  if (value === '' || value === undefined) {
    return undefined
  } else {
    return value
  }
}
