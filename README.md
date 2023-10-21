<h1 align="center">Proactive AI Coding Assistant</h1>

<p align="center">
    <a href="https://discord.gg/v4WEH5uJ">
        <img alt="Discord" src="https://img.shields.io/discord/1149170085676728390?logo=discord&style=flat&logoColor=white"/>
    </a>
    <!-- https://shields.io/badges/visual-studio-marketplace-downloads -->
    <a href="https://marketplace.visualstudio.com/items?itemName=bra1ndump.ai-task">
        <img alt="VSCode" src="https://img.shields.io/visual-studio-marketplace/d/bra1ndump.ai-task?style=flat&logoColor=white&label=VSCode&logo=visualstudiocode"/>
    </a>
</p>

> Ever **lost hours** debugging what seemed like a **trivial problem**? Or felt the drag of **tedious code changes** that could easily be automated?

This VSCode extension uses AI to write code and proactively suggests fixes to errors.

## How it works
- Describe your intentions in a comment. Watch the tool automatically adjusts the code across multiple files.
- This extension automatically searches GitHub and the wider Internet to provide you with potential solutions to errors, exceptions, crashes, panics, and bugs that appear in your code. It runs in the background watching your development process.

![](documents/demo-videos/longer-demo/with-loading-bar.gif)

<p align="center">
    <br><a href="https://calendly.com/kirill-dubovitskiy/demo">Tell me about your coding pains in a 20 min call</a>
</p>

# How to edit files

- Add a comment with your task like this: `// @task split the function below into a helper and the main function, move helper to a new file`
- Click `Run @task` to start
- Cancel at any moment by clicking the `Cancel` button in the bottom right corner of VSCode
- To undo changes per file simply use `Cmd+z` on Mac and `Ctrl+z` on Windows
- To edit multiple files, make sure they are opened as tabs and include `@tabs` in your comment
- **New** Add a file `.task.md` extension to add custom instructions such as style guidelines
- **New** Include `@errors` to provide context for compile errors and fix them in bulk

# [Beta] How to search for errors

- The extension analyzes your application's stderr and stdout in real time to detect issues. Once an error or issue is found, it proactively searches for solutions or relevant GitHub issues to help you resolve it.
- You don't need to trigger the search manually. As you work, the extension operates quietly in the background, and will show you the results when it finds something relevant to your errors.

# How to install

[Install from VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=bra1ndump.ai-task)

# Roadmap

- Using VSCode Notebook as the chat interface
- Context providers like @url "docs.apple.com" or @semantic-search "function that adds line number to a file"
- Allow users to create custom javascript scripts to make whole code based transformations

[More complete list of upcoming features](documents/backlog.md)

# Development

## Why consider contributing?

- [Bets setting this project aside from competition](documents/bets.md)
- [Extension control flow overview](documents/development/architecture.md)
- In the case this becomes a company **your shares will be determined using LLM value scoring of your commit history, on the same terms as anyone elses who contributed**. The algorithm is not set in stone **this is a pinky promise** (known to be more reliable than any other contract) to implement it at some point. [Equity splitting](documents/equity.md)
  - Reach out if you are interested in contributing and want to get a more concrete idea of how this will work. There will likely be a pool dedicated for all contributors, something around 20% of the total equity.

> :warning: **License restricting commercial distribution**: This project currently uses Business Source License 1.1. I currently don't know where I want to take this project, so I'm using this license for the time being to protect it from people/companies freely taking code from it and making money off of it. If you want to use this project for commercial purposes, please contact me by email in my github profile or though discord. I can give you a commercial license for free, or licence a piece of code you are interested in specifically. I'm open to other suggestions as well.

## Running

```sh
npm install
```

- Open the project in VSCode and open debug view (Ctrl+Shift+D).
- To run the extension: Then select `Sandbox` and press `F5` or hit play.
- To run tests: Then select `Tests` and press `F5` or hit play. If you only want to run a single test suite, within the test suite files use mocha `suite.only` or `test.only`


