export interface FileContext {
  filePathRelativeToWorkspace: string
  content: string
}

export interface StaticBlobContext {
  blobName: string
  content: string
}

export function transformFileContextWithLineNumbers(
  fileContext: FileContext,
): FileContext {
  const snapshotContent = fileContext.content
    .split('\n')
    .map((line, index) => `${index}:${line}`)
    .join('\n')

  return {
    ...fileContext,
    content: snapshotContent,
  }
}

// this function changes the СRLF to LF, helps with adaptation to windows
export function replaceEndOfLineCRLFWithLF(fileContext: FileContext) {
  const snapshotContent = fileContext.content.replace(/\r\n/g, '\n')
  return {
    ...fileContext,
    content: snapshotContent,
  }
}
