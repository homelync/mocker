# @homelync/mocker-playwright

Playwright adapter for
[`@homelync/mocker`](https://github.com/homelync/mocker/tree/main/packages/mocker):
answer a browser's requests from the zod schemas your API already responds with,
backed by JSON files you can edit and commit.

```sh
npm install --save-dev @homelync/mocker-playwright
```

`@homelync/mocker` comes with it. `zod` (v4) is a peer; `@playwright/test` and
`playwright-core` are **optional** peers, because every reference to Playwright
in this package is `import type` — nothing here evaluates Playwright's own
module. ESM only.

## Quickstart

```ts
// tests/fixtures.ts
import { test as base } from "@playwright/test";
import { mockerTest } from "@homelync/mocker-playwright";
import { registry } from "../src/mocks/registry";

export const test = base.extend(mockerTest({ registry }));
export { expect } from "@playwright/test";
```

```ts
// tests/devices.spec.ts
import { expect, test } from "./fixtures";

test("shows the devices", async ({ page }) => {
  await page.goto("/devices");
  await expect(page.getByRole("listitem")).toHaveCount(20);
});

test("shows the empty state", async ({ page, mocker }) => {
  mocker.use("GET /api/devices", { count: 0 }); // before goto — see below
  await page.goto("/devices");
  await expect(page.getByText("No devices")).toBeVisible();
});
```

```ts
// src/mocks/registry.ts — the endpoints, keyed as a URL reads
import type { MockRegistry } from "@homelync/mocker";

export const registry = {
  "GET /api/property/[reference]": {
    schema: () => import("./schemas").then((m) => m.propertySchema),
  },
  "GET /api/devices?propertyReference=[reference]": {
    schema: () => import("./schemas").then((m) => m.deviceListSchema),
  },
} satisfies MockRegistry;
```

The same table the Next and Storybook adapters take, in the same dialect. A
component sees identical bytes in all three, because all three end in the same
`handle()`.

The `mocker` fixture is `auto`, so every test is mocked whether or not it asks —
which is what makes "an undeclared endpoint fails the test" a property of the
suite rather than of the tests that remembered to opt in.

## Two defaults that are the opposite of the Storybook adapter's

Both follow from one difference: a story is _looked at_, and a test _asserts_.

### 1. Responses come from files (`fixed: true`)

The first time a request has no fixture, one is generated, written — **and the
test fails**, naming the file.

```
[mocker] 1 request in this test needs attention.

Fixtures were written. Review them, commit them, and run again:
  GET http://localhost:3000/api/devices?propertyReference=ABC123
    → /repo/tests/mocks/GET/api/devices/3f9a1c2d.json
```

Playwright already made this call for screenshots: `toMatchSnapshot` on a missing
baseline writes the file _and_ fails. Green locally on the next run with the file
staged; red in CI, because a baseline nobody reviewed is not a passing test.

The failing half is the point. Without it: someone adds a test, never runs it
locally, pushes. CI has no fixture, generates one, serves it, the test is green,
and the file dies with the container. The reviewer sees a test and no fixture in
the diff — and the test asserts on faker output with nothing anywhere saying so.

Open the file, change it to say what the test is actually about, commit it:

```jsonc
{
  "results": [
    // "attero turba sperno" told a reader nothing. This does.
    { "id": "16aA3eC5", "room": "Kitchen", "statusId": "FAULT" },
  ],
}
```

`fixed: false` opts out and generates per request, as Storybook does by default.

> Not to be confused with an `overrides` entry, which pins one **field** while
> the rest of the response is generated. `fixed` freezes the **whole response**,
> and does it as a file.

### 2. An undeclared request fails the test (`unmatched: 'error'`)

Passthrough — the Storybook adapter's answer — is the flakiest possible default
for e2e: an undeclared API call reaches a real backend, and a `POST` writes to a
real database.

Being strict about _everything_ would break every test that loads a font, so the
rule uses the discriminator Playwright has and MSW does not:

> Strict on `fetch` and `xhr` within scope. Everything else — `document`,
> `script`, `stylesheet`, `image`, `font`, `media` — passes through untouched.

**Scope** is the `baseUrl` origin when one is given, and otherwise the page's own
origin. A same-origin `fetch` the app makes that the registry says nothing about
is, essentially always, an endpoint someone forgot to declare. The 404 carries
the same explanation the library gives everywhere else — not registered / this
path is captured by the mock so its real handler is unreachable / declared only
with these query constraints — so the page renders an error state rather than
hanging, and the run fails in teardown naming every one.

`unmatched: 'passthrough'` opts out.

## Where fixtures live

`mocks/`, resolved against `testInfo.config.rootDir` — which Playwright derives
from your `testDir`, so with `testDir: './tests'` the store is `tests/mocks/`.
Set `dir` to move it; an absolute path is taken as is.

```
tests/mocks/
  GET/
    api/
      devices/
        3f9a1c2d.json        ← ?propertyReference=ABC123
        b71e04aa.json        ← the same endpoint, count: 0
      property/
        ABC123/
          cb472436.json
```

The name is derived from the request — method, path, sorted query, and the
`seed` / `count` / `status` the test set — so it is the same on every machine,
does not move when a registry key is renamed, and gives two tests of one endpoint
two files rather than one they fight over. The tree mirrors the URL because the
directory listing is the interface; only the leaf is a hash, because a query
string is not a filename.

| Situation                             | What happens                                        |
| ------------------------------------- | --------------------------------------------------- |
| No file yet                           | generate, answer, write it, **fail the test**       |
| No file, `write: 'none'`              | generate, answer, write nothing, fail the test      |
| File exists                           | serve it verbatim — your formatting survives        |
| File no longer matches its schema     | **500** naming the file                             |
| A requested failure (`status >= 400`) | nothing is written; a stored 500 would be permanent |

A fixture that fails its schema is a 500 rather than a quiet regeneration:
regenerating would destroy the edit that was the whole point, and serving it
unchecked would move the failure into the component, where it looks like a bug in
the component.

**To regenerate one fixture, delete it** — a deliberate act that shows up in
`git status`. `--update-snapshots` deliberately does _not_ regenerate fixtures:
`none` is honoured (write nothing, still fail), `missing` is the default, and
`all` / `changed` are ignored. Someone accepting a legitimate screenshot change
must not thereby rewrite every hand-edited fixture in the repo.

**Sharing a store with Storybook** is available, not automatic: the derivation is
shared in `@homelync/mocker/core`, so the same request lands on the same
filename from either runtime — point `mockerFixtures({ dir })` and this `dir` at
one path. It is safe because legitimate divergence separates itself: a story
wanting three rows and a test wanting an empty state set different `count`, which
is in the hash, which is a different file.

## Three rules a test has to keep

None of them can be enforced, so all three are here.

1. **`mocker.use()` must come before the request is made** — before `page.goto()`,
   before the click that triggers the fetch. A route is consulted when the request
   happens; an override registered afterwards never fires.
2. **`use()` takes registry keys and controls, never a literal body.** A literal
   is `page.route` with extra steps: it skips the schema, so the mock can drift
   from the API with nothing to catch it. If you want specific bytes, edit the
   fixture file — that is what `fixed` is _for_.
3. **Your own `context.route` for an in-scope path must be registered after
   this one** to win. Playwright consults the most recently registered route
   first, and this one answers rather than falling through.

## Options

Set them per project or per file with `test.use({ mockerOptions: … })`, for the
whole suite in `mockerTest({ registry, … })`, or for one endpoint in
`mocker.use(key, …)`.

| Option      | Default                           | Means                                             |
| ----------- | --------------------------------- | ------------------------------------------------- |
| `fixed`     | `true`                            | answer from a file, not from the generator        |
| `unmatched` | `'error'`                         | what an undeclared in-scope `fetch`/`xhr` does    |
| `write`     | `'missing'`                       | may a missing fixture be written                  |
| `dir`       | `'mocks'`                         | the store, relative to `rootDir`                  |
| `scope`     | `baseUrl` origin, else the page's | which URLs are the mock's business                |
| `baseUrl`   | —                                 | where the API is mounted, if not the app's origin |
| `seed`      | the request signature             | different data for the same request               |
| `count`     | —                                 | size the primary collection                       |
| `delayMs`   | —                                 | wait before answering, for a loading state        |
| `status`    | the endpoint's                    | answer with this status instead                   |
| `generate`  | — (`use()` only)                  | generation options, checked against _that_ schema |
| `enabled`   | `true` (`test.use()` only)        | `false` for a file that wants the real API        |

```ts
test.use({ mockerOptions: { count: 3 } }); // this file
test.use({ mockerOptions: { enabled: false } }); // this file talks to the real API
```

## Without the test runner

`mockerRoutes` installs the same mock on any `BrowserContext`, for a script
driving `playwright-core`. It has no teardown, so nothing fails for you — read
the ledger yourself:

```ts
import { describeMisses, mockerRoutes } from "@homelync/mocker-playwright";

const mocker = await mockerRoutes(context, registry);
mocker.use("GET /api/devices", { count: 0 });
await page.goto("/devices");

const report = describeMisses(mocker.misses);
if (report !== null) throw new Error(report);
```

`dir` is resolved against `process.cwd()` here rather than against `rootDir`.

## What it does, and does not

One route is registered on the context, not one per registry key. That is where
the simplicity comes from: no third pattern dialect to invent, and precedence is
a list this package owns rather than an ordering Playwright happens to apply.

- **No CORS handling, deliberately.** Checked against Playwright 1.62 in all
  three engines: a fulfilled cross-origin response reaches the page with no
  `access-control-allow-origin` at all — even with `credentials: 'include'` — and
  an intercepted non-simple request never issues a preflight. There is nothing to
  answer.
- **No request bodies are read.** `handle()` never reads one, so neither does
  this.
- **Traces come free.** `route.fulfill()` shows up in the trace viewer with
  `x-mock` and `x-mock-fixture` intact, so a mocked response is inspectable and
  its fixture nameable with no work.

### Alongside `@homelync/mocker-next`

The two layers cover disjoint traffic by construction: `context.route` catches
browser-originated requests before they leave the browser, and RSC fetches happen
in the Next server process and never reach it.

**Do not mock the same endpoint in both.** An endpoint fetched from both sides
gets a fixture on one and the generator on the other — identical today, since
both go through `handle()` with the same request signature, and different the
moment the fixture is hand-edited or the schema gains a field, which is the entire
point of fixtures. The page then renders server data disagreeing with client
data, and nothing reports it.

Against `next dev` with `withMocker({ registry })` active, the server already
answers a client component's `fetch('/api/devices')`. What this package adds is
the thing no server-side mock can do: **per-test variation** — one test seeing an
empty list and the next seeing three rows.

### If your app can start MSW itself

Then you may not need this package at all. `mockerHandlers()` from
`@homelync/mocker-storybook` is free of any Storybook import precisely so it
works in a bare worker:

```ts
// the app's own entry, behind a flag
setupWorker(...mockerHandlers(registry)).start();
```

Playwright then intercepts nothing. The trade is that the worker has to be served
and registered before the first navigation, and a test cannot vary its data.

## Further reading

- [`@homelync/mocker`](https://github.com/homelync/mocker/tree/main/packages/mocker) — the generator, the registry, the controls
- [`docs/mocking-guide.md`](https://github.com/homelync/mocker/blob/main/docs/mocking-guide.md) — the long version
- [`docs/overrides-and-rules.md`](https://github.com/homelync/mocker/blob/main/docs/overrides-and-rules.md) — pinning a field, and name rules
- `apps/e2e` — a working suite, fixtures committed
