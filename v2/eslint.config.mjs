// @ts-check
import eslint from '@eslint/js'
import importPlugin from 'eslint-plugin-import'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import sonarjs from 'eslint-plugin-sonarjs'
import unicorn from 'eslint-plugin-unicorn'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Guarded sonarjs recommended config to avoid runtime/typing issues when undefined
const sonarRecommended = (sonarjs && sonarjs.configs && sonarjs.configs.recommended) || {}

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'node_modules/**', 'bin/**', 'build/**', '.eslintcache'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  unicorn.configs.recommended,
  sonarRecommended,
  eslintPluginPrettierRecommended,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      import: importPlugin,
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // Import sorting
      // 'simple-import-sort/imports': 'error',
      // 'simple-import-sort/exports': 'error',

      // Import best practices
      // 'import/no-cycle': 'error',
      'import/no-unused-modules': 'warn',

      // TypeScript
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      // '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'warn',

      // Code complexity
      complexity: ['warn', 10],
      'max-depth': ['warn', 3],
      'max-lines-per-function': ['warn', 50],

      // Prettier
      'prettier/prettier': ['error', { endOfLine: 'auto' }],

      // Sonarjs - 調整為 warn 以支持漸進式改進
      'sonarjs/class-name': 'warn',
      'sonarjs/deprecation': 'warn',
      'sonarjs/todo-tag': 'warn',
      'sonarjs/no-hardcoded-passwords': 'warn',
      'sonarjs/os-command': 'warn',
      'sonarjs/pseudo-random': 'warn',
      'sonarjs/no-nested-conditional': 'warn',
      'sonarjs/prefer-regexp-exec': 'warn',

      // Unicorn - 調整為 warn 以支持漸進式改進
      'unicorn/filename-case': 'off',
      'unicorn/prevent-abbreviations': 'warn',
      'unicorn/no-null': 'warn',
      'unicorn/prefer-top-level-await': 'warn',
      'unicorn/import-style': 'warn',
      'unicorn/prefer-regexp-test': 'warn',
    },
  }
)
