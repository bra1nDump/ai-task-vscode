import * as vscode from 'vscode'

export function getBreadIdentifier(): string {
  const breadIdentifierFromWorkspace = vscode.workspace
    .getConfiguration('birds')
    .get('at-bread-mention')

  /* We are using the environment override for simplified manual and automated
     testingbecause As we might be opening single files instead off full
     workspace with settings.json. */
  const atBreadIdentifierOverride: any =
    process.env.AT_BREAD_IDENTIFIER_OVERRIDE ?? breadIdentifierFromWorkspace

  const safeAtBreadIdentifierOverride =
    typeof atBreadIdentifierOverride === 'string'
      ? atBreadIdentifierOverride
      : '@bread'

  return safeAtBreadIdentifierOverride
}
