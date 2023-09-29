/* eslint-disable @typescript-eslint/no-var-requires */
//@ts-check

'use strict'

const path = require('path')
const fs = require('fs')

// Assumes the script is executed from the root of the project
const projectRoot = process.cwd()

/* Generate the alias object for all the folders in the 'src' folder to use
   absolute import paths */
const srcDir = path.resolve(projectRoot, 'src')

/* Read the directories in the 'src' folder
   To allow absolute imports from all the folders in 'src'
   For example instead of using 'src/extension' we can use 'extension' */
const dirs = fs
  .readdirSync(srcDir, { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => dirent.name)

/* Augment with the 'src' folder itself for files like
   'src/execution-context.ts'?. Ignoring this problem for now and disallowing
   top level files */

// Generate the alias object
const aliasForAllSrcFolders = dirs.reduce((acc, dir) => {
  acc[dir] = path.resolve(srcDir, dir)
  return acc
}, {})

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node', // VS Code extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
  mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  entry: {
    extension: './src/extension.ts',
    server: './lsp-task-expression/src/server.ts',
  },
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(projectRoot, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    clean: true, // clean the output folder before building
  },
  externals: {
    vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    // modules added here also need to be added in the .vscodeignore file
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js'],

    alias: aliasForAllSrcFolders,
  },
  module: {
    rules: [
      {
        test: /src\/.*\.ts$/,
        exclude: [/node_modules/, /lsp-task-expression/],
        use: [
          {
            loader: 'ts-loader',
          },
        ],
      },
      {
        test: /lsp-task-expression\/.*\.ts$/,
        include: path.resolve(projectRoot, 'lsp-task-expression/src'),
        exclude: path.resolve(projectRoot, 'lsp-task-expression/node_modules'),
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(
                projectRoot,
                'lsp-task-expression/tsconfig.json',
              ),
            },
          },
        ],
      },
    ],
  },
  devtool: 'inline-source-map',
  infrastructureLogging: {
    level: 'log', // enables logging required for problem matchers
  },
}
module.exports = [extensionConfig]
