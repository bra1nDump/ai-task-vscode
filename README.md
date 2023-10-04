# LLMs Multi-File Edits that don't suck

- **Automatic**: Detects ranges in the file that should be updated
- **Multi-file**: Can edit/create multiple files at once
- **Efficient**: Applies patches instead of regenerating entire file contents
- **Fix compile errors**: Fix trivial errors in bulk resulting from a refactor

![](documents/demo-videos/with-loading-bar.gif)

# How it works

- Add a comment with your task `// @task split the function below into a helper and the main function, move helper to a new file`
- Click `Run @task` to start
- If you want multiple existing files to be edited open them as tabs in VSCode and include `@tabs` in your comment
- Cancel at any moment by clicking the `Cancel` button in the bottom right corner of VSCode
- To undo changes per file simply use `Cmd+z` on Mac and `Ctrl+z` on Windows
- **New** Try adding `@errors` along with `@task` to fix all errors within the file in bulk

# How to try it

[Install from VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=bra1ndump.ai-task)

[Join the discord](https://discord.gg/D8V6Rc63wQ) to ask questions, give feedback or just lurk :D

# Roadmap

- Test on windows - looking for help!
- Context providers like @url "docs.apple.com" or @semantic-search "function that adds line number to a file"
- Allow users to create custom javascript scripts to make whole code based transformations
- Using VSCode Notebook as the chat interface

[More complete list of upcoming features](documents/backlog.md)

# Development

## Why consider contributing?

- [Bets setting this project aside from competition](documents/bets.md)
- [Extension control flow overview](documents/architecture.md)
- In the case this becomes a company **your shares will be determined using LLM value scoring of your commit history, on the same terms as anyone elses who contributed**. The algorithm is not set in stone **this is a pinky promise** (known to be more reliable than any other contract) to implement it at some point. [Equity splitting](documents/equity.md).

> :warning: **License restricting commercial distribution**: This project currently uses Business Source License 1.1. I currently don't know where I want to take this project, so I'm using this license for the time being to protect it from people/companies freely taking code from it and making money off of it. If you want to use this project for commercial purposes, please contact me by email in my github profile or though discord. I can give you a commercial license for free, or licence a piece of code you are interested in specifically. I'm open to other suggestions as well.

## Running

```sh
npm install
```

- Open the project in VSCode and open debug view (Ctrl+Shift+D).
- To run the extension: Then select `Sandbox` and press `F5` or hit play.
- To run tests: Then select `Tests` and press `F5` or hit play. If you only want to run a single test suite, within the test suite files use mocha `suite.only` or `test.only`


