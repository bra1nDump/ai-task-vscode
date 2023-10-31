User flow

- User installs extension and the hardcoded current tutorial is more than the current tutorial version (start in the state)
- We open walkthrough
- In the walk through we have a button that will "Open tutorial project"
- This will trigger a commander that will open in a new window the tutorial project (included in the extension bundle)

- The extension will activate the tutorial project (in local environment it will reload the window, hopefully also activating the extension, something to test)
- Within activate detect that we are in a tutorial project, and open tutorial.md in the editor

Tutorial will consist of
- Starting the project (using f5), th assumes the user has npm installed
- In the beginning let's just use postman to hit the server
- Then we can include this test within the server start script

Tutorial steps can also be completed when something happens for example a certain command is executed and extension installed or a view shown.
I don't think we're going to need this but just in case leaving it here
https://code.visualstudio.com/api/references/contribution-points#contributes.walkthroughs


Example walk through step that I have removed due to not having an image and we also sent a notification when the user opens extensions for the first time or when we update the tutorial significantly.
```JSON
{
    "id": "tutorialProject",
    "title": "Try the new bug troubleshooting functionality on an example project",
    "description": "[Open tutorial project](command:ai-task.startTutorial) This will open a new VSCode window were we will guide you through fixing an example bug using the extension", 
},
```