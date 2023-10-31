By the end of the tutorial you will know how to:
- Automatically troubleshoot bugs in your project using GitHub research tool
- Ask questions about your code using a chat with gpt

# Bug troubleshooting

The code starts an Apollo graphQL server
It is intentionally broken.
You will run the project and obsb1erve how the extension helps you troubleshoot the bug.

## Steps
1. Hit `F5` to install dependencies and start the project.
2. Make a request to `http://localhost:4000/graphql` with the the following query (e.g. using Postman):

```graphql
query Query {
  region {
    id
    population
  }
}
```
3. Observe a bug and your console appear
4. Click on the solutions tab and expand the problem report created for this bug
5. ...