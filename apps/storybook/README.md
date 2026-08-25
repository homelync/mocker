# Storybook example

A Storybook that runs against no backend at all, using
[`@homelync/mocker-storybook`](../../packages/mocker-storybook).

```sh
pnpm storybook        # from the repo root
```

There is no `MOCK_API` flag here and nothing to turn on: a preview _is_ the
mock, so the handlers are always installed.

## What to look at

| File                                      | Shows                                                     |
| ----------------------------------------- | --------------------------------------------------------- |
| `src/mocks/registry.ts`                   | the endpoint table — the same one the Next example writes |
| `.storybook/preview.ts`                   | the whole setup: one `msw.use(...mockerHandlers(...))`    |
| `.storybook/main.ts`                      | the one line `fixed: true` needs — the fixture store      |
| `src/components/DeviceTable.stories.tsx`  | a fetching component, in every state it has               |
| `src/components/PropertyCard.stories.tsx` | a props component, filled by `mockLoader`                 |

`DeviceTable` fetches for itself and parses the response with the very schema
the mock generated it from — so the preview is a real check on the contract,
not a picture of some data. Its stories cover the empty state, a held loading
state, a 500 and one pinned field, none of which required touching the
component — and a last one, `Fixed`, answered from a JSON file on disk that you
can edit and commit.

## The point of the registry

The table in `src/mocks/registry.ts` is written in the same dialect as
`apps/next/src/mocks/registry.ts`, with the same lazy schema thunks.
`mockerHandlers()` turns it into MSW handlers here; `withMocker()` turns it into
rewrites there. Both end in the same `handle()`, so a component sees identical
bytes either way — which is what makes a story a trustworthy rehearsal of the
app.

## The service worker

`public/mockServiceWorker.js` is committed, as MSW expects, and `staticDirs` in
`.storybook/main.ts` is what serves it. It must match the installed msw exactly;
msw's postinstall keeps it in step, which is why `msw` is listed in
`onlyBuiltDependencies` in `pnpm-workspace.yaml`.
