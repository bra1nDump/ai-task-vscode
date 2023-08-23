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

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
  })

  const testsRoot = path.resolve(__dirname, '../..')

  return new Promise((c, e) => {
    const testGlob = process.env.TEST_SUITE_GLOB ?? '**/**.test.js'
    glob(testGlob, { cwd: testsRoot }, (err, files) => {
      if (err) return e(err)

      // Add files to the test suite
      files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)))

      try {
        // Run the mocha test
        mocha.run((failures) => {
          if (failures > 0) e(new Error(`${failures} tests failed.`))
          else c()
        })
      } catch (err) {
        console.error(err)
        e(err)
      }
    })
  })
}
