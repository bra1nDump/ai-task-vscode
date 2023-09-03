Flow looks like this:

- LLM generates text in a stream, each item in the stream is the full slowly updated text response from the LLM
- The stream gets continuously parsed by patch version specific implementation
- Target range resolution: for each change we tried to find where in the file we would apply it and which file we would apply it to. This is also patch version specific. This is also operating on the stream, so in the future we can support partial applications.
- Apply the final changes: Once the stream ends, we slowly open the files that we want to change one by one and apply changes to them with sometime out for the user to see