import * as path from 'path'

import { runTests } from '@vscode/test-electron'
import { config } from 'dotenv'

async function main() {
  try {
    /*
     * The folder containing the Extension Manifest package.json
     * Passed to `--extensionDevelopmentPath`
     */
    const extensionDevelopmentPath = path.resolve(__dirname, '../../')

    /*
     * The path to test runner
     * Passed to --extensionTestsPath
     */
    const extensionTestsPath = path.resolve(__dirname, 'mochaTestRunner')

    console.log('test runner path:', extensionTestsPath)
    console.log(__dirname)

    /*
     * Used for CI,
     * Duplicates setup in .vscode/launch.json > Tests:
     * "${workspaceFolder}/testing-sandbox",
     * "--disable-extensions", // Disables other extensions
     * "--extensionDevelopmentPath=${workspaceFolder}",
     * "--extensionTestsPath=${workspaceFolder}/out/test/mochaTestRunner.js"
     */

    // Load .env file - API keys and other secrets
    const env = config({
      path: path.resolve(process.cwd(), '.env'),
    }).parsed!

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionTestsEnv: env,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: ['testing-sandbox', '--disable-extensions'],
    })
  } catch (err) {
    console.error('Failed to run tests', err)
    process.exit(1)
  }
}

void main()
