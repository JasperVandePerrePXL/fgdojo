// ESLint configuration (flat config). Run with `npm run lint`; `npm run lint:fix` fixes what it can.
// Formatting is left to Prettier (`npm run format`), so stylistic rules are turned off at the end.
import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/** Node.js built-ins: not allowed in code that must stay pure or run in the browser. */
const NODE_BUILTINS = [
  'node:*',
  'fs',
  'fs/*',
  'path',
  'os',
  'crypto',
  'child_process',
  'http',
  'https',
  'url',
];

export default [
  { ignores: ['dist/', '.cache/', 'node_modules/', 'public/data/'] },

  js.configs.recommended,
  ...vue.configs['flat/recommended'],

  {
    rules: {
      'no-unused-vars': ['error', { ignoreRestSiblings: true, argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
    },
  },

  // Node.js code: data pipeline, scripts, tests and tool configuration.
  {
    files: ['src/**/*.js', 'tests/**/*.js', '*.config.js'],
    languageOptions: { globals: globals.node },
  },

  // Website code runs in the browser and may only share code with the pipeline through shared/.
  {
    files: ['app/**/*.{js,vue}'],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/src/**'],
              message: 'The website must not import pipeline code; move shared logic to shared/.',
            },
            { group: NODE_BUILTINS, message: 'Node.js modules are not available in the browser.' },
          ],
        },
      ],
    },
  },

  // Pure code: the statistics and the rules shared with the website have no file or network access.
  {
    files: ['src/stats/**/*.js', 'shared/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: NODE_BUILTINS, message: 'Keep this module pure: no file or network access.' }],
        },
      ],
      'no-restricted-globals': ['error', 'fetch', 'process'],
    },
  },

  prettier,
];
