import tseslint from 'typescript-eslint';
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';

export default defineConfig({
  extends: [js.configs.recommended, tseslint.configs.recommended],
  files: ['**/*.{ts,tsx,js,jsx}'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
});
