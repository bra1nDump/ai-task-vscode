# Birds - bread and code loving government robots

- Have LLMs make multi-file edits that don't suck
  - Fast: Applies patches instead of regenerating entire contents
  - Automatic: Detects ranges in the file that should be updated
- Instructions in-line instead of switching to a sidebar chat or entering in a popup
- Directory specific context files like `components/team-patterns.birds.md`
- What you see is what you get. Everything is in the file system making it easy to share and version control

# Demo:

[![Demo showing multi-file edit + bulk compile error fixing](https://img.youtube.com/vi/43tYTqNbBQeIfisT/0.jpg)](https://youtu.be/7FhcKhhFT4M?si=Gkn8U6sCc9KE1sWE)

# Coming Soon

- Stream the changes as they come in so you can see the changes as they happen
- Automatically follow compile errors and fix them
- Creating a language server for auto complete in bread comments and files
- Create context providers like @url some-project.com to provide context to the birds
- Create tools, for example /tsc that llm can choose to run to gather more context or accomplish side effects
- Using VSCode Notebook as the chat interface

# Why birds?

We all know that birds are government robots. And since clearly military is 'always' the best at everything, we have decided to use birds to help us with our code. I would argue the government did make one mistake when programming birds - they made them love breadcrumbs.

Sprinkle some @bread crumbs around your code base to get the birds attention. Birds will then start to work on your code. They will make changes to your code and leave comments on the changes they made. You can then decide if you want to keep the changes or not.

# Using the extension

## High level:

- Leave comments with instructions mentioning `@bread` to include those files for potential edits
- Instructions in `<directory>/*.birds.md` are included when files in the subdirectory is `@bread`ed
- Is a side effect of the rule above, `workspace/*.birds.md` is included with every request

## Try it out:

- Add a comment with instructions on how you want to modify the code, mention `@bread` to get the birds attention
- Example comment: `// @bread add a parameter to this function and fix functions using it`
- **Hit enter two times** after the comment or you can use the command birds.chaseBread to invite the birds to munch on your code
- Multi file editing is supported out of the box, just make sure you leave `@bread` somewhere in the files you want to edit

# Development

> :warning: **License restricting commercial distribution**: This project currently uses Business Source License 1.1. I currently don't know where I want to take this project, so I'm using this license for the time being to protect myself from someone else taking it and making money off of it. If you want to use this project for commercial purposes, please contact me by email in my profile.

## Running

```sh
npm install
```

As this is a VSCode extension, you need to run it from within VSCode.

Open the project in VSCode and open debug view (Ctrl+Shift+D).

To run the extension: Then select `Extension` and press `F5` or hit play.
To run tests: Then select `Tests` and press `F5` or hit play.

**NOTE** Sometimes currently the watch tasks seemed to fail, but I'm pretty sure I'm just overriding the out folder ..., anyways it sometimes causes the tests to not be found in out folder

## Linting

Using ESLint
And prettier as an ESLint plugin https://github.com/prettier/eslint-plugin-prettier

# Publishing

Exntension https://marketplace.visualstudio.com/items?itemName=bra1ndump.birds

Publisher url https://marketplace.visualstudio.com/manage/publishers/bra1ndump Run vsce publish from the project root. It will ask for authentication token which you can get from azure here https://dev.azure.com/bra1ndump/_usersSettings/tokens. You can't access as the old one, just generate the new one (look at the scopes requested on the old one. Market Place > Manage).
Docs: https://code.visualstudio.com/api/working-with-extensions/publishing-extension

Had to place icon in the root of the project, downsized using free service: https://imresizer.com

## Ideas

See [docs](docs/) for idea documentation.
See [diff](src/diff/docs/) for ideas on how to create patches using llm.
