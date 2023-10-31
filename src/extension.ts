import { newCompleteInlineTasksCommandFromVSCodeCommand } from 'commands/completeInlineTasks'
import { TaskExpressionCompletionItemProvider } from 'context/language-features/completionItemProvider'
import { TaskCodeLensProvider } from 'context/language-features/codeLensProvider'
import { TaskSemanticTokensProvider } from 'context/language-features/semanticTokensProvider'
import { SessionContext } from 'session'
import * as vscode from 'vscode'
import { TaskController } from 'notebook/taskController'
import { TaskSerializer } from 'notebook/taskSerializer'
import { newTaskNotebook } from 'commands/newTaskNotebook'
import { WebViewMessage, getWebView } from 'helpers/getWebView'
import { updateOpenAiKey } from 'commands/updateOpenAIKey'
import { openTutorialProject } from 'commands/openTutorialProject'
import { ExtensionStateAPI } from 'helpers/extensionState'

declare global {
  // eslint-disable-next-line no-var
  var isTutorialNotificationEnabled: boolean
}

export async function activate(context: vscode.ExtensionContext) {
  console.log('activating bread extension')

  //////////// Poor men's dependency injection
  const extensionStateAPI = new ExtensionStateAPI(context)
  const sessionRegistry = new Map<string, SessionContext>()

  //////////// Notebook support
  context.subscriptions.push(new TaskController(context, sessionRegistry))
  context.subscriptions.push(
    vscode.workspace.registerNotebookSerializer(
      'task-notebook',
      new TaskSerializer(),
      {
        transientOutputs: false,
        transientCellMetadata: {
          inputCollapsed: true,
          outputCollapsed: true,
        },
      },
    ),
  )

  //////////// Register commands
  context.subscriptions.unshift(
    vscode.commands.registerCommand('ai-task.newTaskNotebook', async () => {
      await newTaskNotebook()
    }),
    vscode.commands.registerCommand(
      'ai-task.completeInlineTasks',
      async (taskFromSiblingExtension?: unknown) => {
        if (
          taskFromSiblingExtension !== undefined &&
          (typeof taskFromSiblingExtension !== 'string' ||
            taskFromSiblingExtension.length === 0)
        ) {
          throw new Error(
            'ai-task was invoked programmatically with a task argument without a string value',
          )
        }
        await newCompleteInlineTasksCommandFromVSCodeCommand(
          taskFromSiblingExtension,
        )
      },
    ),
    vscode.commands.registerCommand('ai-task.setOpenAiKey', async () => {
      await updateOpenAiKey(context)
    }),
    vscode.commands.registerCommand('ai-task.startTutorial', async () => {
      const isProduction = false
      await openTutorialProject(context, isProduction)
    }),
  )

  //////////// Tutorial
  void (async () => {
    const { lastPromptedTutorialVersion } = extensionStateAPI.getCurrentState()
    const currentTutorialVersion = 1

    /*
     * If a new version of the tutorial is now available show a message to the
     * user.
     * Asynchronous because we wait for the user input.
     */
    // if (lastPromptedTutorialVersion < currentTutorialVersion) { NOCOMMIT
    if (global.isTutorialNotificationEnabled) {
      const shouldStartTutorial = await vscode.window.showInformationMessage(
        'AI Task had a major update, would you like to start the tutorial?',
        'Yes',
        'No',
      )

      if (shouldStartTutorial === 'Yes') {
        await vscode.commands.executeCommand('ai-task.startTutorial')
      }

      await extensionStateAPI.updateState(
        'lastPromptedTutorialVersion',
        currentTutorialVersion,
      )
    }
  })()

  /*
   * Detect if we're in tutorial project
   * (activate will be called once we open a new window with the tutorial
   * project)
   */
  const tutorialProjectPath = vscode.workspace.workspaceFolders?.find(
    (folder) => folder.name === 'apollo-server-bigint-issue-main',
  )
  if (tutorialProjectPath) {
    // Open read me, it has the tutorial walk through
    const readme = vscode.Uri.joinPath(tutorialProjectPath.uri, 'README.md')
    const readmeDocument = await vscode.workspace.openTextDocument(readme)
    await vscode.window.showTextDocument(readmeDocument)

    // Open run and debug panel
    await vscode.commands.executeCommand('workbench.view.debug')
  }

  //////////// Watch for run mentions, currently pretty hacky
  context.subscriptions.unshift(
    /*
     * Not sure how to register a command on enter,
     * markdown formatter extension I believe does have this key binding and it
     * inserts - if the previous line was a list item.
     *
     * Might be specificity issue, I haven't tried adding a when statement in
     * package.json
     */

    // Kickoff on @run mention
    vscode.workspace.onDidChangeTextDocument((event) => {
      const isRunMentionedRightBeforeRangeThatGotReplaced = (
        document: vscode.TextDocument,
        changeRange: vscode.Range,
      ) => {
        const line = changeRange.start.line
        const lineTextLeadingUpToSpaceOrEnter = document.getText(
          new vscode.Range(line, 0, line, changeRange.end.character),
        )
        return lineTextLeadingUpToSpaceOrEnter.endsWith('@run')
      }

      if (event.document.uri.path.endsWith('.task')) {
        return
      }

      if (
        event.contentChanges.length > 0 &&
        /*
         * only trigger on new line or space
         * I use starts with because some extensions might modify the text
         * before the edit, for example in typescript doc string it will add
         * another * to the new line
         */
        (event.contentChanges[0].text.startsWith('\n') ||
          event.contentChanges[0].text === ' ') &&
        // only trigger if @ run is
        isRunMentionedRightBeforeRangeThatGotReplaced(
          event.document,
          event.contentChanges[0].range,
        )
      ) {
        console.log('triggering command trough @ run mention')
        /*
         * Previously I was undoing the enter change,
         * but it introduces additional jitter to the user experience
         */
        void newCompleteInlineTasksCommandFromVSCodeCommand()
      }
    }),
  )

  //////////// Register our activity bar item
  vscode.window.registerWebviewViewProvider('taskView', {
    resolveWebviewView(webviewView) {
      webviewView.webview.html = getWebView()
      webviewView.webview.onDidReceiveMessage(
        (message: WebViewMessage) => {
          switch (message.command) {
            case 'createTaskNotebook':
              void newTaskNotebook()
              return
          }
        },
        undefined,
        context.subscriptions,
      )
      webviewView.webview.options = {
        enableScripts: true,
      }
    },
  })

  //////////// Register language features
  const allLanguages = await vscode.languages.getLanguages()
  const languageForFiles = allLanguages.map((language) => ({
    language,
    schema: 'file',
  }))

  /*
   * This needs to support other identifiers for tasks,
   * it seems like I should lift the configuration out of the session,
   * and make it a global configuration. Register task expression language
   * providers
   * The closest matching example I have found so far https://github.com/microsoft/vscode/blob/ba36ae4dcca57ba64a9b61e5f4eca88b6e0bc4db/extensions/typescript-language-features/src/languageFeatures/directiveCommentCompletions.ts
   */
  const sessionConfiguration = {
    taskIdentifier: 'task',
    enableNewFilesAndShellCommands: true,
    includeLineNumbers: true,
  }

  context.subscriptions.unshift(
    vscode.languages.registerCompletionItemProvider(
      languageForFiles,
      new TaskExpressionCompletionItemProvider(sessionConfiguration),
      '@',
    ),
    vscode.languages.registerCodeLensProvider(
      languageForFiles.filter(
        (language) => language.language !== 'task-notebook',
      ),
      new TaskCodeLensProvider(sessionConfiguration),
    ),
    vscode.languages.registerDocumentSemanticTokensProvider(
      languageForFiles,
      new TaskSemanticTokensProvider(sessionConfiguration),

      TaskSemanticTokensProvider.tokensLegend,
    ),
  )
}
