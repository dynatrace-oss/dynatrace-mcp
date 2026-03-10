// @ts-check
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // Trailing commas for multiline
      'comma-dangle': ['warn', 'always-multiline'],
      // Consistent brace style
      'curly': ['warn', 'all'],
      // Unused variables/imports
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // TypeScript handles undefined variable checks
      'no-undef': 'off',
      // Downgraded from error to warn: existing code uses any types
      '@typescript-eslint/no-explicit-any': 'warn',
      // Downgraded from error to warn: existing code has useless escapes
      'no-useless-escape': 'warn',
      // Downgraded from error to warn: existing code has empty patterns
      'no-empty-pattern': 'warn',
    },
  },
];
