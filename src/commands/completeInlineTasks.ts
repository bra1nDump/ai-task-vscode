import * as vscode from 'vscode'
import {
  findAndCollectBreadMentionedFiles,
  findAndCollectDotBreadFiles,
} from 'context/atTask'
import { getFilesContent } from 'helpers/fileSystem'
import { SessionContext, getBreadIdentifier } from 'session'
import { closeSession, startSession } from 'session'
import { startMultiFileEditing } from 'multi-file-edit/v1'
import { projectDiagnosticEntriesWithAffectedFileContext } from 'context/atErrors'
import dedent from 'dedent'
import { openedTabs } from 'context/atTabs'
import { newTaskNotebook } from './newTaskNotebook'
import { OpenAiMessage } from 'helpers/openai'
import { extractChatHistory } from '../notebook/taskController'
import { ExtensionStateAPI } from 'helpers/extensionState'

/*
 * This is a new entry point for the command,
 * the old one will now be used to start the task from the notebook execution
 * context This function will only create the notebook if its not already
 * available create a cell with @ task and execute the first cell all
 * subsequent executions will call the old entry point
 */
export async function newCompleteInlineTasksCommandFromVSCodeCommand(
  taskFromSiblingExtension?: string,
) {
  let notebook = vscode.window.visibleNotebookEditors.filter(
    (editor) => editor.notebook.notebookType === 'task-notebook',
  )[0]?.notebook

  if (notebook === undefined) {
    notebook = await newTaskNotebook()
  } else {
    /*
     * Hoping this will simply focus the notebook
     * TODO: Open in the same column as the current one, we are simply focusing
     * on it!
     * WORKAROUDN: Always open in the second column
     */
    await vscode.window.showNotebookDocument(notebook, {
      viewColumn: vscode.ViewColumn.Two,
    })

    // Old notebooks will need new cells to insert the task
    await vscode.commands.executeCommand('notebook.focusBottom')
    await vscode.commands.executeCommand('notebook.cell.insertCodeCellBelow')
  }

  if (notebook.cellCount === 0) {
    void vscode.window.showErrorMessage(
      `No cells in the notebook, most likely a bug`,
    )
    return
  }

  // Get the last cell in the notebook
  await new Promise((resolve) => setTimeout(resolve, 100))
  const lastCell = notebook.getCells().slice(-1)[0]

  /*
   * Set the cell's text to "@ task was provided in a comment in one of the
   * submitted files"
   */
  const cellDocumentEditorMaybe = await vscode.window.showTextDocument(
    lastCell.document,
  )

  if (taskFromSiblingExtension !== undefined) {
    await cellDocumentEditorMaybe.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), taskFromSiblingExtension)
    })
  } else {
    await cellDocumentEditorMaybe.edit((editBuilder) => {
      editBuilder.insert(
        new vscode.Position(0, 0),
        '@' + 'task was provided in a comment in one of the submitted files',
      )
    })
    // Don't execute if we are running from a sibling extension
    await vscode.commands.executeCommand('notebook.cell.execute')
  }
}

/**
 * This will now only get invoked from the notebook controller
 *
 * Generates and applies diffs to files in the workspace containing task
 * mention.
 *
 * Collect all files in workspace with task mention
 * Pack the files along with the diff generation prompts
 * Call openai api (through langchain)
 * Parse the diffs
 * Apply them to the current file in place
 */
export async function completeInlineTasksCommand(
  extensionContext: vscode.ExtensionContext,
  sessionRegistry: Map<string, SessionContext>,
  extensionStateAPI: ExtensionStateAPI,
  execution: vscode.NotebookCellExecution,
) {
  const chatHistory = extractChatHistory(execution)

  if (sessionRegistry.size !== 0) {
    throw new Error(
      `Existing session running, please report bug in our discord, to workaroudn reload the VSCode window (ctrl+shift+p -> reload window)`,
    )
  }

  const sessionContext = await startSession(
    extensionContext,
    execution,
    extensionStateAPI,
  )
  sessionRegistry.set(sessionContext.id, sessionContext)

  // If the user cancels the execution, we should cancel the session
  execution.token.onCancellationRequested(() => {
    sessionContext.sessionAbortedEventEmitter.fire()
  })

  try {
    await throwingCompleteInlineTasksCommand(sessionContext, chatHistory)
  } catch (error) {
    console.error(error)
    if (error instanceof Error) {
      await sessionContext.highLevelLogger(`\n\n> Error: ${error.message}`)
    }
  } finally {
    await closeSession(sessionContext)
    sessionRegistry.delete(sessionContext.id)
  }
}

