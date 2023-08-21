```ts
// Version 1
const fileContexts = await Promise.all(
  allFilesInWorkspace.map(async (fileUri) => {
    const binaryFileContent = await vscode.workspace.fs.readFile(fileUri)
    const fileText = binaryFileContent.toString()

    const containsBreadMention = 
      fileText.includes('@bread')

    if (containsBreadMention) {
      return {
        filePathRelativeTooWorkspace: 
          vscode.workspace.asRelativePath(fileUri),
        content: fileText,
      }
    } else {
      return undefined
    }
  })
)

// Version 2 
const fileContexts = allFilesInWorkspace.map(async (fileUri) => {
  try {
    const fileContent = await vscode.workspace.fs.readFile(fileUri)
    if (fileContent.includes('@bread')) {
      return {
        path: vscode.workspace.asRelativePath(fileUri),
        content: fileContent
      }
    }
  } catch (error) {
    console.error(`Error reading ${fileUri}`, error)
  }
})

const filteredContexts = await Promise.all(fileContexts)
  .then(contexts => contexts.filter(c => c))

// Version 3
const fileContexts = []

for (const fileUri of allFilesInWorkspace) {
  const fileContent = await vscode.workspace.fs.readFile(fileUri)
  
  if (fileContent.includes('@bread')) {
    fileContexts.push({
      path: vscode.workspace.asRelativePath(fileUri),
      content: fileContent
    })
  }
}

```

