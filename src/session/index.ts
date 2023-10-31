import { SessionContextManager } from 'context/manager'
import { ExtensionStateAPI } from 'helpers/extensionState'
import { queueAnAppendToDocument } from 'helpers/fileSystem'
import { getUserOverrideOpenAiKey, heliconeKey } from 'helpers/keyManager'
import * as vscode from 'vscode'

export interface SessionConfiguration {
  taskIdentifier: string
  includeLineNumbers: boolean
  enableNewFilesAndShellCommands: boolean
}

export type LlmCredentials =
  | {
      type: 'openai'
      key: string
    }
  | {
      type: 'helicone'
      key: string
    }

// Thoughts: is this more like a single llm call context?
export interface SessionContext {
  id: string
  userId: string

  llmCredentials: LlmCredentials

  /**
   * Necessary for access to secrets to store API key the user enters
   */
  extensionContext: vscode.ExtensionContext
  configuration: SessionConfiguration

  /// Used to log what exactly was submitted to the LLM
  lowLevelLogger: (text: string) => Promise<void>

  /**
   * Used to log high level feedback to the user,
   * currently writes to sell output in the notebook
   */
  highLevelLogger: (text: string) => Promise<void>

  contextManager: SessionContextManager

  /**
   * This is the document where raw LLM request is logged. This is mostly for
   * development.
   */
  markdownLowLevelFeedbackDocument: vscode.TextDocument
  notebookCellExecutionThatStartedThisSession: vscode.NotebookCellExecution

  /*
   * Refactor: We should merge the two event emitters into one with a union
   * type of different session end reasons
   */

  /**
   * When the user closes the editor with high level feedback this is our
   * signal to abort the session. Once LLM is running this will be set to a
   * function that will abort it.
   *
   * In the future we will have additional controls, such a suspending,
   * aborting subtasks, etc.
   */
  sessionAbortedEventEmitter: vscode.EventEmitter<void>

  /**
   * Will fire when the session has ended, if the session was aborted is
   * expected to be called after it. If it is not called, that means the
   * command most likely has a bug related to aborting. Will be disposed right
   * after.
   */
  sessionEndedEventEmitter: vscode.EventEmitter<void>
}

export async function startSession(
  context: vscode.ExtensionContext,
  execution: vscode.NotebookCellExecution,
  extensionStateAPI: ExtensionStateAPI,
): Promise<SessionContext> {
  /*
   * There's a hard assumption across the code base that there's at least one
   * folder within the workspace. More like there's a single folder within the
   * workspace. Abort early and say the extension does not support opening
   * standalone files without a mounted workplace folder.
   */
  if (!vscode.workspace.workspaceFolders) {
    throw new Error(
      'ai-task needs at least one mounted workplace folder to work, apologies for this limitation',
    )
  }

  const { sessionMarkdownLowLevelFeedbackDocument } =
    await createSessionLogDocuments()

  const lowLevelLogger = (text: string) =>
    queueAnAppendToDocument(sessionMarkdownLowLevelFeedbackDocument, text)

  const pendingEdits = new Map<string, Promise<void>>()

  const currentCellOutputContentMap = new Map<string, string>()
  const cellEditQueue: Record<string, string[]> = {}

  async function queueAnAppendToExecutionOutput(
    execution: vscode.NotebookCellExecution,
    text: string,
  ) {
    if (execution.token.isCancellationRequested) {
      return
    }
    const cellId = execution.cell.document.uri.toString()

    if (!cellEditQueue[cellId]) {
      cellEditQueue[cellId] = []
    }

    cellEditQueue[cellId].push(text)

    const processQueue = async () => {
      while (cellEditQueue[cellId] && cellEditQueue[cellId].length > 0) {
        const currentText = cellEditQueue[cellId].shift()

        let currentCellOutput = currentCellOutputContentMap.get(cellId) ?? ''
        currentCellOutput += currentText
        currentCellOutputContentMap.set(cellId, currentCellOutput)
        if (execution.token.isCancellationRequested) {
          return
        }
        await execution.replaceOutput(
          new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.text(
              currentCellOutput,
              'text/markdown',
            ),
          ]),
        )
      }
    }

    if (!pendingEdits.has(cellId)) {
      if (execution.token.isCancellationRequested) {
        return
      }
      const editPromise = processQueue()
      pendingEdits.set(cellId, editPromise)
      if (execution.token.isCancellationRequested) {
        return
      }
      await editPromise
      pendingEdits.delete(cellId)
    }
  }

  const highLevelLogger = async (text: string) => {
    void queueAnAppendToExecutionOutput(execution, text)
  }

  /*
   * Create document manager that will help us backdate edits throughout this
   * sessiong
   */
  const documentManager = new SessionContextManager(true)

  // Create an event emitter to notify anyone interested in session aborts
  const sessionAbortedEventEmitter = new vscode.EventEmitter<void>()
  /*
   * Another emitter for when session ends no matter if it was aborted or it
   * has run its course
   */
  const sessionEndedEventEmitter = new vscode.EventEmitter<void>()

  void vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'ai-task extension is working ...',
      cancellable: true,
    },
    async (_progress, cancellationToken) => {
      // Cancelled from a button on the progress view
      cancellationToken.onCancellationRequested(() => {
        sessionAbortedEventEmitter.fire()
      })

      // Does not matter how but the session has ended. Remove the progress.
      await new Promise((resolve) => {
        sessionEndedEventEmitter.event(resolve)
      })
    },
  )

  const { userIdentifier } = await extensionStateAPI.getCurrentState()
  const llmCredentials = await getLlmCredentials(context)

  return {
    id: new Date().toISOString(),
    userId: userIdentifier,
    llmCredentials,
    extensionContext: context,
    configuration: {
      taskIdentifier: getBreadIdentifier(),
      includeLineNumbers: true,
      enableNewFilesAndShellCommands: true,
    },

    contextManager: documentManager,

    lowLevelLogger: lowLevelLogger,
    highLevelLogger: highLevelLogger,

    markdownLowLevelFeedbackDocument: sessionMarkdownLowLevelFeedbackDocument,
    notebookCellExecutionThatStartedThisSession: execution,

    sessionAbortedEventEmitter,
    sessionEndedEventEmitter,
  }
}

