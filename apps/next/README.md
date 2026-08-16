<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Example app

A Next.js App Router app that consumes `@magicspon/mocker` and
`@magicspon/mocker-next` from the workspace, the way a real consumer would. It
is not published, and nothing in `packages/` depends on it.

There is **no backend**. Every real handler answers 501; the interesting path is
the mocked one.

```sh
pnpm --filter @magicspon/next-example dev:mock   # MOCK_API=1 next dev
```

Then:

```sh
curl -s localhost:3000/api/property/ABC123 | jq
```

Without `MOCK_API`, `pnpm --filter @magicspon/next-example dev` runs the same
app with no mock anywhere in it — the rewrites are empty and `withMock` returns
the handler it was given.

## The endpoints

| Route                                    | Mechanism  | What it demonstrates                                       |
| ---------------------------------------- | ---------- | ---------------------------------------------------------- |
| `GET /api/property/[reference]`          | registry   | a dynamic segment echoed into the response                 |
| `GET /api/devices?propertyReference=…`   | registry   | a query constraint, pagination, pinned fields              |
| `POST /api/property/[reference]/notes`   | registry   | a non-200 success status                                   |
| `GET /api/property/[reference]/timeline` | registry   | a `planned` endpoint — no `route.ts` exists for it         |
| `GET /api/user/[id]`                     | `withMock` | the wrapper, outside an auth middleware it therefore skips |

The first four are declared in [`src/mocks/registry.ts`](src/mocks/registry.ts)
and served by [`src/app/api/mock/[...path]/route.ts`](src/app/api/mock/[...path]/route.ts);
their own route files know nothing about the mock. The last declares itself in
place, and is deliberately absent from the registry — a route declared both ways
would have its wrapper options silently ignored by the rewrite.

## Things worth trying

```sh
BASE=localhost:3000

# The property you asked for, not a stranger with the right shape.
curl -s $BASE/api/property/ABC123 | jq .reference

# Page 2 of 35, and the totals agree with the page.
curl -s "$BASE/api/devices?propertyReference=ABC123&page=2&limit=3" \
  | jq '{rows: (.results|length), count, page, totalPages}'

# Same request, same bytes — every time, in any process.
curl -s $BASE/api/property/ABC123 | shasum
curl -s $BASE/api/property/ABC123 | shasum

# Empty state, error state, slow state.
curl -s -H 'x-mock-count: 0'    "$BASE/api/devices?propertyReference=ABC123" | jq .results
curl -s -H 'x-mock-status: 500' "$BASE/api/devices?propertyReference=ABC123" | jq
curl -s -H 'x-mock-delay: 3000' "$BASE/api/property/ABC123" -o /dev/null -w '%{time_total}s\n'

# A verb the registry does not declare, on a path it captures.
curl -s -X DELETE $BASE/api/property/ABC123 | jq .error

# The mock is skipped: no `propertyReference`, so the rewrite declines and the
# real handler answers with its own 400.
curl -s $BASE/api/devices | jq

# The wrapper route needs no credentials while mocked, and 401s without the flag.
curl -s $BASE/api/user/u-42 | jq

# Only the devices endpoint, everything else real:
#   MOCK_API=devices pnpm --filter @magicspon/next-example dev
```

Every mocked response carries `x-mock: 1` and an `x-mock-seed` naming the exact
input that produced it. The full set of controls is in
[`docs/mocking-guide.md`](../../docs/mocking-guide.md).

## The production guarantee, checked

`withMocker()` points `turbopack.resolveAlias` at
`@magicspon/mocker-next/production` when `NODE_ENV=production`, so a production
build never reads the real adapter and cannot emit the generator or faker into a
chunk. This app checks that rather than believing it:

```sh
pnpm --filter @magicspon/next-example build
pnpm --filter @magicspon/next-example verify:no-mock-in-build
# ✓ no mock or faker references across 63 server chunks
```

The same scan run against the _dev_ build finds faker in two chunks, which is
how you know it is looking in the right place.

## Notes for anyone copying this

- `next.config.ts` imports `@magicspon/mocker-next/config`, never the package
  root. Next evaluates its config unbundled, before any build graph exists, so
  importing the root there would load faker on every `next dev`.
- `src/mocks/registry.ts` is imported _by that config_, so it declares schemas as
  thunks and uses `import type` for everything else. Its dynamic imports are
  relative rather than `@/`-aliased: the config loader resolves it before the
  tsconfig `paths` map is in play.
- `transpilePackages` is here only because the workspace packages resolve to
  their TypeScript sources during development. Installing from npm, you need
  neither entry.
