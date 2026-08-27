---
'@homelync/mocker': minor
'@homelync/mocker-cli': minor
---

The locale is now configurable per request and per run, as well as per entry.

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
