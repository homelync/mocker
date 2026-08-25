# @homelync/mocker

Generate fake data from a zod schema, and serve it over HTTP.

Two halves. A **generator** turns a schema into plausible data — deterministic
for a given seed, and shaped by field names, so `createdAt` is a date and
`email` is an email. A **handler** turns a `Request` into a `Response`, so an
adapter for a framework is thin.

```sh
npm install --save-dev @homelync/mocker zod
```

ESM only, Node ≥ 20. `zod` is a **peer** dependency (v4): you pass your own
schemas in, and a second copy of zod in the tree breaks the internal reads the
generator relies on.

## Quickstart

```ts
import { z } from 'zod'
import { generate } from '@homelync/mocker/core'

const property = z.object({
  reference: z.string(),
  city: z.string(),
  bedrooms: z.number().int(),
  createdAt: z.string(),
})

generate(property, { seed: 1 })
// { reference: "FP0A536C", city: "Old Doyle", bedrooms: 878,
//   createdAt: "2023-02-04T03:39:21.201Z" }
```

The same seed gives the same object, every time and in every process — no
snapshot to update, and a bug you saw is a bug you can reproduce.

Serving it is one more call:

```ts
import { handle } from '@homelync/mocker'

// In any runtime with `Request`/`Response`: a route handler, an MSW resolver,
// a test server.
const response = await handle(request, { output: property })
```

`handle` seeds from the request itself — method, path and sorted query — so the
same request answers with the same data and a different one does not.

## Entry points

| Entry                     | For                                         | Loads                    |
| ------------------------- | ------------------------------------------- | ------------------------ |
| `@homelync/mocker`        | a runtime: generation, `handle`, the flag   | `zod`, `@faker-js/faker` |
| `@homelync/mocker/core`   | the generator alone — Storybook, MSW, tests | `zod`, `@faker-js/faker` |
| `@homelync/mocker/config` | a **bundler config**                        | nothing but itself       |

`/core` is the whole generator with no `process`, no HTTP and no registry, so it
works in a browser runtime. `/config` is the opposite trade: it carries the flag
and the registry key algebra and nothing that could pull faker in.

## The rule the layout exists for

**Never import `@homelync/mocker` or `/core` from a bundler config.**

A config file — `next.config.ts` above all — is evaluated by the framework's own
loader, unbundled, before any build graph exists. Tree-shaking cannot protect
it. Importing the root there loads `@faker-js/faker` on every `next dev`, and
can emit the generator into a production build that must not contain it —
silently, with no error anywhere.

`@homelync/mocker/config` is the surface that is safe there. Nothing reachable
from it imports `zod` or `@faker-js/faker` at runtime, and a test in this
package walks the real import graph to prove it on every CI run.

## Controls, per request

A request can bend what it gets back, which is how a UI state is reproduced
without touching any code:

| Header          | Effect                                                 |
| --------------- | ------------------------------------------------------ |
| `x-mock-status` | answer with this status — `>= 400` returns `{ error }` |
| `x-mock-delay`  | wait this many milliseconds first                      |
| `x-mock-count`  | size the primary collection, overriding `limit`        |
| `x-mock-seed`   | pick a different dataset for the same request          |

Every mocked response carries `x-mock: 1` and the `x-mock-seed` it used, so a
screenshot can be turned back into the exact request that produced it.

## Shaping what comes back

Generated values are plausible but arbitrary. Two options bend them, and they
answer different questions:

```ts
import { DEFAULT_RULES, generate } from '@homelync/mocker/core'

generate(deviceListSchema, {
  // This field, in this schema. Keyed by canonical path, `[]` covering every
  // element, and checked against the schema it pins.
  overrides: {
    'results[].statusId': ({ faker }): string =>
      faker.helpers.arrayElement(['GOOD', 'WARNING', 'FAULT', 'OFFLINE']),
  },
  // Every field with this name, of this leaf kind. Replaces the shipped set,
  // so spread it back in to extend rather than replace.
  rules: [
    {
      name: 'occurred-at',
      match: /^occurredAt$/,
      types: ['string'],
      gen: ({ faker }): string => faker.date.recent().toISOString(),
    },
    ...DEFAULT_RULES,
  ],
})
```

A registry entry takes the same options under `options`, where they apply to
every request to that endpoint. The full guide — precedence, type checking, and
what each mechanism cannot reach — is
[`docs/overrides-and-rules.md`](https://github.com/homelync/mocker/blob/main/docs/overrides-and-rules.md).

## The `MOCK_API` flag

`isMockConfigured()` and `isMockEnabledFor(path)` read one environment variable
so that every opt-in mechanism agrees on what it means. `MOCK_API=1` enables
everything opted in; a comma-separated list (`MOCK_API=reports/devices,property`)
enables only the paths it names, so one slow endpoint can be faked while the
rest hit the real services. It is off in production regardless.

## With Next.js

[`@homelync/mocker-next`](https://github.com/homelync/mocker/tree/main/packages/mocker-next)
is the App Router adapter: a `withMock` wrapper for a route handler, a registry
of endpoints served by rewrites, and a `next.config.ts` wrapper that keeps all
of it out of the production build.

## Further reading

The long-form guide — recipes, the registry design, the supported zod surface,
and why each decision went the way it did — is
[`docs/mocking-guide.md`](https://github.com/homelync/mocker/blob/main/docs/mocking-guide.md).
[`docs/overrides-and-rules.md`](https://github.com/homelync/mocker/blob/main/docs/overrides-and-rules.md)
covers shaping a registry entry's data on its own.

MIT.
