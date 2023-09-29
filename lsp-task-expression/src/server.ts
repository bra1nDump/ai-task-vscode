/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 * ------------------------------------------------------------------------------------------
 */
import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
} from 'vscode-languageserver/node'

import { TextDocument } from 'vscode-languageserver-textdocument'

///////////// Copied over from lsp-sample, vscode-extension-samples/lsp-sample/server/src/server.ts //////////

/* Create a connection for the server, using Node's IPC as a transport.
   Also include all preview / proposed LSP features. */
const connection = createConnection(ProposedFeatures.all)

// Create a simple text document manager.
const documents = new TextDocuments<TextDocument>(TextDocument)

let hasConfigurationCapability = false
let hasWorkspaceFolderCapability = false
let hasDiagnosticRelatedInformationCapability = false

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities

  /* Does the client support the `workspace/configuration` request?
	   If not, we fall back using global settings. */
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  )
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  )
  hasDiagnosticRelatedInformationCapability =
    !!capabilities.textDocument?.publishDiagnostics?.relatedInformation

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
      },
    },
  }
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    }
  }
  return result
})

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    void connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined,
    )
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log('Workspace folder change event received.')
    })
  }
})

// The example settings
interface ExampleSettings {
  maxNumberOfProblems: number
}

/* The global settings, used when the `workspace/configuration` request is not
   supported by the client. Please note that this is not the case when using
   this server with the client provided in this example but could happen with
   other clients. */
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 }
let globalSettings: ExampleSettings = defaultSettings

// Cache the settings of all open documents
const documentSettings = new Map<string, Thenable<ExampleSettings>>()

connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear()
  } else {
    globalSettings =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (change?.settings?.languageServerExample as ExampleSettings) ??
      defaultSettings
  }

  // Revalidate all open text documents
  for (const document of documents.all()) {
    void validateTextDocument(document)
  }
})

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings)
  }
  let result = documentSettings.get(resource)
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'languageServerExample',
    })
    documentSettings.set(resource, result)
  }
  return result
}

// Only keep settings for open documents
documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri)
})

/* The content of a text document has changed. This event is emitted
   when the text document first opened or when its content has changed. */
documents.onDidChangeContent(async (change) => {
  await validateTextDocument(change.document)
})

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  // In this simple example we get the settings for every validate run.
  const settings = await getDocumentSettings(textDocument.uri)

  // The validator creates diagnostics for all uppercase words length 2 and more
  const text = textDocument.getText()
  const pattern = /\b[A-Z]{2,}\b/g
  let m: RegExpExecArray | null

  let problems = 0
  const diagnostics: Diagnostic[] = []
  while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
    problems++
    const diagnostic: Diagnostic = {
      severity: DiagnosticSeverity.Warning,
      range: {
        start: textDocument.positionAt(m.index),
        end: textDocument.positionAt(m.index + m[0].length),
      },
      message: `${m[0]} is all uppercase.`,
      source: 'ex',
    }
    if (hasDiagnosticRelatedInformationCapability) {
      diagnostic.relatedInformation = [
        {
          location: {
            uri: textDocument.uri,
            range: Object.assign({}, diagnostic.range),
          },
          message: 'Spelling matters',
        },
        {
          location: {
            uri: textDocument.uri,
            range: Object.assign({}, diagnostic.range),
          },
          message: 'Particularly for names',
        },
      ]
    }
    diagnostics.push(diagnostic)
  }

  // Send the computed diagnostics to VSCode.
  await connection.sendDiagnostics({ uri: textDocument.uri, diagnostics })
}

connection.onDidChangeWatchedFiles((_change) => {
  // Monitored files have change in VSCode
  connection.console.log('We received an file change event')
})

/* https://github.com/microsoft/vscode/blob/ba36ae4dcca57ba64a9b61e5f4eca88b6e0bc4db/extensions/typescript-language-features/src/languageFeatures/directiveCommentCompletions.ts#L20
   Directives might be different from completions, 
   This handler provides the initial list of the completion items. */
connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    /* WARNING FAILURE, @ prefixed keywords are not being suggested,
     * I have also realized there is a much easier way to provide completions
     * with completion providers. I NEVER NEEDED THE LANGUAGE SERVER GODDAMN
     * IT. Putting on a branch and forgetting about it
     */
    const keywords = ['@' + 'taskkkkkk', 'runningShoes', 'tabs', 'errors']

    return keywords.map((keyword, index) => ({
      label: `${keyword}`,
      kind: CompletionItemKind.Text,
      data: index + 1,
    }))
  },
)

/* This handler resolves additional information for the item selected in
   the completion list. */
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  if (item.data === 1) {
    item.detail = 'TypeScript details'
    item.documentation = 'TypeScript documentation'
  } else if (item.data === 2) {
    item.detail = 'JavaScript details'
    item.documentation = 'JavaScript documentation'
  }
  return item
})

/* Make the text document manager listen on the connection
   for open, change and close text document events */
documents.listen(connection)

// Listen on the connection
connection.listen()
