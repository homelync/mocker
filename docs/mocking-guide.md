# Schema-driven mock data

> **Written in the application this library was extracted from**, and kept as it
> was because the reasoning is worth more than the tidying. Paths (`src/mocks/`,
> `src/app/api/`), the port (`4400`) and the endpoint names belong to that app,
> not to yours; `@mock/...` specifiers are today's `@magicspon/mocker` and
> `@magicspon/mocker-next`. Everything about _how the thing works_ is current.
>
> For the package surfaces, start at
> [`packages/mocker`](../packages/mocker/README.md) and
> [`packages/mocker-next`](../packages/mocker-next/README.md).

A library for generating fake data from zod schemas and serving it over HTTP,
trialled in this repo and intended to also serve Playwright, Nest, Storybook and
other runtimes.

Two halves: a **generator** that turns a schema into plausible data, and a
**handler** that turns a request into a response. Next.js is wired up; other
runtimes need only an adapter — see
[Wiring up another runtime](#wiring-up-another-runtime).

**Nothing in this folder imports the application.** Every application-shaped
fact — which endpoints exist, what they respond with, which routes are excused —
lives in `src/mocks/` and is passed _in_. That is what makes extracting this to a
package a `git mv` rather than an untangling exercise, and it is enforced by
`package-boundary.test.ts` rather than merely intended.

---

# Using it

## Quick start

```sh
MOCK_API=1 npm run dev
```

Every registered BFF route now answers from its own zod schema — no Sensorium,
no Lightspeed, no network. Check it:

```sh
curl -s 'localhost:4400/api/portfolio/reports/devices?page=1&limit=3' | jq
```

Every fabricated response announces itself in the terminal, above Next's own log
line for the same request:

```
[mock] 200 GET /api/portfolio/reports/devices?page=1&limit=3 4ms
 GET /api/portfolio/reports/devices?page=1&limit=3 200 in 9ms
```

That is the fastest way to tell a mocked screen from a real one — see
[Reading the log](#reading-the-log).

Two things to know before you start:

- **Stop any dev server you already have running.** Next 16 refuses to start a
  second dev server for the same directory, and the failure message scrolls past
  easily — you end up curling the _old_ process and wondering why nothing is
  mocked.
- **Mocking covers data, not authentication.** Page routes are still gated by
  `src/proxy.ts`, so viewing the app in a browser still needs a real login
  against the auth service. Once you are in, every registered route serves
  generated data. The auth routes are deliberately left un-mocked — see
  [Adding a mock to a route](#adding-a-mock-to-a-route).

`verify/repo-schemas.test.ts` drives itself off the registry, so every entry is
proved to generate and re-parse across 40 seeds — there is no second list to
keep in step.

## Mocking only some routes

`MOCK_API=1` (or `true`, or `all`) mocks every registered route. **Any other
value is a comma-separated list of path fragments**, matched as substrings
against the request pathname:

```sh
# fake the slow report, keep everything else hitting the real services
MOCK_API=reports/devices npm run dev

# fake a whole area
MOCK_API=reports/lookup,property/search npm run dev
```

An unmatched route falls through to its real handler, session and all. This is
the mode to reach for when you are building one screen against data that does not
exist yet and want the rest of the app to stay honest.

## Recipes

The `x-mock-*` request headers cover the states that are otherwise a pain to
produce. All of them work on any mocked route.

```sh
BASE=localhost:4400/api/portfolio/reports/devices

# Empty state
curl -s -H 'x-mock-count: 0' "$BASE" | jq

# Error state — anything >= 400 returns { error }, no data
curl -s -H 'x-mock-status: 500' "$BASE" | jq

# Loading state — three seconds of skeleton
curl -s -H 'x-mock-delay: 3000' "$BASE"

# A big page, to see how the grid copes
curl -s -H 'x-mock-count: 500' "$BASE" | jq '.results | length'

# A different dataset for the same request
curl -s -H 'x-mock-seed: monday' "$BASE" | jq '.results[0]'

# Page through, and watch the totals agree
curl -s "$BASE?page=1&limit=20" | jq '{rows: (.results|length), count, totalPages}'
curl -s "$BASE?page=2&limit=20" | jq '{rows: (.results|length), count, totalPages}'
```

`x-mock-seed` changes the **rows**, not the **totals** — the size of a dataset
stays a property of the path it lives at, so reseeding gives you different
devices, not a differently-sized portfolio. Use `x-mock-count` to change the
size.

### Using the controls from the browser

You cannot easily add a request header to a fetch the app itself makes, so the
headers are really for curl, Bruno/Postman and Playwright:

```ts
// e2e — every request this page makes comes back slow and empty
await page.setExtraHTTPHeaders({ 'x-mock-delay': '2000', 'x-mock-count': '0' })
```

To reproduce a state _in the running app_, pin it on the route instead — see
[Pinning an endpoint's data](#pinning-an-endpoints-data) — and remove the pin
when you are done.

### Reading the log

Every mocked response writes one line, prefixed `[mock]` so
`npm run dev | grep '\[mock\]'` gives you just the fabricated traffic:

```
[mock] 200 GET /api/property/search?searchSlug=abc 4ms
[mock] 200 GET /api/portfolio/overview/active-alerts 402ms
[mock] 404 DELETE /api/property/ABC123 0ms — No mock declared for DELETE …
```

Four things to know about it:

- **The path is the one you asked for**, not the `/api/mock/...` one the rewrite
  sent it to. A log naming a URL nobody requested agrees with neither devtools
  nor the access log.
- **Anything from 400 up goes to `console.warn` and carries the reason.** A
  registry miss is the case you are usually reading this output to find, and the
  explanation — including "this path is captured by the mock, so its real handler
  is unreachable" — is on the line rather than only in the response body.
- **The duration is time spent in the mock**, so `x-mock-delay: 400` shows up as
  `402ms`. It is not Next's end-to-end figure, which is the line underneath.
- **A request the flag did not match is not logged at all.** It reached the real
  handler, so Next's own request log is the truthful account of it — and silence
  means "not mocked", which is the whole signal.

Turn it off with `MOCK_LOG=0` (see [`MOCK_LOG`](#mock_log)).

### Reproducing what you saw

Every mocked response carries two headers:

```
x-mock: 1
x-mock-seed: GET /api/portfolio/reports/devices?limit=20&page=2
```

`x-mock: 1` is how you tell at a glance in devtools which responses were
fabricated. `x-mock-seed` is the exact input that produced the body: issue the
same request and you get the same bytes back. Pass that string back as an
`x-mock-seed` header to keep the same rows after the request itself has changed —
after adding a filter, say, when you want to compare like with like.

## Adding a mock to a route

The route file is not involved. Everything happens in `src/mocks/registry.ts`.

1. **Export the response schema** from the route's `types.ts` if it is not
   exported already. Export the shape the _browser_ receives, which is often not
   the shape the fetcher parses — a route that reduces a Lightspeed module list
   to `{ hasActiveRiskModule }` needs a schema for the second, not the first.

2. **Add a key**, written exactly as the path reads on disk:

   ```ts
   const registry = {
     'GET /api/portfolio/reports/devices': {
       schema: () =>
         import('@/app/api/portfolio/reports/devices/types').then(
           (module) => module.devicesResponseSchema,
         ),
     },
   } as const satisfies MockRegistryDraft

   export const mockRegistry = registry satisfies CheckedMockRegistry<
     typeof registry
   >
   ```

   The schema is a thunk so that `next.config.ts` can import the table for its
   keys without loading a single application module, zod schema or faker locale.
   Laziness is a runtime property only — TypeScript resolves the type of a
   dynamic `import()` statically, which is what lets the second statement check
   each entry's [`overrides`](#pinning-an-endpoints-data) against the schema that
   entry actually serves. Two statements because the check has to name the
   table's own type, and a declaration cannot refer to itself.

3. **Non-200 success?** Add the status:

   ```ts
   "POST /api/timeline/note": { status: 201, schema: () => /* ... */ },
   ```

4. **Restart the dev server.** `rewrites()` is evaluated once at startup, so the
   _set_ of intercepted paths is fixed for the process lifetime. An entry's
   schema, `status` and `options` hot-reload normally; adding or removing an
   entry does not.

5. **Run `npm run test:mock`.** The drift test will tell you if the route needs
   adding, and the verify suite — which iterates the registry itself — will tell
   you if the schema generates something its own parser rejects.

If a route genuinely should not be mocked — it sets cookies, it has no schema,
it is a liveness probe — add it to `UNMOCKED` in
`src/mocks/verify/next-routes.test.ts`
**with the reason**. The reason is the point: a bare exclusion list decays into
"things someone once skipped".

### Watch out for dynamic siblings

A dynamic key compiles to an unconditional rewrite, and a Next rewrite matches
on **path alone**. `GET /api/property/[reference]` therefore becomes
`/api/property/:reference`, which captures `search`, `metrics`, `devices`,
`modules` and every other single-segment sibling on its way past.

An unregistered sibling does not fall through to its real handler — it reaches
the mock endpoint, matches no key of its own, and is served the **dynamic
route's** schema. That failure is silent by construction: a property-detail
object is a perfectly valid response, just to the wrong question.

Registering the sibling fixes it. `findMatch` orders candidates by
dynamic-segment count, so a literal path always beats a dynamic one. This is why
every `/api/property/*` route has an entry.

### The mock wrapper

`withMock` is the other way in — it wraps a handler in its own route file rather
than declaring it centrally:

```ts
export const GET = withMock(devicesResponseSchema, withLandlordAuth(handler))
```

It is fully supported and no route in this repo uses it. It exists for a host
that would rather keep the declaration next to the handler, and it is the reason
`handle()` is a separate seam from `serveFromRegistry()`. Two things to know if
you reach for it:

- **Declaring a route in both places is a test failure**, not a precedence rule.
  The rewrite intercepts before the wrapper is reached, so the wrapper's options
  would be silently ignored.
- **It cannot mock a route that does not exist**, having no file to live in.

|                              | `withMock`               | Registry                 |
| ---------------------------- | ------------------------ | ------------------------ |
| Declaration lives            | next to the handler      | in one central file      |
| Route file mentions the mock | yes                      | **no**                   |
| Mocks a not-yet-built route  | no                       | **yes**                  |
| Beats a dynamic sibling      | no — never reached       | **yes**                  |
| Editing options              | hot-reloads              | hot-reloads              |
| Adding/removing an entry     | hot-reloads              | **needs a restart**      |
| In the production bundle     | stubbed out by the alias | no rewrite exists at all |

### What a mocked route does _not_ do

- **It does not read the request body.** A mocked `POST` returns a generated
  identity regardless of what you sent. Path and query parameters still
  influence the response; the body does not.
- **It does not remember anything.** Create a note and it will not appear in the
  next timeline fetch. The mock is stateless by design — see
  [Determinism](#determinism).
- **It does not run your handler's validation.** A request the real route would
  reject with a 400 gets a cheerful 200 of generated data. Use `x-mock-status`
  when you want the failure.

## How a key reaches Next

`next.config.ts` turns each key into a `beforeFiles` rewrite pointing at
`/api/mock/[...path]`, which looks the entry up, recovers any dynamic segments,
rebuilds the request at its **original** URL, and calls the same `handle()` the
wrapper calls. Same seed, same bytes, same headers.

A key is written in App Router dialect, exactly as the path reads on disk —
optionally followed by a query string, for the endpoints that identify their
subject that way.

### Endpoints that take a query string

Plenty of our BFF routes identify their subject with a query parameter rather
than a path segment. A key can say so:

```ts
"GET /api/property/devices?propertyReference=[reference]": {
  schema: () => import("./planned/property-devices").then((m) => m.deviceListSchema),
},
```

Three forms of condition, and they compose with `&`:

| Written                    | Matches                                            |
| -------------------------- | -------------------------------------------------- |
| `?propertyReference=[ref]` | present and non-empty; the value is bound to `ref` |
| `?mode=summary`            | present and exactly `summary`                      |
| `?propertyReference`       | present, any value                                 |

A key states what a request must **carry**, not everything it may: parameters it
says nothing about (`page`, `limit`, filters, sorts) are ignored, so adding a
sort to the UI does not stop the mocking.

A **bound** value is echoed into a response field of _its own_ name, not the
query parameter's — which is the point of naming it. `?propertyReference=ABC123`
against a schema whose field is `reference` returns `{"reference": "ABC123", …}`.
It also joins the seed, so each reference gets its own stable data.

Two things follow from how this reaches Next:

- **This key does not capture the bare path.** Query conditions compile to a
  rewrite's `has` array, not into its `source` — a path grammar that would reject
  a `?` outright — so `/api/property/devices` with no `propertyReference` does
  not match this rule.
  **That is not the same as reaching the real handler.** If some _other_ rewrite
  covers the path — a dynamic sibling almost always does; see
  [Watch out for dynamic siblings](#watch-out-for-dynamic-siblings) — the bare
  request is intercepted by that one instead and answered from its schema. Only a
  path no rewrite matches at all falls through.
- **The most constrained key wins.** `?ref=[r]&mode=summary` beats `?ref=[r]`
  beats no conditions at all, whatever order the table is written in, and the
  emitted rewrites are ordered to match.

### An endpoint nobody has built

Mark it `planned` with a ticket reference and put its schema in
`src/mocks/planned/`:

```ts
"GET /api/property/[reference]/energy-history": {
  planned: "WP-412",
  schema: () => import("./planned/energy-history").then((m) => m.energyHistorySchema),
},
```

A planned schema is a **design sketch, not a contract** — nothing validates it
against a real service. The drift test asserts a planned key names no `route.ts`
_and_ no path an existing route pattern already serves, so the day the real route
lands the test fails and forces the entry to be promoted or deleted.

The restart is the one real ergonomic cost. `rewrites()` is evaluated once when
the server starts, so the _set_ of intercepted paths is fixed for the process
lifetime — but an entry's schema, `status` and `options` are read per request and
hot-reload normally. Pinning a field is instant; opting a new route in is not.

## Pinning an endpoint's data

Generated values are plausible but arbitrary, and sometimes a screen needs a
specific one — a status the UI has a label for, a date inside a chart's window, a
field that must never be null. Add `options` to the entry:

```ts
// `import type` at the top of the file — erased, so the table still loads no
// application module. It names the schema for the `satisfies` below.
import type { devicesResponseSchema } from "@/app/api/portfolio/reports/devices/types";

"GET /api/portfolio/reports/devices": {
  schema: () => import("@/app/api/portfolio/reports/devices/types")
    .then((module) => module.devicesResponseSchema),
  options: {
    // Fill every nullable field, rather than dropping 30% of them.
    nullishRate: 0,
    // A page big enough to scroll.
    count: 50,
    overrides: {
      // statusId is z.string() in the schema but a closed set in the domain,
      // and the devices grid only has labels for these four.
      "results[].statusId": ({ faker }) =>
        faker.helpers.arrayElement(["GOOD", "WARNING", "FAULT", "CHECK_INSTALL"]),
      // Keep installations inside the window the chart renders.
      "results[].installationDate": ({ faker }) =>
        faker.date.between({ from: "2025-01-01", to: "2026-01-01" }).toISOString(),
    },
  } satisfies MockOptions<typeof devicesResponseSchema>,
},
```

These are read per request, so editing them hot-reloads — no restart, unlike
adding the key itself.

**Annotate `options` with `MockOptions<typeof schema>`.** That is what makes the
editor offer the schema's canonical paths as you type a key — a type only
reaches a literal while it is being written if it is contextual there. It also
puts a typo's error on the line that carries it, rather than on the table as a
whole. Annotating `options` and not the whole entry is deliberate: the `schema`
thunk has to keep the type it infers, which is how a `satisfies` naming the
_wrong_ schema is still caught by the table-wide check.

Override keys are [canonical paths](#canonical-paths): `results[]` addresses
_every_ element, so one line covers the page. A path that matches nothing is an
error, not a no-op — a mistyped `statusID` would otherwise fall through to the
name rules, produce a plausible string, and validate.

**Overrides are type-checked against their own schema.** Both halves of the
mistake are compile errors, in the registry and in a direct `generate()` call
alike:

```ts
// override path not found in this schema: results[].statusID
"results[].statusID": ({ faker }): string => "GOOD",
// Type 'number' is not assignable to type 'string'
"results[].serialNumber": (): number => 7,
```

The paths come from the schema's inferred output type, walked the same way
`collectPaths` walks the schema itself, so the two always agree on spelling. The
runtime checks stay where they are: `shapeRequest` addresses the schema by
computed path — an echoed `?reference=`, a pinned `count` — and no type can
prove those.

An override also outranks the [nullish roll](#nullish-fields), so a pinned field
is always present even where the schema allows it to be dropped. That is usually
what you want from a pin; if you are specifically testing null handling, pin
nothing and set `nullishRate: 1`.

The `reports/devices` entry in `src/mocks/registry.ts` carries a worked example
of exactly this, and `src/mocks/verify/next-routes.test.ts` asserts it still
holds.

`counts` is path-keyed too, and restricted to the paths the schema declares as
**arrays** — `{ readings: 365 }` against a schema whose collection is called
`results` is otherwise silently inert, and unlike an override it does not even
fail loudly at request time.

The full option set is [`GenerateOptions`](core/types.ts): `seed`, `count`,
`counts`, `nestedArrayLength`, `nullishRate`, `rules`, `overrides`, `locale`.
Request-derived options (seed, pagination, echo) sit underneath these, so
anything an entry states explicitly wins.

## Using the generator directly

`generate` is independent of the HTTP layer, so it also works as a fixture
factory in tests:

```ts
import { generate } from '@mock/core'
import { devicesResponseSchema } from '@/app/api/portfolio/reports/devices/types'

const page = generate(devicesResponseSchema, {
  seed: 'devices-page-1',
  count: 20,
})
```

Same seed, same bytes — so a fixture can be asserted against rather than merely
rendered.

One caveat for Storybook: `AGENTS.md` requires template stories to use obviously
fake placeholder data (`999`, lorem) rather than realistic values, so a story's
fetched areas should _not_ be filled from this. Realistic-looking generated data
belongs in unit tests, Playwright and the running app.

## Under Playwright

[`@magicspon/mocker-playwright`](../packages/mocker-playwright/README.md) serves
the same registry to a browser context, so an e2e suite asserts on the same bytes
`next dev` and Storybook show.

```ts
// tests/fixtures.ts
export const test = base.extend(mockerTest({ registry }))

// tests/devices.spec.ts
test('empty state', async ({ page, mocker }) => {
  mocker.use('GET /api/devices', { count: 0 }) // before goto
  await page.goto('/devices')
})
```

Two of its defaults are the **opposite** of the Storybook adapter's, and the
asymmetry is deliberate: a story is looked at, a test asserts.

- **Responses come from files** (`fixed: true`). A request with no fixture gets
  one generated and written — and **fails the test**, exactly as `toMatchSnapshot`
  does about a missing baseline. Without the failure, CI generates a fixture,
  serves it, goes green, and throws the file away: the reviewer sees a test
  asserting on faker output with nothing saying so.
- **An undeclared request fails the test** (`unmatched: 'error'`). Scoped by
  `resourceType`, so only `fetch` and `xhr` are strict and a test that loads a
  font is unaffected. Passthrough would let an undeclared call reach a real
  backend, and a `POST` write to a real database.

To regenerate a fixture, delete it. `--update-snapshots` will not do it for you:
`none` is honoured, `all` and `changed` are ignored, because accepting a
screenshot change must not rewrite every hand-edited fixture in the repo.

The filename derivation is shared with Storybook's fixed responses, in
`@magicspon/mocker/core` — so the same request lands on the same file from either
runtime, and one store can serve both if you point them at one directory.

If the app under test can start an MSW **worker** itself, you may need no adapter
at all: `mockerHandlers()` works in a bare `setupWorker`. What it cannot do is
vary the data per test, which is the main reason this package exists.

`apps/e2e` is a working suite with its fixtures committed.

## Reference

### `MOCK_API`

| Value              | Effect                                           |
| ------------------ | ------------------------------------------------ |
| unset, `""`, `0`   | Off. No rewrite is emitted at all.               |
| `1`, `true`, `all` | Every registered route is mocked.                |
| anything else      | Comma-separated path fragments; substring match. |

Mocking is hard off when `NODE_ENV=production`, flag or no flag. Fabricated data
reaching a real landlord is a worse failure than a demo environment that cannot
be mocked.

### `MOCK_LOG`

| Value                     | Effect                                         |
| ------------------------- | ---------------------------------------------- |
| unset, or anything else   | One line per mocked response. **The default.** |
| `0`, `false`, `off`, `no` | Silent.                                        |

On by default, because a mock nobody can see is the failure this exists to
prevent: a fabricated response that quietly works looks exactly like a real one
that quietly works, right up until the data is wrong.

The `mock` vitest project sets `MOCK_LOG=0` in `vitest.config.ts` — a few hundred
generated responses per run would bury the assertions. Set there rather than in
each test file, so a new test cannot forget.

### Request headers

| Header          | Range      | Effect                                                   |
| --------------- | ---------- | -------------------------------------------------------- |
| `x-mock-status` | 100–599    | Respond with this status. `>= 400` returns `{ error }`.  |
| `x-mock-delay`  | 0–30000 ms | Wait before responding.                                  |
| `x-mock-count`  | 0–10000    | Size the collection; collapses the response to one page. |
| `x-mock-seed`   | any string | Replace the derived seed. Changes rows, not totals.      |

Headers rather than query parameters, because a query parameter changes the
request signature and therefore the data — you would be looking at a _different_
response rather than the same one delayed.

A malformed control is a 400, not a shrug. `x-mock-count: twenty` that quietly
does nothing is indistinguishable from a mock that does not support counts, and
the only symptom is a page that looks subtly wrong.

### Response headers

| Header           | Meaning                                                   |
| ---------------- | --------------------------------------------------------- |
| `x-mock`         | Always `1`. Present only on fabricated responses.         |
| `x-mock-seed`    | The seed this body came from, for reproducing it.         |
| `x-mock-fixture` | The file this body was read from. Storybook `fixed` only. |

## Troubleshooting

**A route still returns real data / a 401.** In order of likelihood: the dev
server was started without the flag; the entry was added without restarting the
server, so no rewrite exists for it yet; a second dev server was already running
on the port so you are talking to the old one; `MOCK_API` names fragments and
this path matches none of them; the route has no key in `src/mocks/registry.ts`.
**Check the terminal first** — no `[mock]` line for the request means it was
never mocked, which rules out everything downstream in one glance. The response's
`x-mock: 1` header says the same thing from the client side.

**A route returns mocked data of the wrong shape.** It is being intercepted by
a _different_ entry — almost always a dynamic sibling whose rewrite captures the
path. See
[Watch out for dynamic siblings](#watch-out-for-dynamic-siblings); the fix is to
register the route in its own right.

**`500 { "error": "Mock output failed its own schema", "issues": [...] }`.** The
generator produced something the schema rejects. Almost always an override
pinning the wrong type — a string into a numeric field. The zod issues name the
path. An override written in the registry is type-checked against its schema, so
this now points at a name rule or a generated value rather than at a pin.

**`500 { "error": "Mock generation failed: ..." }`.** Either an override path
that matches nothing (the message suggests the closest real path) or a zod type
the walker has no generator for (`UnsupportedSchemaError`, naming the type _and_
the path). See [Supported zod surface](#supported-zod-surface).

**Dates render as "Invalid DateTime".** A date field whose name no rule matches.
Add a rule, or pin the field with an override. See
[Why name rules exist](#why-name-rules-exist).

**The drift test fails.** A `route.ts` exists that is neither registered nor
excused. Add a key to `src/mocks/registry.ts`, or add it to `UNMOCKED` in
`src/mocks/verify/next-routes.test.ts` with a reason.

**`npm run test:mock` passes but the app misbehaves.** The tests prove the
response satisfies its schema, not that it satisfies the _UI_. A field that is
schema-valid but domain-invalid — a `statusId` the grid has no label for — is
exactly what overrides are for.

---

# How it works

## Layout

| Folder      | Contents                                          | May import               |
| ----------- | ------------------------------------------------- | ------------------------ |
| `core/`     | generation, request handling, name rules          | `zod`, `@faker-js/faker` |
| `adapters/` | per-runtime glue — Next wrapper and Next registry | `core`, `registry`       |
| `registry/` | the endpoint table, key algebra, config helpers   | `core`, `src` schemas    |
| `planned/`  | sketch schemas for routes nobody has built yet    | `zod`                    |
| `verify/`   | tests against this app's real API + routes        | anything                 |
| `flag.ts`   | what `MOCK_API` means, for both mechanisms        | nothing                  |
| `log.ts`    | what a served request looks like in the terminal  | nothing                  |

`core` is forbidden from importing `src`, `adapters` or `registry` by
`import/no-restricted-paths` zones in `eslint.config.mjs`. That is what keeps
extraction to another package a `git mv` rather than an untangling exercise —
and why `flag.ts` sits outside `core`, since a runtime with no `process.env` must
still be able to use the generator.

Run the tests with `npm run test:mock`.

## Why the registry, and why it won

An earlier draft of this design had a central table keyed `"METHOD /path"` and
rejected it: a table is a second place to keep correct, and it goes stale
silently the moment a route moves, whereas a wrapper moves with its file. The
wrapper shipped first, and the table came back.

That argument was right about the risk and wrong about the conclusion, for a
reason the wrapper cannot fix on its own. `withMock` was imported by 26 route
files, and the module graph reaches the generator from every one of them — so a
production build carried a **424 KB chunk (157 KB gzipped)** of mock library in
two thirds of its API bundles. Inert, double-gated, and reachable by nothing; but
present, and reasonable people object to shipping it.

So the registry came back, on two conditions.

**It must be substitutable, not additional.** Both mechanisms funnel into the
same `handle()` with the same reconstructed `Request`, so they return the same
bytes for the same request — that equivalence is asserted in
`src/mocks/verify/registry.test.ts`, not merely intended. That is what made the
migration a non-event: moving a route from wrapper to table changed nothing a
developer could see. Declaring a route in _both_ places is a test failure,
because the rewrite intercepts before the wrapper is reached and its pinned
options would be silently ignored.

**Staleness must be loud.** A key is written in the dialect you read off the
filesystem (`"GET /api/property/[reference]"`), so the drift test can require
every key to name a route that exists, every `planned` key to name one that does
_not_, and no planned key to name a path some other route pattern already serves.
A moved route fails a test the same day. This is why `parseKey` splits a key's
query string off into its own field rather than leaving it in the path: a query
string is not a folder, and every consumer that maps a key onto disk — or onto a
path-to-regexp `source` — has to be able to ignore it.

Every route was then migrated, and the table went from three entries to all of
them. What that bought:

- **The route files are pristine** — not one imports the mock.
- **One opt-in point to keep out of production instead of 26.**
- **It can mock an endpoint nobody has built**, which a wrapper structurally
  cannot: there is no file for it to live in.
- **A dynamic route no longer shadows its siblings.** A rewrite matches on path
  alone, so `/api/property/:reference` captured `search`, `metrics`, `devices`
  and `modules` and served them property detail — a schema-valid answer to the
  wrong question. Registering them put a literal path in front of the dynamic
  one. A route left on the wrapper could not have fixed this, because its
  wrapper was never reached.

The last one is the argument the original design could not have made, and it is
worth stating plainly: **under this interception model a wrapper is not merely a
different style, it is unreachable for any route a registered dynamic key
covers.** Substitutability is what makes that safe to rely on.

Neither is a fast path when `MOCK_API` is unset — both are _no_ path. `withMock`
returns the handler it was given, and `mockRewrites()` returns an empty list, so
nothing is even routed to the mock endpoint.

## What the handler does with a request

`handle(request, endpoint)` is the platform-agnostic seam — a web `Request` in, a
web `Response` out, because that is the one interface Next, Playwright, MSW and
node:http already speak. Adapters are thin by construction.

### Determinism

The seed is `hash(method + path + sorted query)`, making output a pure function
of the request rather than of arrival order. Sorted because `?page=1&limit=20`
and `?limit=20&page=1` are the same request. That is what survives Playwright's
`fullyParallel: true` across three browser projects, and what makes a CI failure
reproduce locally.

`generate` creates its own `Faker` instance per call and holds no module state,
so concurrent calls cannot interfere.

### Pagination that adds up

For an envelope — a root-level `results` array beside `count` / `totalPages` /
`page` — `page` and `limit` size the collection and the tallies are pinned to
match. Total rows are hashed from the path with `page` and `limit` _excluded_, so
page 2 reports the same total as page 1: the size of the data is a property of
the data, not of how you are paging through it. A page past the end is empty
rather than clamped, because that is what the real service does and it is the
case a paging bug lands on.

A collection that is not a root-level field is not a page — lookups and search
results come back whole — and is sized only if the request asked.

### Echoed inputs

A path or query parameter naming a root-level field of the response is reflected
into it, so `/api/property/ABC123` returns the property you asked for. Not wrong
by the schema either way, but it breaks the one invariant a reader checks
without thinking.

### Failing loudly

Generated output is parsed back through its own schema before it leaves. A
mismatch is a 500 carrying the zod issues, because the alternative is finding it
much later as a client-side parse failure with no obvious cause.

## How a value is chosen

Every field is resolved in strict precedence order:

1. an **override** for the field's canonical path
2. a **schema-declared format or closed value set** — `z.email()`, enum, literal
3. a matching **name rule** for the field's name _and_ leaf kind
4. a **generic value** derived from the zod type and its bounds

Schema evidence beats a name guess because a declared format is a fact and a
name is an inference. An override beats everything because it is the caller
stating intent the schema cannot express.

### Canonical paths

Paths address a position in the _schema_, so array indices collapse to `[]` and
one override covers every element:

```
""                            the root
"results"                     a field of a root object
"results[]"                   any element of that array
"results[].address.postcode"  a field of any element
```

An override path that matches nothing throws `UnknownOverridePathError`. This
matters more than it looks: a mistyped path (`statusID` for `statusId`) is
otherwise entirely silent — the field falls through to the name rules, produces
a plausible string, and the output still validates.

The same paths exist as types, in [`core/path-types.ts`](core/path-types.ts):
where the schema is statically known — a registry entry, a `generate()` call —
the typo is a compile error before it is ever a 500, and an editor can complete
the path rather than leaving you to guess it. The walk stops descending after
eight levels and accepts anything deeper unchecked, since a false "no such path"
on a path that really exists would be worse than a missed typo. `counts` is
checked the same way, against array positions only.

### Why name rules exist

Zod carries shape, not intent. Across this application's API surface there are
**24 date fields typed as bare `z.string()`**, and the UI feeds every one to
`DateTime.fromISO`. Without a rule, faker returns a lorem word and every date
cell in the app renders "Invalid DateTime".

Rules declare which **leaf kinds** they may claim, because field names are not
unique across types — `deviceRow.id` is a string while `address.id` is a number.
A name-only rule would put a string into the number field.

Extend rather than replace:

```ts
generate(schema, { rules: [...myRules, ...DEFAULT_RULES] })
```

The shipped set is in [`core/rules.ts`](core/rules.ts): ISO dates, postcodes,
emails, phone numbers, URLs, person names, streets, cities, counties, countries,
business references, identifiers, serials, percentages, coordinates and tallies.

### Nullish fields

`.nullish()` is by far the dominant modifier in this API (219 occurrences), so
its policy is disproportionately visible. Droppable fields are absent **30% of
the time** by default, mixing `null` with an omitted key — both occur in real
upstream payloads and they serialise differently. Set `nullishRate: 0` for a
fully populated response, or `1` to exercise null handling.

A field with `.default()` is never dropped: carrying the value is always valid
and always more useful.

### Array sizing

`count` sizes the **primary collection** — the shallowest array in the schema
(`results` in a `{ results, count, totalPages }` envelope, or the root itself
when the schema is an array). Deeper arrays stay small (0–3 by default), or a
20-row page would carry hundreds of nested entries. Use `counts` to size a
specific array by path.

## Supported zod surface

`string`, `number`, `boolean`, `object`, `array`, `literal`, `enum`, `union`,
`unknown`, plus `optional` / `nullable` / `nullish` / `default`. That is the
complete set measured across this application's API schemas.

Anything else throws `UnsupportedSchemaError` naming the zod type **and the
path** — `map at results[].readings`, not just "unsupported type". The long tail
(`record`, `set`, `tuple`, `discriminatedUnion`, `lazy`, `intersection`, `pipe`)
is deliberately unimplemented until a consumer needs it.

Zod's internal `_zod.def` representation is touched in exactly one file,
`core/zod-def.ts`, so a zod upgrade breaks one place.

## A note on dependencies

`@faker-js/faker` is a **dev** dependency, and the production build proves it can
be. Two independent mechanisms keep the generator out:

- `next.config.ts` sets `turbopack.resolveAlias` to swap `@mock/adapters/next`
  and `@mock/adapters/next-registry` for stubs when `NODE_ENV === "production"`.
  Turbopack never _reads_ the real adapters, so nothing they import can be
  emitted into a chunk. Resolution, not dead-code elimination: no bundler
  cleverness to trust.
- The `Dockerfile` runs `npm ci` → `npm run build` → `npm prune --omit=dev`, so
  faker is present when the build needs it and gone from the final image.

Check it rather than believe it:

```sh
npm run build && npm run verify:no-mock-in-build
```

That script scans every `.js` under `.next/server` for generator and faker
identifiers. It currently reports **0 references across 396 server chunks** — and
now has less to catch than it used to, since no route file imports the mock at
all.

Two things it deliberately does not flag. The literal string `@faker-js/faker`
appears in a production build because Sentry inlines `package.json` for its
module context; that is a version string, not code. And
`src/app/api/mock/[...path]/route.ts` still ships — as a 351-byte stub that can
only 404, with no rewrite pointing at it.

## Not yet built

- **An adapter for Nest.** `handle` is already the right shape; it is a dozen
  lines when someone needs it. (Playwright and MSW are built: see
  [`packages/mocker-playwright`](../packages/mocker-playwright/README.md) and
  [`packages/mocker-storybook`](../packages/mocker-storybook/README.md).)
- **A bare request to a query-constrained route.** `/api/property/devices` with
  no `propertyReference` should reach the real handler and get its 400. It does
  not: the key's `has` condition correctly declines the request, but the
  unconditional `/api/property/:reference` rewrite catches it on the way past and
  answers with property detail. Fixing it properly means teaching `mockRewrites`
  to emit a narrower source for a dynamic key, or the endpoint to decline rather
  than fall back — neither is worth doing until a real request depends on it,
  since the app always sends the parameter.
- **Request bodies through the registry.** The adapter rebuilds the request
  without one, because `handle` never reads it. If per-endpoint input parsing is
  ever added, the registry path would diverge from the wrapper for POSTs until
  the body is threaded through — there is a `TODO(WP-412)` at the site.
- **Input parsing** (400 with zod issues) per endpoint. Deliberately absent: no
  route declares an input schema, so it would be dead code, and the real handler
  it replaces already does whatever parsing it does.
- **Stateful writes.** A POST returns a generated identity; it does not remember
  anything, so a create followed by a list will not show the created row.
