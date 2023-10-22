import * as vscode from 'vscode'

/**
 * Read all documents opened as tabs in vscode.
 * Useful when the setting suggests to include all open files in the workspace
 * on performing tasks
 *
 * Bug: does not respect ignored files, hack - ignore markdown files.
 * Proper fix - we want to have a registry of files in the project we consider
 * to be included in context. Currently we do a safeWorkspaceSearch for that
 * but we don't want to do it every time.
 *
 * Intermediate solution: store the uris of 'good' files in the session context.
 */
export function openedTabs(): vscode.Uri[] {
  const tabs = vscode.window.tabGroups.all.flatMap((tabGroup) => tabGroup.tabs)
  return tabsToUris(tabs)
}

function tabsToUris(tabs: readonly vscode.Tab[]): vscode.Uri[] {
  return tabs.flatMap((tab) => {
    if (
      tab.input instanceof vscode.TabInputText &&
      tab.input.uri.scheme === 'file' &&
      !tab.input.uri.path.includes('.task/sessions')
    ) {
      return [tab.input.uri]
    } else {
      return []
    }
  })
}

export function findTabsMatching(path: string): vscode.Uri[] {
  const tabs = vscode.window.tabGroups.all.flatMap((tabGroup) => tabGroup.tabs)
  return tabsToUris(tabs).filter((uri) => uri.path.includes(path))
}
