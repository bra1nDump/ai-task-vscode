import { exec } from 'child_process'
import { $, execa } from 'execa'

import * as os from 'os'

function runShellCommand(
  command: string,
  callback: (output: string) => void,
): void {
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing command: ${error.message}`)
      return
    }
    if (stderr) {
      console.error(`Shell command stderr: ${stderr}`)
    }
    callback(stdout)
  })
}

function installPoetry(): void {
  const platform: NodeJS.Platform = process.platform

  switch (platform) {
    case 'win32': // Windows
      runShellCommand(
        '$env:POETRY_HOME="~/.birds/poetry"; (Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | py -',
        console.log,
      )
      break
    case 'darwin': // MacOS
    case 'linux': // Linux and other UNIX-like OSs
      runShellCommand(
        'curl -sSL https://install.python-poetry.org | POETRY_HOME=~/.birds/poetry python3 -',
        console.log,
      )
      break
    default:
      console.error(`Unsupported platform: ${platform}`)
      break
  }
}

async function ensurePoetryIsInstalled() {
  try {
    const poetryVersionResult =
      await $`${os.homedir()}/.birds/poetry/bin/poetry --version`

    if (poetryVersionResult.stdout.includes('Poetry')) {
      console.log('Poetry is installed')
      return
    } else {
      console.log('Poetry is not installed')
    }
  } catch (error) {
    console.log('Poetry is not installed')
  }

  // Lets try a simple one
  const poetryInstallationResult = await execa('curl', [
    '-sSL',
    'https://install.python-poetry.org',
  ]).pipeStdout?.(
    execa('python3', ['-'], {
      env: {
        POETRY_HOME: '~/.birds/poetry',
      },
    }),
  )

  // await $`curl -sSL https://install.python-poetry.org | POETRY_HOME=~/.birds/poetry python3 -`

  console.log(poetryInstallationResult)
}

export const pythonInstalledPath = `${os.homedir()}/.birds/poetry/venv/bin/python3`

/**
 * Assumes there is some version of python3 installed on the system.
 */
export async function bootstrapPythonServer(): Promise<void> {
  // Check if poetry is installed
  // Run command checking poetry version
  // runShellCommand('poetry --version', (output) => {
  //   if (output.includes('Poetry')) {
  //     console.log('Poetry is installed')
  //   } else {
  //     console.log('Poetry is not installed')
  //     installPoetry()
  //   }
  // })

  // Get path to python from pyinstaller ideally
  await ensurePoetryIsInstalled()
}
