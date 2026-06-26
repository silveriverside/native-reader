import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const sharedGlobals = {
  ...globals.browser,
  ...globals.node,
  __DEV__: 'readonly',
};

export default tseslint.config(
  {
    ignores: [
      '.agent_state/**',
      '.expo/**',
      '.trae/**',
      'android/**',
      'assets/**',
      'dist/**',
      'ios/**',
      'node_modules/**',
      'web-build/**',
    ],
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: sharedGlobals,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'preserve-caught-error': 'off',
    },
  },
  {
    files: ['eslint.config.mjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: sharedGlobals,
    },
  },
  {
    files: ['**/*.{js,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: sharedGlobals,
    },
  },
  {
    files: ['**/*.test.{ts,tsx,js}', 'jest.config.js', 'jest.setup.js'],
    languageOptions: {
      globals: {
        ...sharedGlobals,
        ...globals.jest,
      },
    },
  }
);