/** Persist session logs and cleanup */
export async function closeSession(
  sessionContext: SessionContext,
): Promise<void> {
  await sessionContext.markdownLowLevelFeedbackDocument.save()
  /*
   * Saving is important to prevent user from being prompted to save when they
   * try closing it
   */
  await sessionContext.notebookCellExecutionThatStartedThisSession.cell.notebook.save()

  void sessionContext.contextManager.dispose()

  // Dispose event emitters
  sessionContext.sessionAbortedEventEmitter.dispose()

  sessionContext.sessionEndedEventEmitter.fire()
  sessionContext.sessionEndedEventEmitter.dispose()
}

export async function findMostRecentSessionLogIndexPrefix(
  sessionsDirectory: vscode.Uri,
) {
  // Check if directory exists before reading
  const directoryExists = await vscode.workspace.fs
    .stat(sessionsDirectory)
    .then(
      () => true,
      () => false,
    )
  if (!directoryExists) {
    return 0
  }

  const sessionLogFiles =
    await vscode.workspace.fs.readDirectory(sessionsDirectory)
  const sessionLogIndexPrefixes = sessionLogFiles.flatMap(([fileName, _]) => {
    const maybeNumber = Number(fileName.split('-')[0])
    return isNaN(maybeNumber) ? [] : [maybeNumber]
  })
  const mostRecentSessionLogIndexPrefix = Math.max(
    ...sessionLogIndexPrefixes,
    0,
  )
  return mostRecentSessionLogIndexPrefix
}

async function createSessionLogDocuments() {
  const taskMagicIdentifier = getBreadIdentifier()

  const sessionsDirectory = vscode.Uri.joinPath(
    vscode.workspace.workspaceFolders![0].uri,
    `.${taskMagicIdentifier}/sessions`,
  )

  // No need to wait for this to finish
  void (async () => {
    const gitignorePath = vscode.Uri.joinPath(sessionsDirectory, '.gitignore')
    const gitignoreExists = await vscode.workspace.fs.stat(gitignorePath).then(
      () => true,
      () => false,
    )
    if (!gitignoreExists) {
      await vscode.workspace.fs.writeFile(gitignorePath, Buffer.from('*\n'))
    }
  })()

  const nextIndex =
    (await findMostRecentSessionLogIndexPrefix(sessionsDirectory)) + 1

  const shortWeekday = new Date().toLocaleString('en-US', {
    weekday: 'short',
  })
  const sessionNameBeforeAddingTopicSuffix = `${nextIndex}-${shortWeekday}`

  const sessionMarkdownLowLevelFeedbackDocument =
    await createAndOpenEmptyDocument(
      sessionsDirectory,
      `${sessionNameBeforeAddingTopicSuffix}.raw.md`,
    )

  return {
    sessionMarkdownLowLevelFeedbackDocument,
  }
}

export async function createAndOpenEmptyDocument(
  sessionsDirectory: vscode.Uri,
  name: string,
) {
  const highLevelFeedbackPath = vscode.Uri.joinPath(sessionsDirectory, name)
  await vscode.workspace.fs.writeFile(highLevelFeedbackPath, new Uint8Array())
  // VSCode is known to be slow to update the file system
  await new Promise((resolve) => setTimeout(resolve, 100))

  const sessionMarkdownHighLevelFeedbackDocument =
    await vscode.workspace.openTextDocument(highLevelFeedbackPath)
  return sessionMarkdownHighLevelFeedbackDocument
}

/*
 * Refactor: We probably want a helper function to get the entire configuration
 * for the session instead of just the bread
 */
export function getBreadIdentifier(): string {
  const breadIdentifierFromWorkspace = vscode.workspace
    .getConfiguration('ai-task')
    .get('taskMentionIdentifier')

  /*
   * We are using the environment override for simplified manual and automated
   * testingbecause As we might be opening single files instead off full
   * workspace with settings.json.
   */
  const atBreadIdentifierOverride: any =
    process.env.AT_BREAD_IDENTIFIER_OVERRIDE ?? breadIdentifierFromWorkspace

  const safeAtBreadIdentifierOverride =
    typeof atBreadIdentifierOverride === 'string'
      ? atBreadIdentifierOverride
      : '@' + 'task' // Avoiding the magic string by splitting into half

  return safeAtBreadIdentifierOverride
}

export async function getLlmCredentials(
  context: vscode.ExtensionContext,
): Promise<LlmCredentials> {
  const userOverrideOpenAiKey = await getUserOverrideOpenAiKey(context.secrets)
  if (userOverrideOpenAiKey) {
    return {
      type: 'openai',
      key: userOverrideOpenAiKey,
    }
  }

  return {
    type: 'helicone',
    key: heliconeKey,
  }
}
