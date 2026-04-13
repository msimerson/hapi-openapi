'use strict';

const HapiPlugin = require('@hapi/eslint-plugin');
const PrettierConfig = require('eslint-config-prettier');
const Globals = require('globals');

module.exports = [
  {
    ignores: ['public/**', 'node_modules/**']
  },
  ...HapiPlugin.configs.module,
  {
    languageOptions: {
      globals: {
        ...Globals.node,
        ...Globals.es2021
      }
    },
    rules: {
      ...PrettierConfig.rules,
      eqeqeq: 0,
      'no-shadow': 0,
      strict: 0,
      'no-console': 0,
      '@hapi/scope-start': 0
    }
  }
];
