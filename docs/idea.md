# Features
- Making a local change and figuring out the places where the code gets broken and trying to iteratively fix them. For example adding a new parameter to a function should be trivial
- Planning out a larger change across the components of the codebase by leaving breakcrumbs in the codebase as comments / bookmarks (using bookmarks extension)
  - One time
  - Persistent - adding a new UI feature
    - Redux model
    - Initial value
    - Case reducer
- Making legal moves
  - Factoring out variables
  - Splitting up functions
  - Renamings
- Testing that the codebase compiles - we assume its a strict type system.
- I feel like if it compiles its good to go
- Maybe generate a plan first with type signatures and developer would approve it?
- Create copies of the repo and try different approaches and then try to compile

# Vscode + langchain github seach
All of these use a webview

## OpenPilot - similar to Continue, open source copilot
https://github.com/jallen-dev/openpilot
- Chroma, not sure how its used, probably within the webview
- Pointing out the same issue with diffs
  - Better diffs. GPT 3.5 is bad at following instructions about how to format diffs, at least with the prompts that have been tried so far. A different approach might be needed.
- Looking to support 3d party llms
- Uses react refresh
- Only a couple of days in public, intiial commit with more work

## SemanticIndex - probably not the best as the search was targeting different proejct type
https://github.com/dwbcampbell/semanticindex

## Capybara - Berkeley Mentor project
https://github.com/Codyhacks-AI/capybara
- 2 months last commit, dead, berkeley CS mentor
- Has a simple chat
- Has highlighting of bad sections and inline suggestions
- Single file
- Might be in stealth
  - In order to scale up, we are developing a Flask backend to enable Capybara to process larger codebases in an efficient manner. To save the context of an entire codebase, we will use Pinecone to track, store, and search for more accurate suggestions. With Pinecone, Capybara will continuously learn alongside our students, giving feedback that is refined and as helpful to beginners as it is to skilled developers. We're excited to ship our developments and bring them to our community!

## Quine idea
https://github.com/victorb/metamorph