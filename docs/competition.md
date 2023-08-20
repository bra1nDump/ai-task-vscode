# Auto GPT like
Most of these tools lack the ability to be good enouth to not look at the code. Thus I like staying within vscode better.
https://github.com/AutoPackAI/beebot


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