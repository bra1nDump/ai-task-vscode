import jsonfile from 'jsonfile'
import { execSync } from 'child_process'
import { argv } from 'process'

const packageFilePath = './package.json'

/**
 * This script will override the extension locally.
 * Pass code or code-insiders as the first argument to override the extension in VS Code or VS Code Insiders.
 */
async function main() {
  try {
    const vscodeBinary = argv[2]

    // Check if in PATH
    try {
      execSync(`${vscodeBinary} --version`, { stdio: 'inherit' })
    } catch (err) {
      console.error(
        `Could not find ${vscodeBinary} in PATH, please install it (Shift+Cmd+P) -> "Shell Command: Install 'code' (or code-insiders) command in PATH"`,
      )
      process.exit(1)
    }

    // Read the existing package.json
    let packageObj = await jsonfile.readFile(packageFilePath)

    // Write the updated package.json
    await jsonfile.writeFile(packageFilePath, packageObj, { spaces: 2 })

    // Run the packaging command
    execSync(
      'pnpm run bundle:prod && ./node_modules/.bin/vsce package --no-dependencies --allow-star-activation',
      { stdio: 'inherit' },
    )

    const extensionId = packageObj.publisher + '.' + packageObj.name
    const vsixFileName = packageObj.name + '-' + packageObj.version + '.vsix'

    try {
      // Uninstall the extension (it does not override if the version is the same)
      execSync(`${vscodeBinary} --uninstall-extension ${extensionId}`, {
        stdio: 'ignore',
      })
    } catch (err) {
      console.log('Extension not installed, continuing...')
    }

    // Install the extension in VS Code Insiders
    execSync(`${vscodeBinary} --install-extension ${vsixFileName}`, {
      stdio: 'inherit',
    })
  } catch (err) {
    console.error(err)
  }
}

main()