import * as path from 'path'
import * as cp from 'child_process'

import {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
  runTests,
} from '@vscode/test-electron'
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

    // https://code.visualstudio.com/api/working-with-extensions/testing-extension#custom-setup-with-vscodetestelectron
    const vscodeExecutablePath = await downloadAndUnzipVSCode('1.83.1')
    const [cliPath, ...args] =
      resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath)

    // Use cp.spawn / cp.exec for custom setup
    cp.spawnSync(
      cliPath,
      [
        ...args,
        '--install-extension',
        'marxism.ai-error-search-assistant',
        '--force',
      ],
      {
        encoding: 'utf-8',
        stdio: 'inherit',
      },
    )

    console.log('installed error lookup extension')

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
      vscodeExecutablePath,
      extensionTestsEnv: env,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        'testing-sandbox',
        /*
         * WARNING: Don't disable extensions because this extension depends on error lookup extension!!
         * '--disable-extensions', // Disables other extensions, wont work once we add a dependency, trying to figure out if tests fail because of this
         */
      ],
    })
  } catch (err) {
    console.error('Failed to run tests', err)
    process.exit(1)
  }
}

void main()
