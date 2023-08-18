module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'unused-imports'],
  extends: [
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  rules: {
    // Add your custom rules here
    '@typescript-eslint/no-explicit-any': 'off',
    'unused-imports/no-unused-imports': 'warn',

    // Currently annoying as we have a lot of bootstraping code, lets fix later
    '@typescript-eslint/no-unused-vars': 'off',
  },

  ignorePatterns: ['out', 'dist', '**/*.d.ts'],
}
