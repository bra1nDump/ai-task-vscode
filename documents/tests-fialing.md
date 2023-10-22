VSCode Extension Command Tests
       ai-task.completeInlineTasks command:

      AssertionError [ERR_ASSERTION]: "//  @task @errors Parametrize this function with a name and remove this comment line. Don't use semi-colons in the end of lines. \n" +
  'export function helloWorld() {\n' +
  '  console.log(`Hello World!`)\n' +
  '}\n' == 'export function helloWorld(name: string) {\n' +
  '  console.log(`Hello ${name}!`)\n' +
  '}\n'
      + expected - actual

      -//  @task @errors Parametrize this function with a name and remove this comment line. Don't use semi-colons in the end of lines. 
      -export function helloWorld() {
      -  console.log(`Hello World!`)
      +export function helloWorld(name: string) {
      +  console.log(`Hello ${name}!`)
       }
      
      at Context.<anonymous> (src/commands/completeInlineTasks.test.ts:97:12)

  2) Apply Patch Tests
       Apply a change with truncated target range:

      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
+ actual - expected

+ 'Hello World\nline2'
- 'line1\nHello World\nline4\nline5'
      + expected - actual

      +line1
       Hello World
      -line2
      +line4
      +line5
      
      at Context.<anonymous> (src/multi-file-edit/v1/apply.test.ts:99:12)

  3) Apply Patch Tests
       Change can be applied even with wrong spacing:

      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
+ actual - expected

+ 'Hello World\nline2\nline3\nline4\nline5'
- 'Hello World\nline2'
                     ^
      + expected - actual

       Hello World
      -line2
      -line3
      -line4
      -line5
      +line2
      
      at Context.<anonymous> (src/multi-file-edit/v1/apply.test.ts:123:12)

  4) Apply Patch Tests
       should correctly parse and apply a change:

      AssertionError [ERR_ASSERTION]: 'removing brace on first line\nHello World\nline3' == '// Parametrized function with a name\n' +
  'export function helloWorld(name: string) {\n' +
  "  console.log('Hello, ' + name);\n" +
  '}\n'
      + expected - actual

      -removing brace on first line
      -Hello World
      -line3
      +// Parametrized function with a name
      +export function helloWorld(name: string) {
      +  console.log('Hello, ' + name);
      +}
      