async function throwingCompleteInlineTasksCommand(
  sessionContext: SessionContext,
  chatHistory: OpenAiMessage[],
) {
  ////// Compile the context, pull in task files and other context based on mentions //////
  const openTabsFileUris = openedTabs()

  /*
   * Only search for tasks in open tabs, we might want to keep the task
   * unaddressed for the time being, but don't want to errase it
   */
  const breadIdentifier = getBreadIdentifier()
  const fileUrisWithBreadMentions = await findAndCollectBreadMentionedFiles(
    breadIdentifier,
    openTabsFileUris,
  )

  /*
   * Add chat history to blobs
   * We should not add these to the blobs, instead we should use standard user
   * / assistant message array. Still need to think about how to approach this
   * for file editing tasks. Keep in mind when designing that we might want to
   * split multi-file editing into 2 step process - one that generates the
   * changes and the second one that actually applies them
   */
  const messageHistoryBlob: string = chatHistory.reduce(
    (acc, message): string => {
      return `${acc}
${message.role === 'user' ? '<user>' : '<assistant>'}
${message.content}
${message.role === 'user' ? '</user>' : '</assistant>'}`
    },
    `Here is the history of user requests and assistant responses. This might give more context to the task. This is for context only, you should focus on the last task only:`,
  )

  if (chatHistory.length) {
    sessionContext.contextManager.addBlobContexts([messageHistoryBlob])
  }

  /*
   * Always include active text editor as the questions are likely to be
   * related to it
   */
  if (vscode.window.visibleTextEditors.length) {
    await sessionContext.contextManager.addDocuments(
      'Visible text editor',
      vscode.window.visibleTextEditors
        .filter(
          (editor) =>
            /*
             * Don't return files with .task in them,
             * they are probably a notebook
             */
            !editor.document.uri.path.includes('.task') &&
            /*
             * Things like terminal and output in debug console also show up as
             * visible editors. Ignore them
             */
            editor.document.uri.scheme === 'file',
        )
        .map((editor) => editor.document.uri),
    )
  }

  const lastUserMessage = chatHistory.at(-1)?.content ?? ''

  /*
   * Its okay to not have any task mentions - for instance for other extension
   * adding to the context
   */
  if (
    fileUrisWithBreadMentions.length === 0 &&
    // The task is expected to come from inline (as a file comment)
    (lastUserMessage ===
      '@' + 'task was provided in a comment in one of the submitted files' ||
      lastUserMessage === '')
  ) {
    void vscode.window.showErrorMessage(
      `No tasks found. Remember to add 
@${breadIdentifier} mention to at least one file in the workspace.`,
    )
    await closeSession(sessionContext)
    return
  }

  await sessionContext.contextManager.addDocuments(
    'Files with bread mentions',
    fileUrisWithBreadMentions,
  )

  /* .task files */
  const dotBreadFileUris = await findAndCollectDotBreadFiles(breadIdentifier)
  const breadFileBlobs = await getFilesContent(dotBreadFileUris)
  sessionContext.contextManager.addBlobContexts(breadFileBlobs)

  /*
   * Before we have proper task expression parsing,
   * we will just search all task files for a mention of special
   * sub-expressions
   */
  const breadMentionsFilesContent = await getFilesContent(
    fileUrisWithBreadMentions,
  )

  /* Include open tabs if the user requested */
  const includeTabs = [
    ...breadMentionsFilesContent,
    ...breadFileBlobs,
    lastUserMessage,
  ].some((fileContent) => fileContent.includes('@' + 'tabs'))
  if (includeTabs) {
    await sessionContext.contextManager.addDocuments(
      'Open tabs',
      openTabsFileUris,
    )
  }

  /*
   * Provide problems context
   * Include files with errors if the user requested
   */
  const includeErrors = [
    ...breadMentionsFilesContent,
    ...breadFileBlobs,
    lastUserMessage,
  ].some((fileContent) => fileContent.includes('@' + 'errors'))
  if (includeErrors) {
    const diagnosticsAlongWithTheirFileContexts =
      projectDiagnosticEntriesWithAffectedFileContext()
    const filesWithErrors = diagnosticsAlongWithTheirFileContexts.map(
      (x) => x.uri,
    )
    await sessionContext.contextManager.addDocuments(
      'Files with errors',
      filesWithErrors,
    )

    /*
     * Provide optional problem context + prompt
     * Refactor: This should move to a static context provider
     */
    const problemContext = diagnosticsAlongWithTheirFileContexts
      .flatMap(({ uri, diagnostic }) => {
        if (diagnostic.severity !== vscode.DiagnosticSeverity.Error) {
          return []
        }
        const filePathRelativeToWorkspace = vscode.workspace.asRelativePath(uri)

        return [
          dedent(`
            File: ${filePathRelativeToWorkspace}
            Error message: ${diagnostic.message}
            Range:
            - Line start ${diagnostic.range.start.line}
            - Line end ${diagnostic.range.end.line}
            ${
              diagnostic.relatedInformation
                ?.map((info) => `Related info: ${info.message}`)
                .join('\n') ?? ''
            }
            `),
        ]
      })
      .join('\n')

    if (problemContext.length !== 0) {
      const compilationErrorContext = dedent(`
        Here's a list of compilation errors in some of the files:
        ${problemContext}

        - Most likely this is due to a refactor user has started but not finished
        - Based on @${breadIdentifier} mentions and the errors you should guess what was the refactor in the first place
        - Collect all relevant information about the refactor that might help you fix the errors

        Addressing errors:
        - Often the location of the error is not the place that you want to make changes to
        - Make sure you're not masking the compile error, but rather making necessary changes to the logic of the program
        `)

      sessionContext.contextManager.addBlobContexts([compilationErrorContext])
    }
  }

  console.log('fileManager', sessionContext.contextManager.dumpState())

  await startMultiFileEditing(sessionContext)
}
