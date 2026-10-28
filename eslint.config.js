// @ts-check
import eslint from '@eslint/js';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'src/shared/api/schema.d.ts', 'src/paraglide/**', 'scripts/**', 'eslint.config.js'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  reactHooks.configs.flat.recommended,
  prettierRecommended,
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      'no-console': 'error',
      // docs/architecture.md: una feature no importa de otra; HTTP solo vía shared/api.
      'no-restricted-imports': ['error', { patterns: ['**/features/*/**'] }],
    },
  },
  {
    files: ['src/app/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
);
