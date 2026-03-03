import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default defineConfig([
  globalIgnores(['assets/templates/**', 'build/**']),
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended, eslintConfigPrettier],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      'preserve-caught-error': 'off',
      'no-empty': 'off',
      'no-useless-assignment': 'off',
      'no-unused-vars': [
        'warn',
        {
          args: 'none',
          caughtErrors: 'none',
        },
      ],
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
    },
  },
]);
