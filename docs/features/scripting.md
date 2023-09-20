# Scripting / bread files

Bread files are simply a way to provide static context.
Scripts are actually commands that get invoked.
Scripts are made of other scripts and primitives
Primitives are implemented within the core of the extension

# Desired experience

- I can write my own scripts and they will be picked up by the extension and I can run them
- I can easily debug my scripts ideally with breakpoints
- Get autocomplete using typescript as well as strict typing

## Actual experience

- Start vscode with `code --inspect-extensions=9229`
- Add a launch configuration (assuming in the same code instance?)

```JSON
{
    "type": "node",
    "request": "attach",
    "name": "Attach to Extension Host to debug your bread script",
    "port": 9229,
    "outFiles": [
        "${workspaceFolder}/.bread/**/*.js"
    ],
},
```

- Write your scripts within the bread directory and set breakpoints

```js
/**
 * Assume you want to fix all the links in your markdown files.
 * This is not the best example, but I think it showcases the desired API quite well.
 *
 * I'm not sure how to make this pi to be able to sustain further fragmented when we make
 * the individual steps even more interruptible
 */
export async function run(userAndPrimitiveScripts) {
  /** Take a look at how lang chain approach this and see how it can be done better */
  const {
    filesWithPathMatching,
    filesWithContentMatching,
    filesWithBread,
    batch,
    multiFileEdit,
  } = userAndPrimitiveScripts

  // Get all markdown files
  const markdownFiles = await filesWithPathMatching('**/*.md')
  const markdownFilesWithLinks = markdownFiles.filter((file) =>
    file.content.includes(']('),
  )

  // There might be many files in your directory, so lets batch them up
  const applicationsResults = await Promise.allSettled(
    batch(markdownFilesWithLinks, 'automatically-based-on-token-count').map(
      (markdownFileBatch) =>
        // The multi file edit primitive can plan and perform edits to multiple files without given a target range
        multiFileEdit(
          markdownFileBatch,
          'pause-after-planning',
          `I have moved all my image assets into the asset folder within /docs/assets.
          Please fix all the links to images in these files using their path
          `,
        ),
    ),
  )
}
```

- More advanced users can set up typescript, or I can provide bootstrapping tool. They can extend users and primitive script by types
- They can also import the @types/ai-task package to get autocomplete and type safety for the system primitives

# Technical challenges

# Run scripts with interpreter within VSCode

- Can I make the script debugable then?
- I think there's a flag that you can pass to debug extensions. I have no idea what this flag is for VSCode, or how to give it the files where you can accept breakpoints in.

```sh
--inspect-extensions <port>     Allow debugging and profiling of extensions. Check the developer tools for the connection URI.
--inspect-brk-extensions <port> Allow debugging and profiling of extensions with the extension host being paused after start. Check the developer
                                tools for the connection URI.
```

This will mean having to start scode with the command line argument which not all developers would like

# Debugging an Extension's Main Process

- Since VSCode will simply pick up the javascript (or typescript) script files and actually run them, you can set breakpoints in them and they will be hit (theoretically)

  - Possibly out files need to be modified in this attachment launch configuration
  - Might not even work
  - Giving the fork approach, maybe I can make the forked process within the extension debugable?
  - If I go the forking round, how do I expose the primitives to the script? I'm assuming when I fork it it will start a completely separate node process

- Actually the forking approach kind of sucks because I would need to setup communication between the the fork process and the extension environment that has the primitives implemented. Alternatively I can also package the primitives npm package and install it in the forked process, but that's a lot of work.

[Selected] - Similar to moca require files and users directory exposing top level run function that takes in the primitives as parameters they can use

