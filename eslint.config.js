import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.{js,mjs,cjs}', 'test/**/*.{js,mjs,cjs}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.mocha },
    },
    rules: {
      complexity: 'off',
      'max-statements': 'off',
      'no-unused-vars': 'warn',
      'no-redeclare': 'warn',
      'no-prototype-builtins': 'off',
      'no-control-regex': 'off',
      'no-empty': 'warn',
      'no-case-declarations': 'off',
    },
  },
]);
