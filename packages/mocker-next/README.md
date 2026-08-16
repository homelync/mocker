# @magicspon/mocker-next

Next.js App Router adapter for
[`@magicspon/mocker`](https://github.com/magicspon/mocker/tree/main/packages/mocker):
run the app against fabricated data generated from the zod schemas your routes
already respond with.

```sh
npm install --save-dev @magicspon/mocker-next
```

`@magicspon/mocker` comes with it. `next` (15 or 16) and `zod` (v4) are peers.
ESM only, Node ≥ 20.

## Quickstart

Set up the config wrapper once, declare which endpoints exist, and run the dev
server with `MOCK_API=1`.

```ts
// next.config.ts
import type { NextConfig } from 'next'
import { withMocker } from '@magicspon/mocker-next/config'
import { registry } from './src/mocks/registry'

const nextConfig: NextConfig = {
  // ...whatever you already had, rewrites included
}

export default withMocker({ registry }, nextConfig)
```

```ts
// src/mocks/registry.ts — the endpoints, keyed as the App Router reads them
import type { MockRegistry } from '@magicspon/mocker/config'

export const registry = {
  'GET /api/property/[reference]': {
    schema: () => import('./schemas').then((m) => m.propertySchema),
  },
  'GET /api/property/devices?propertyReference=[reference]': {
    schema: () => import('./schemas').then((m) => m.deviceListSchema),
  },
} satisfies MockRegistry
```

```ts
// src/app/api/mock/[...path]/route.ts — one endpoint serves every mocked route
import { serveRegistryRoute } from '@magicspon/mocker-next'
import type { NextRequest } from 'next/server'
import { registry } from '@/mocks/registry'

const handler = async (
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) => serveRegistryRoute(request, (await params).path, registry)

export { handler as GET, handler as POST }
```

```sh
MOCK_API=1 npm run dev
```

Every registered route now answers from its schema — no backend, no network.
`MOCK_API=property` mocks only the paths whose names contain `property`;
unset, nothing is mocked and the config wrapper is inert.

### Or: one route at a time

A route that would rather not be listed in a table can declare its own mock in
place, wrapped around whatever middleware it already has:

```ts
// src/app/api/property/[reference]/route.ts
import { withMock } from '@magicspon/mocker-next'

export const GET = withMock(
  propertySchema,
  withAuth(async (request, ctx) => {
    // ...the real handler, untouched
  }),
)
```

Both mechanisms end in the same `handle()` and produce the same bytes. The
wrapper travels with the file, so it cannot go stale when a route moves; the
registry keeps mock declarations out of route files entirely, and can describe
an endpoint nobody has built yet.

## Entry points

| Entry                               | For                 | Exports                                                                  |
| ----------------------------------- | ------------------- | ------------------------------------------------------------------------ |
| `@magicspon/mocker-next`            | route files         | `withMock`, `serveRegistryRoute`                                         |
| `@magicspon/mocker-next/config`     | `next.config.ts`    | `withMocker`, `mockRewrites`, `toRouteDirectory`, `MOCK_ENDPOINT_PREFIX` |
| `@magicspon/mocker-next/production` | nothing — see below | the stub the adapter resolves to in a production build                   |

**Import `/config` in `next.config.ts`, never the package root.** Next evaluates
its config with its own loader, unbundled, before any build graph exists, so
tree-shaking cannot protect it: importing the root there would load
`@faker-js/faker` on every `next dev`. Nothing reachable from `/config` imports
`zod` or faker at runtime, and a test walks the real import graph to prove it.

## What `withMocker` does

Two things, both of which you would otherwise write by hand:

- **Rewrites.** `mockRewrites(registry)` is merged into `rewrites.beforeFiles`,
  so a registered route is intercepted before its own `route.ts` is matched. An
  existing `rewrites` — array, object or function — survives; the mock's rules
  go in front of it.
- **Resolution.** In a production build it points `turbopack.resolveAlias` at
  `@magicspon/mocker-next/production`, so every route file importing the adapter
  resolves to a stub that returns its handler and 404s. The generator, and faker
  behind it, cannot be emitted into a chunk — the bundler never reads the module
  that imports them.

That second half is why the mock is _absent_ from production rather than
disabled there. `mockRewrites` also emits nothing when `NODE_ENV=production`,
whatever `MOCK_API` says, so a production build has no path to the mock endpoint
either.

The alias is written to `turbopack.resolveAlias`, which needs Next 15.3 or later
and is not read by a webpack build. A webpack build still serves no mock — the
rewrites are empty and `withMock` returns its handler — but the adapter's code is
bundled rather than resolved away.

## Registry keys

A key is `"METHOD /path"` written exactly as the App Router reads it, optionally
followed by the query parameters a request must carry:

| Written                          | Matches                                           |
| -------------------------------- | ------------------------------------------------- |
| `GET /api/property/[reference]`  | the dynamic segment, bound to `reference`         |
| `?propertyReference=[reference]` | present and non-empty; value bound to `reference` |
| `?mode=summary`                  | present and exactly `summary`                     |
| `?ref`                           | present, any value                                |

A bound value is echoed into the response field of its own name, so
`?propertyReference=ABC123` fills a schema whose field is called `reference`.
Unlisted parameters (`page`, `limit`, filters) are ignored, so adding a sort to
the UI does not invalidate a key.

`toRouteDirectory(pattern)` maps a key back to its directory under
`src/app/api`, which is how a host test proves its registry has not drifted from
the routes on disk.

## Further reading

Recipes, the control headers, the registry design and the reasoning behind each
decision are in
[`docs/mocking-guide.md`](https://github.com/magicspon/mocker/blob/main/docs/mocking-guide.md).

MIT.
