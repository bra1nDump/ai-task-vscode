module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    project: './tsconfig.json', // Path to your tsconfig.json
  },

  plugins: ['@typescript-eslint', 'unused-imports', 'prettier'],
  extends: [
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'plugin:prettier/recommended',
  ],
  rules: {
    // Add your custom rules here
    '@typescript-eslint/no-explicit-any': 'off',
    'unused-imports/no-unused-imports': 'warn',

    // Currently annoying as we have a lot of bootstraping code, lets fix later
    '@typescript-eslint/no-unused-vars': 'off',

    // Allow single line if statemtns without curly
    curly: ['error', 'multi'],
  },

  ignorePatterns: [
    'out',
    'dist',
    '**/*.d.ts',
    '**/*.js',
    '**/*.mjs',
    'testing-sandbox',
  ],
}
