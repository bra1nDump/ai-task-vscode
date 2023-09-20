Let's record with what I have.
Let's record a single video to not worry about starting stopping recordings. I will cut this later.

# Individual improvement ideas

- Add Pagination
- Create a helper type Repository, and have the code search return a list of repositorieiss
- Move type and search into a separate file
- Parametrized code search with a query, update usage to keep the old query
- Add caching, disabling it with a environment variable
- Add unit tests to find repository is with "Show Me" somewhere in the code, update package dot JSON and launch configuration to disable cashing for tests
- Create a new function that will take in a list of repositories and filter them using some threshold star count, and also sorting by star count. Create a new type with more details for repository for those function
- Modified the function too include top ten contributors for each repository, create a contributor type
- Print the resulting detailed repositories in a table in markdown form

# What worked well - re-record

- Moving and parametrizing the searchCode funciton
- Renaming of the variable across 2 files (2 file change, simple)

## What can be attempted

- Caching
- Creating tests + editing configurations to skipp caching when running tests

- Chaning a data type and fixing compile errors automatically

- Referencing project wide context

# Ideas for iteration to of the video

- Remove content and just keep line numbers as ranges (speed)
- Create a file if it's not there yet (cool looking)