- I definitely know you can eval and still debugged because that's how Mocha does it
- Seems like moca just uses a require to get the file and has global suit and test functions that are available when your script top level statements are executed
- Chatgpt claims you can require a dynamic path from within the extension, I'm skeptical that this would work because I thought extensions are sandboxed by default, it would be strange if it could just run any script at once on my machine. I would expect visual studio code has its own required implementation that does not allow the extension to resolve things outside of its own directory.
- Chatgpt response: Visual Studio Code extensions do run in a separate extension host process, but they are not fully sandboxed in the sense that they can still access the file system and other Node.js APIs (unless they are web extensions, which are more limited). This means that an extension can require a module from an arbitrary file path, subject to the usual Node.js module resolution rules.

However, you're correct that this is a potential security concern. An extension that requires a script from an arbitrary file path could potentially run malicious code. This is one reason why it's important to only install extensions from trusted sources.

## Bonus potentially?

- Assuming you have packaged original typescript code for the extension within the distribution, javascript and source maps
- You can now open the source files buried somewhere in your user directory for visual studio were it stores extensions and set breakpoints

## Gpt conversation logs

### Inspecting extension process itself

How do people actually use them? Let's say if the extension reads a javascript file from disk and runs it would I be able to set a breakpoint in it and it would be hit? How do I expose the port from the extension side?
Debugging an Extension's Main Process
These options are used for debugging the extension's main process, not the scripts that the extension runs or interacts with.

For your scenario, where the extension reads a JavaScript file from disk and runs it, you would need to use a debugger that can interact with the JavaScript runtime that's executing the script. This might be the built-in JavaScript debugger in Visual Studio Code, or it could be a different tool depending on the context.

The --inspect-extensions and --inspect-brk-extensions options don't expose a port from the extension side. Instead, they tell Visual Studio Code to start the extension host (the process that runs extensions) in debug mode, listening on the specified port. You can then attach a debugger to that port to debug the extension's main process.

Here's a typical workflow:

Start Visual Studio Code with one of the inspect options, like this: code --inspect-extensions=9229.

In Visual Studio Code, go to the Run view (View > Run or click the run icon in the Activity Bar).

Click "create a launch.json file" and select "Node.js" as the environment.

In the launch.json file that's created, add a configuration like this:

{
"type": "node",
"request": "attach",
"name": "Attach to Extension Host",
"port": 9229
}
Start debugging with the "Attach to Extension Host" configuration.

Now you can set breakpoints in your extension's code, and they will be hit when the code is executed.

Remember, this is for debugging the extension's main process. If you need to debug a script that your extension is running (like the JavaScript file in your example), you would typically use a different debugging tool or configuration that's appropriate for that script's runtime.

### Using fork to launch the custom user script with debugging

How can I set a breakpoint in the file being evaluated? Can eval take files in with source maps, or maybe some other similar operator can do this?.

Debugging JavaScript code evaluated using `eval`
Setting a breakpoint in a file being evaluated using eval is not straightforward because eval executes a string of code at runtime and does not have a physical file associated with it that the debugger can reference.

However, JavaScript has a feature called Source Maps that can help debuggers correlate code running in the browser to its original source code. But, this is mainly used in the context of transpiled code (like TypeScript to JavaScript) and minified code, not for code evaluated via eval.

If you want to debug a JavaScript file that is being read from disk and run, a better approach might be to use the child_process module's fork method to run the script in a new Node.js process, and then use the --inspect-brk flag to start the process in debug mode. This would allow you to set breakpoints in the file being run.

Here's a simple example:

````js
const { fork } = require('child_process');

// The path to the script you want to run
const scriptPath = 'path/to/your/script.js';

// Fork a new Node.js process and run the script in debug mode
const child = fork(scriptPath, {
    execArgv: ['--inspect-brk=9229']
});

child.on('message', (message) => {
    console.log('Message from child', message);
});```
````

# Run scripts with interpreter outside of VSCode, interface with the extension by extension having a server

- Requires to have a javascript setup on the consumer side
- Requires more code on extension developer side
- Does not allow to debug the extension code itself, in case you want to better understand how your scripts interact with it, order is simply a bug and the extension
