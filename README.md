# AI-Task VSCode Extension

## Have LLMs make multi-file edits that don't suck

Features

- Automatic: Detects ranges in the file that should be updated
- Multi-file: Can edit/create multiple files at once
- Fast: Applies patches instead of regenerating entire file contents
- Fix compile errors: Fix trivial errors in bulk resulting from a refactor

# How to use it

- Add a comment like `// @task split the function below into a helper and the main function, move helper to a new file`
- You can add multiple tasks across multiple files
- To execute on the task type `@run` followed by a space ` `

![](./demo.gif)
[A complete video is on YouTube](https://youtu.be/wD8ZdIJ9p0Y)

# Connect with the team

[Join the Discord to ask questions, or just lurk :D](https://discord.gg/D8V6Rc63wQ)

## Coming soon

- Creating a language server for auto complete in @task comments and files
- Support creating brand new files and running shell commands
- Context providers like @url "docs.apple.com" or @semantic-search "function that adds line number to a file"
- Create tools, for example /tsc that llm can choose to run to gather more context or accomplish side effects
- Using VSCode Notebook as the chat interface

[More complete list of upcoming features](./docs/backlog.md)

# Development

## Why consider contributing?

- [Bets setting this project aside from competition](./docs/bets.md)
- In the case this becomes a company **your shares will be determined using LLM value scoring of your commit history, on the same terms as anyone elses who contributed**. The algorithm is not set in stone, this is more of a promise to implement it at some point [equity splitting](./docs/equity.md).

> :warning: **License restricting commercial distribution**: This project currently uses Business Source License 1.1. I currently don't know where I want to take this project, so I'm using this license for the time being to protect it from people/companies freely taking code from it and making money off of it. If you want to use this project for commercial purposes, please contact me by email in my github profile or though discord. I can give you a commercial license for free, or licence a piece of code you are interested in specifically. I'm open to other suggestions as well.

## Running

```sh
npm install
```

- Open the project in VSCode and open debug view (Ctrl+Shift+D).
- To run the extension: Then select `Sandbox` and press `F5` or hit play.
- To run tests: Then select `Tests` and press `F5` or hit play. If you only want to run a single test suite, within the test suite files use mocha `suite.only` or `test.only`
