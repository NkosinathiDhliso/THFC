module.exports = {
  env: {
    node: true,
    es6: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': 'off',
    'no-undef': 'off',
    'no-unused-expressions': 'off',
  },
  ignorePatterns: ['dist/', 'node_modules/', '.serverless/'],
};