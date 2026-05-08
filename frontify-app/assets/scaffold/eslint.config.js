// Minimal ESLint flat config to satisfy frontify-cli's pre-deploy `npx eslint src` check.
//
// The CLI's pre-deploy step requires an eslint.config.{js,mjs,cjs} and at least one
// matched file, but does not require any specific rules to fire. We use the
// typescript-eslint parser so .ts/.tsx files parse, and leave `rules: {}` empty.
// Real type-checking happens via `tsc --noEmit` (`npm run lint`).
//
// Replace with `tseslint.configs.recommended` etc. when polishing.
// See: https://typescript-eslint.io/getting-started

import tseslint from 'typescript-eslint';

export default [
    {
        files: ['src/**/*.{ts,tsx,js,jsx}'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: { jsx: true },
            },
        },
        rules: {},
    },
];
