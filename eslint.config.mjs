// eslint.config.mjs
import eslint from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierRecommended from 'eslint-config-prettier';

export default [
  eslint.configs.recommended, // regras ESLint padrão
  {
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    languageOptions: {
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json', // necessário para require-await e unsafe-*
        tsconfigRootDir: new URL('.', import.meta.url).pathname,
        sourceType: 'module',
      },
      globals: {
        NodeJS: 'readonly',
        jest: 'readonly',
      },
    },
    rules: {
      // NestJS/TS específicas
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
    ignores: ['node_modules', 'dist', 'test', '**/*.spec.ts'],
  },
  prettierRecommended, // integra Prettier
];
