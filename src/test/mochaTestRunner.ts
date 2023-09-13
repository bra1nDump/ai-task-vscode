import { install } from 'source-map-support'

// This allows us to easier jump to the location in source when a test fails
void install()

import * as path from 'path'
import * as Mocha from 'mocha'
import * as glob from 'glob'
import * as tsconfigPaths from 'tsconfig-paths'

const projectRoot = path.resolve(__dirname, '../..')
const outSrc = path.resolve(projectRoot, 'out')
tsconfigPaths.register({
  baseUrl: outSrc,
  paths: {
    'src/*': ['src/*'],
  },
})

/*
  Nice to have: I would love to override the time out globally if a special environment variable is set set for all tests for easier debugging with breakpoints. 
  As a workaround I can remove the local time outs and set the global one to a high common value, and completely remove it when I want to debug.
*/
export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
  })

  const testsRoot = path.resolve(__dirname, '../..')
  console.log(`${testsRoot}`)

  return new Promise((resolve, reject) => {
    glob('out/**/*.test.js', { cwd: testsRoot }, (err, files) => {
      if (err) return reject(err)

      // Add files to the test suite
      console.log(`Found files:\n${files.join('\n')}`)
      files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)))

      try {
        // Run the mocha test
        mocha.run((failures) => {
          if (failures > 0) reject(new Error(`${failures} tests failed.`))
          else resolve()
        })
      } catch (err) {
        console.error(err)
        reject(err)
      }
    })
  })
}
