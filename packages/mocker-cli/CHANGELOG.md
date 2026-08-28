# @homelync/mocker-cli

## 1.1.0

### Minor Changes

- [#40](https://github.com/homelync/mocker/pull/40) [`870914b`](https://github.com/homelync/mocker/commit/870914b5a44a8236601f2c5ddf16afbaab51084c) Thanks [@magicspon](https://github.com/magicspon)! - The locale is now configurable per request and per run, as well as per entry.

  - `GenerateOptions.locale` takes a fallback chain as well as a single locale, and
    `en` backs whatever is given unless it is already in the chain. Most faker
    locales define only part of the data and faker throws on a category none of
    them covers, so a partial locale such as `de_CH` previously failed on the
    first `lorem` field it met. The default is unchanged: `en_GB` backed by `en`.
  - New `x-mock-locale` control header, taking one faker locale name or a
    comma-separated chain. It overrules an entry's own locale, as `x-mock-seed`
    overrules its seed, and a name faker does not ship is a 400. A fixture
    generated under a locale is named apart from one generated without, so an
    existing tree keeps every filename it had.
  - `mocker` takes `--locale`, and `mocker.config.json` takes `"locale"`, setting
    the language of every generated body and of the bindings filled into fixture
    URLs alongside them.
  - New exports: `MOCK_LOCALE_HEADER`, `localeChain`, `resolveLocales`,
    `isLocaleName` and `LOCALE_NAMES`.

### Patch Changes

- Updated dependencies [[`870914b`](https://github.com/homelync/mocker/commit/870914b5a44a8236601f2c5ddf16afbaab51084c)]:
  - @homelync/mocker@1.1.0

## 1.0.0

### Major Changes

- [#31](https://github.com/homelync/mocker/pull/31) [`e91bcdb`](https://github.com/homelync/mocker/commit/e91bcdbfb9ec39d104eb9c898b7143113d6af096) Thanks [@magicspon](https://github.com/magicspon)! - First release. One endpoint registry of zod schemas, served four ways: Next.js
  App Router routes, Storybook handlers over MSW, Playwright fixtures over
  `context.route`, and a `mocker` command that writes the whole registry to disk.

### Patch Changes

- Updated dependencies [[`e91bcdb`](https://github.com/homelync/mocker/commit/e91bcdbfb9ec39d104eb9c898b7143113d6af096)]:
  - @homelync/mocker@1.0.0
