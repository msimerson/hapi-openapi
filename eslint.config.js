'use strict';

const Js = require('@eslint/js');
const PrettierConfig = require('eslint-config-prettier');
const Globals = require('globals');

module.exports = [
  {
    ignores: ['public/**', 'node_modules/**']
  },
  Js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...Globals.node,
        ...Globals.es2021
      },
      sourceType: 'commonjs',
      ecmaVersion: 2022
    },
    rules: {
      ...PrettierConfig.rules,

      // overrides / disabled
      camelcase: 'off',
      'consistent-return': 'off',
      eqeqeq: 'off',
      'new-cap': 'off',
      'no-console': 'off',
      'no-empty': 'off',
      'no-lonely-if': 'off',
      'no-shadow': 'off',
      'no-underscore-dangle': 'off',
      'no-unused-expressions': 'off',
      'no-regex-spaces': 'off',
      strict: 'off',
      'vars-on-top': 'off',

      // errors
      'arrow-parens': ['error', 'always'],
      'arrow-spacing': ['error', { before: true, after: true }],
      'comma-dangle': ['error', 'never'],
      'consistent-this': ['error', 'self'],
      'constructor-super': 'error',
      curly: ['error', 'all'],
      'keyword-spacing': ['error', { before: true, after: true }],
      'no-array-constructor': 'error',
      'no-class-assign': 'error',
      'no-confusing-arrow': 'error',
      'no-const-assign': 'error',
      'no-dupe-class-members': 'error',
      'no-dupe-keys': 'error',
      'no-else-return': 'error',
      'no-eval': 'error',
      'no-extend-native': 'error',
      'no-new-object': 'error',
      'no-new-symbol': 'error',
      'no-new-wrappers': 'error',
      'no-return-assign': 'error',
      'no-sparse-arrays': 'error',
      'no-this-before-super': 'error',
      'no-undef': ['error', { typeof: false }],
      'no-unsafe-finally': 'error',
      'no-useless-call': 'error',
      'no-useless-computed-key': 'error',
      'no-var': 'error',
      'object-shorthand': ['error', 'properties'],
      'one-var': ['error', 'never'],
      'prefer-arrow-callback': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      quotes: ['error', 'single', { allowTemplateLiterals: true }],
      'require-await': 'error',
      'rest-spread-spacing': ['error', 'never'],
      semi: ['error', 'always'],

      // warnings
      'dot-notation': 'warn',
      'no-constant-condition': 'warn',
      'no-loop-func': 'warn',
      'no-redeclare': 'warn',
      'no-unused-vars': ['warn', { vars: 'all', caughtErrors: 'all', varsIgnorePattern: '^internals$', args: 'none' }],
      'sort-vars': 'warn',
      yoda: ['warn', 'never'],

      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: 'directive', next: '*' },
        { blankLine: 'any', prev: 'directive', next: 'directive' },
        { blankLine: 'always', prev: 'cjs-import', next: '*' },
        { blankLine: 'any', prev: 'cjs-import', next: 'cjs-import' },
        { blankLine: 'always', prev: 'cjs-export', next: '*' },
        { blankLine: 'always', prev: 'multiline-block-like', next: '*' },
        { blankLine: 'always', prev: 'class', next: '*' }
      ]
    }
  }
];
