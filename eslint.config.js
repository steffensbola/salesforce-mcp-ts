// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // Global ignores (applies to all configurations)
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
    ],
  },
  
  // Apply to TypeScript source files only
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'sonarjs': sonarjs,
      'prettier': prettier,
    },
    rules: {
      // Prettier integration
      'prettier/prettier': 'error',

      // SonarJS rules (compatible subset)
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/no-duplicate-string': ['error', { threshold: 10 }],
      'sonarjs/no-duplicated-branches': 'error',
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-redundant-boolean': 'error',
      'sonarjs/no-small-switch': 'error',
      'sonarjs/prefer-immediate-return': 'error',

      // Code quality rules
      'complexity': ['warn', 55],
      'max-depth': ['error', 4],
      'max-lines': ['error', 1000],
      'max-lines-per-function': ['warn', 100],
      'max-nested-callbacks': ['error', 3],
      'max-params': ['error', 5],
      'no-duplicate-imports': 'error',
      'no-magic-numbers': ['warn', { 
        ignore: [0, 1, -1, 2], 
        ignoreArrayIndexes: true,
        enforceConst: true 
      }],
      'prefer-const': 'error',
      'no-var': 'error',

      // TypeScript-specific rules
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',

      // Security rules
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      // Best practices
      'eqeqeq': ['error', 'always'],
      'no-console': 'warn',
      'no-debugger': 'error',
      'curly': ['error', 'all'],
      'dot-notation': 'error',
      'no-else-return': 'error',
      'no-empty-function': 'error',
      'no-useless-return': 'error',
    },
  },

  // Apply Prettier config last to override formatting rules
  prettierConfig,
);
