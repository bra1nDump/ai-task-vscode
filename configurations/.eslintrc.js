/** 
 * https://eslint.org/docs/latest/use/configure/configuration-files
 * Unfortunately js files under configurations/ will not be linted. I was unable to find a work around
 * in a reasonable amount of time.
*/

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 6,
    sourceType: "module",
    project: "./tsconfig.json",
  },

  plugins: ["@typescript-eslint", "unused-imports", "prettier"],
  extends: [
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "plugin:prettier/recommended",
    // This is a plugin splitting up long comments into multiple lines
    "plugin:comment-length/recommended",
  ],
  rules: {
    // Add your custom rules here
    "@typescript-eslint/no-explicit-any": "off",
    "unused-imports/no-unused-imports": "warn",
    "@typescript-eslint/require-await": "off",

    // Currently annoying as we have a lot of bootstraping code, lets fix later
    "@typescript-eslint/no-unused-vars": "off",

    // Enforce consistent braces
    curly: ["error", "all"],

    // This is the native rule that enforces multiline comments to be wrapped in a block
    "multiline-comment-style": ["error", "starred-block"],
    // This is a plugin splitting up long comments into multiple lines
    "comment-length/limit-single-line-comments": [
      "warn",
      {
        mode: "overflow-only",
        maxLength: 80,
        logicalWrap: true,
        ignoreUrls: true,
        ignoreCommentsWithCode: true,
        tabSize: 2,
      },
    ],

    // https://github.com/prettier/eslint-plugin-prettier#options
    // I'm including options here just to avoid having to have a separate .prettierrc.js file
    "prettier/prettier": [
      "error",
      {
        trailingComma: "all",
        semi: false,
        singleQuote: true,
        plugins: [],
        importOrder: [],
        importOrderSeparation: true,
        importOrderSortSpecifiers: true,
        endOfLine: 'lf',
      },
    ],
  },

  ignorePatterns: [
    "out",
    "dist",
    "**/*.d.ts",
    "**/*.js",
    "**/*.mjs",
    "testing-sandbox",
  ],
};
