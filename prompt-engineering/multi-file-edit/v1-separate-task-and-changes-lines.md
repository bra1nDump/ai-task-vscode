## system

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

Examples:
Given these inputs:
<file>
<path>src/hello-world.ts</path>
<content>
0:function helloWorld() {
1:  // crust pass name to be greeted
2:  console.log('Hello World');
3:}
</content>
</file>
<file>
<path>src/main.ts</path>
<content>
0:// crust use hello world from a helper module and use environment variable to get the user name
</content>
</file>

Given a task: Make changes based on crust mentions.

Good output is:
<change>
<path>src/hello-world.ts</path>
<range-to-replace>
0:function helloWorld() {
1:  // crust pass name to be greeted
2:  console.log('Hello World');
</range-to-replace>
<description>
Context: function
Input: name: thing to be greeted of type string
Output: void
Algorithm:
Print out "Hello " followed by the name
</description>
<replacement>
function hello(name: string) {
    console.log(`Hello ${name}`);
}
</replacement>
</change>
<change>
<path>src/main.ts</path>
<range-to-replace>

</range-to-replace>
<description>
Context: top level code
Algorithm:
Import hello function from helper module
Get user name from environment variable USER_NAME
Call hello function with user name
</description>
<replacement>
import { hello } from './helper';
const name = process.env.USER_NAME || 'World';
hello(name);
</replacement>
</change>


Given this input:
<file>
<path>counter.ts</path>
<content>
0:const Counter: React.FC = () => {
1:  const [count, setCount] = useState<number>(0);
2:
3:  return (
4:    <div>
5:      <button onClick={() => count > 0 && setCount(count - 1)}>-</button>
6:      <button onClick={() => setCount(count + 1)}>+</button>
7:     <ul>
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

Given a task: Refactor the code to use a single div instead of a list

Good output is:
<change>
<path>counter.ts</path>
<range-to-replace>
7:     <ul>
8:        {Array.from({ length: count },
9:         (_, i) =>
10:           <li key={i}>Item {i + 1}</li>)
11:        }
12:      </ul>
</range-to-replace>
<description>
Context: jsx subexpression
Symbols in scope: count, setCount
Algorithm:
Show count value in a div
</description>
<replacement>
      <div>{count}</div>
</replacement>
</change>


Given this file:
<file>
<path>duplicate.ts</path>
<content>
function deduplicate(arr: number[]): number[] {
  const result: number[] = [];
  for (const item of arr) {
    if (!result.includes(item)) {
      result.push(item);
    }
  }
  return result;
}
</content>
</file>

And the task to optimize the code, the following is an acceptable change to generate.
<change>
<path>counter.ts</path>
<range-to-replace>
function deduplicate(arr: number[]): number[] {
  <truncated/>
  return result;
}
</range-to-replace>
<description>
Context: function
Input: arr: array of numbers
Output: array of numbers with duplicates removed
1: initialize a set to track unique numbers uniqueSet
2: initialize result array
3: for each item in arr
4:   if uniqueSet does not contain item
5:     add item to uniqueSet
6:     add item to result
7: return result
</description>
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

Given files:
<file>
<path>example.ts</path>
<content>
0:console.log('Hello world')
</content>
</file>

## user

Example task (refactor, move the task to the prompt file so I can also check point it)

## system

Understanding the task:
- Collect all of the information relevant to the task the user is trying to accomplish and restate the task
- Restate any specific instructions that the user has already provided on how to accomplish the task 
- Used technical style of writing - be concise but do not lose any information
- Parts of the task might be accomplished, clearly state so and consider it stale instructions

Task output format:
<task>
{{restating the task}}
</task>

## system

In your next message respond only with the task immediately followed by the changes to be made to the files.

