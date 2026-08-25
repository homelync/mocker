---
"@homelync/mocker-playwright": minor
"@homelync/mocker-storybook": patch
"@homelync/mocker": minor
---

Add `@homelync/mocker-playwright`: the same endpoint registry, served to a
Playwright browser context, backed by JSON fixtures you can edit and commit.

```ts
export const test = base.extend(mockerTest({ registry }));

test("empty state", async ({ page, mocker }) => {
  mocker.use("GET /api/devices", { count: 0 });
  await page.goto("/devices");
});
```

One route is registered on the context rather than one per registry key, so
there is no third pattern dialect and override precedence is a list the package
owns rather than an ordering Playwright happens to apply. Playwright itself is
referenced only through `import type`, so both peers are optional.

Two of its defaults are the opposite of the Storybook adapter's, because a story
is looked at and a test asserts:

- **Responses come from files** (`fixed: true`). A request with no fixture gets
  one generated and written, and **fails the test** — exactly what
  `toMatchSnapshot` does about a missing baseline. Without the failure, CI
  generates a fixture, serves it, goes green and throws the file away, leaving a
  test that asserts on faker output with nothing saying so.
- **An undeclared request fails the test** (`unmatched: 'error'`), scoped to
  `fetch` and `xhr` so a test that loads a font is unaffected.

`--update-snapshots` deliberately will not regenerate fixtures: `none` is
honoured, `all` and `changed` are ignored. To regenerate one, delete it.

`@homelync/mocker` gains `fixturePath` and `serializeFixture` on `./core`, which
is where the derivation of a fixture's name and bytes now lives so that both
adapters agree on it — the same request lands on the same file, formatted the
same way, from either runtime. `@homelync/mocker-storybook` uses them instead
of its own copy; nothing it exported has changed.
