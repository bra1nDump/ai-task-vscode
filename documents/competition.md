# Continue Dev

# GitHub copilot

# Auto GPT like

Most of these tools lack the ability to be good enouth to not look at the code. Thus I like staying within vscode better.
<https://github.com/AutoPackAI/beebot>

# VSCode tools

## Cody - open source

<https://github.com/sourcegraph/cody>

- Similar interface simply provide comments and hit enter
- ![Good logo](cody-logo.png)
- Backed by sourcegraph, an actual company
- Roughly 6 months old
- Commits are growing, 3 core contributors, and counting ![cody contributors](cody-contributor-stats.png), used git-quick-stats to get stats
- uses more of your codebase's APIs, impls, and idioms, with less hallucination.

## .prompt files

<https://github.com/promptfile/promptfile>

- Language server support
- Looks deadish? 3 weeks ago last commit <https://github.com/promptfile/promptfile/graphs/contributors>
- Stylish docs - <https://promptfile.org/blocks#functions>

## OpenPilot - similar to Continue, open source copilot

<https://github.com/jallen-dev/openpilot>

- Chroma, not sure how its used, probably within the webview
- Pointing out the same issue with diffs
  - Better diffs. GPT 3.5 is bad at following instructions about how to format diffs, at least with the prompts that have been tried so far. A different approach might be needed.
- Looking to support 3d party llms
- Uses react refresh
- Only a couple of days in public, intiial commit with more work

## SemanticIndex - probably not the best as the search was targeting different proejct type

<https://github.com/dwbcampbell/semanticindex>

## Capybara - Berkeley Mentor project

<https://github.com/Codyhacks-AI/capybara>

- 2 months last commit, dead, berkeley CS mentor
- Has a simple chat
- Has highlighting of bad sections and inline suggestions
- Single file
- Might be in stealth
  - In order to scale up, we are developing a Flask backend to enable Capybara to process larger codebases in an efficient manner. To save the context of an entire codebase, we will use Pinecone to track, store, and search for more accurate suggestions. With Pinecone, Capybara will continuously learn alongside our students, giving feedback that is refined and as helpful to beginners as it is to skilled developers. We're excited to ship our developments and bring them to our community!

## Quine idea

<https://github.com/victorb/metamorph>
