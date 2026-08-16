/** @type {import("nano-staged").Configuration} */
const config = {
  '*.{js,cjs,ts,tsx}': [
    'oxfmt --no-error-on-unmatched-pattern',
    'pnpm exec oxlint --deny-warnings',
    "bash -c 'pnpm typecheck'",
  ],
}

export default config
