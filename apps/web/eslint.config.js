import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    rules: {
      // shadcn exports its variant helpers alongside these two components.
      'react-refresh/only-export-components': [
        'error',
        { allowExportNames: ['buttonVariants', 'badgeVariants'] },
      ],
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['src/{pages,components,lib,stores}/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@/api/client', message: 'Use typed hooks/adapters from src/api.' },
            {
              name: 'axios',
              importNames: ['default'],
              message: 'HTTP transport belongs in src/api; named error helpers are allowed.',
            },
            {
              name: '@tanstack/react-query',
              importNames: ['useQuery', 'useMutation'],
              message: 'Define API query and mutation hooks in src/api.',
            },
          ],
        },
      ],
    },
  },
])
