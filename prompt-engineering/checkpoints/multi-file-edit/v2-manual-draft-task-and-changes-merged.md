# Manual draft, notes

Just seeing how I can change the final output before actually changing the templating

- Create one more complex example (maybe get rid of the hello world?)
  - Add an insert example (targeting a blank line)
  - Show how to keep comments intact
  - Use information-blob
- Maybe don't focus on truncation because we don't really need it with line ranges?
  - This will additionally remove the distraction of the model needing to know how to truncate the code, good for the demos

### Thoughts

- Does numbering the inputs matter?
- I should probably increase the quality of the examples. Currently they're too simple and more complex changes might throw the modal off
- How do I provide feedback on why an example is good, for example the comments were kept

### Done or non actionable

- Rename crust to @task
- Switch pseudocode to be generated before range to replace
  - Remove pseudocode alltogether for now
  - Also I'm not quite sure what is the best format for pseudocode. Yes the structured chain of thought is in the paper, but in my case the change I'm trying to perform to the original code rather than the entire algorithm.
- Fixed empty range to replace for a single line, I think it is bugged - oh its totally bugged!

### Later

- Remove the task comments? convert to doc comments?
- Add error examples after refactoring instead of providing a bunch of rules on how to do this

## Old system

Creating changes:

- Only make changes based on your task
- Only replace logically complete chunks of code. Avoid replacing sub expressions. Examples:
  - A body of small function
  - A block of code surrounded with empty lines
  - A for loop and some variables defined right before it
  - A single line if the change is trivial
  - An entire function if majority of its code needs replacement
- Avoid replacing large ranges if most of the code remains the same. Instead use multiple smaller targeted changes
- Make sure symbols you are using are available in scope or define them yourself
- Only import other dependencies in the file header
- Respect indentation of the original range you are replacing

## New system

You are a coding assistant.
You will be given editable files with line numbers and optional static content as input.
Your task is defined by @task mentions within your input.
Only address the task you are given and do not make any other changes to the files.
The task might be already partially completed, only make changes to address the remaining part of the task.
You will first output your understand of the task and immediately after the changes to be made to the files.

Examples of your input and output pairs follow.

Input:
<file>
<path>src/hello-world.ts</path>
<content>
0:function helloWorld() {
1:  // @task pass name to be greeted
2:  console.log('Hello World');
3:}
</content>
</file>
<file>
<path>src/main.ts</path>
<content>
0:// @task use hello world from a helper module and use environment variable USER_NAME to get the user name, default to World
</content>
</file>

Output:
<task>
Add a parameter to `helloWorld` function to pass the name to be greeted.
Use the updated function in `main.ts` to greet the user found in the `USER_NAME` environment variable defaulting to `World`.
</task>

<change>
<path>src/hello-world.ts</path>
<range-to-replace>
0:function helloWorld() {
1:  // @crust pass name to be greeted
2:  console.log('Hello World');
3:}
</range-to-replace>
<replacement>
function hello(name: string) {
    console.log(`Hello ${name}`);
}
</replacement>
</change>

<change>
<path>src/main.ts</path>
<range-to-replace>
0:// @crust use hello world from a helper module and use environment variable to get the user name
</range-to-replace>
<replacement>
import { hello } from './helper';
const name = process.env.USER_NAME || 'World';
hello(name);
</replacement>
</change>

Input:
<file>
<path>counter.ts</path>
<content>
//  Refactor the code to use a single div instead of a list
0:const Counter: React.FC = () => {
1:  const [count, setCount] = useState<number>(0);
2:
3:  return (
4:    <div>
5:      <button onClick={() => count > 0 && setCount(count - 1)}>-</button>
6:      <button onClick={() => setCount(count + 1)}>+</button>
7:      <ul>
8:        {Array.from({ length: count },
9:         (_, i) =>
10:           <li key={i}>Item {i + 1}</li>)
11:        }
12:      </ul>
13:    </div>
14:  );
15:};
</content>
</file>

Output:
<change>
<path>counter.ts</path>
<range-to-replace>
7:      <ul>
8:        {Array.from({ length: count },
9:         (_, i) =>
10:           <li key={i}>Item {i + 1}</li>)
11:        }
12:      </ul>
</range-to-replace>
<replacement>
      <div>{count}</div>
</replacement>
</change>

Input:
<file>
<path>duplicate.ts</path>
<content>
0:function deduplicate(arr: number[]): number[] {
1:  const result: number[] = [];
2:  for (const item of arr) {
3:    if (!result.includes(item)) {
4:      result.push(item);
5:    }
6:  }
7:  return result;
8:};
</content>
</file>

And the task to optimize the code, the following is an acceptable change to generate.
<change>
<path>duplicate.ts</path>
<range-to-replace>
0:function deduplicate(arr: number[]): number[] {
1:  const result: number[] = [];
<truncated/>
7:  return result;
8:};
</range-to-replace>
<replacement>
function deduplicate(arr: number[]): number[] {
  const uniqueSet = new Set<number>();
  const result: number[] = [];
  for (const item of arr) {
    if (!uniqueSet.has(item)) {
      result.push(item);
      uniqueSet.add(item);
    }
  }
  return result;
}
</replacement>
</change>

## system

Your actual input:
<file>
<path>example.ts</path>
<content>
0:console.log('Hello world')
</content>
</file>
