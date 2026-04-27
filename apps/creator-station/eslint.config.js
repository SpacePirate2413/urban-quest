import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      // The "jsx-runtime" config disables react/react-in-jsx-scope and
      // react/jsx-uses-react, which are obsolete with the React 17+ JSX
      // transform that Vite uses. Crucially, including the react plugin
      // teaches ESLint that <Icon /> counts as a use of `Icon` — without it,
      // no-unused-vars produces false positives on every component pulled in
      // for JSX, AND react/jsx-no-undef can flag missing imports at lint
      // time (the class of bug that caused recent blank-screens).
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', args: 'none' }],
      // PropTypes are out of scope for this codebase (no TS, no PropTypes
      // declarations) — silence the noise rather than add boilerplate.
      'react/prop-types': 'off',
      // We've decided we don't care about straight quotes in JSX text — they
      // render fine and the rule produces a lot of low-value churn. The bug
      // class we want to catch is missing imports / undefined identifiers,
      // which is covered by react/jsx-no-undef + no-undef.
      'react/no-unescaped-entities': 'off',
      // The plugin flags any setState() inside useEffect() as cascading
      // renders, but the canonical "kick off async fetch" pattern (set
      // loading=true, then await, then set data) is fine. Downgrade to a
      // warning so it's visible but doesn't show in the dev overlay.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
])
