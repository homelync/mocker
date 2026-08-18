# @magicspon/mocker-storybook

Storybook adapter for
[`@magicspon/mocker`](https://github.com/magicspon/mocker/tree/main/packages/mocker):
answer a component's requests with Mock Service Worker, generated from the zod
schemas your API already responds with.

```sh
npm install --save-dev @magicspon/mocker-storybook msw msw-storybook-addon
npx msw init public --save
```

`@magicspon/mocker` comes with it. `msw` (v2) and `zod` (v4) are peers. ESM only.

**No Storybook dependency of its own** — these are plain MSW handlers, so the
same call works in a Vitest browser test or a bare `setupWorker`, and nothing
here breaks when Storybook's addon API moves.

## Quickstart

Register the addon, then hand it your registry:

```ts
// .storybook/main.ts
export default {
  framework: '@storybook/react-vite',
  addons: ['msw-storybook-addon'],
  // MSW intercepts from a service worker; it has to be served.
  staticDirs: ['../public'],
}
```

```ts
// .storybook/preview.ts
import { definePreview } from '@storybook/react-vite'
import addonMsw from 'msw-storybook-addon'
import { mockerHandlers } from '@magicspon/mocker-storybook'
import { registry } from '../src/mocks/registry'

export default definePreview({
  addons: [addonMsw()],
  beforeEach({ msw }) {
    msw.use(...mockerHandlers(registry))
  },
})
```

```ts
// src/mocks/registry.ts — the endpoints, keyed as a URL reads
import type { MockRegistry } from '@magicspon/mocker'

export const registry = {
  'GET /api/property/[reference]': {
    schema: () => import('./schemas').then((m) => m.propertySchema),
  },
  'GET /api/devices?propertyReference=[reference]': {
    schema: () => import('./schemas').then((m) => m.deviceListSchema),
  },
} satisfies MockRegistry
```

Every story of every component now answers from the schemas. A story that
fetches needs no fixture, no handler and no setup of its own:

```ts
export const Default = meta.story({})
```

It is the same table the Next adapter takes, in the same dialect. A component
sees identical bytes in Storybook and in `next dev`, because both end in the
same `handle()`.

## One story, one endpoint, different behaviour

`mockerHandler` overrides a single endpoint for the length of one story. MSW
gives a story's handlers precedence, so everything else still answers from the
registry — a story about an empty table does not have to describe every other
request the page makes.

```ts
import { mockerHandler } from '@magicspon/mocker-storybook'

const DEVICES = 'GET /api/devices?propertyReference=[reference]'

export const NoDevices = meta.story({
  beforeEach({ msw }) {
    msw.use(mockerHandler(registry, DEVICES, { count: 0 }))
  },
})

export const Loading = meta.story({
  beforeEach({ msw }) {
    msw.use(mockerHandler(registry, DEVICES, { delayMs: 60_000 }))
  },
})

export const ServerError = meta.story({
  beforeEach({ msw }) {
    msw.use(mockerHandler(registry, DEVICES, { status: 500 }))
  },
})
```

| Option    | Does                                                              |
| --------- | ----------------------------------------------------------------- |
| `count`   | sizes the primary collection — a one-row table, an empty state    |
| `delayMs` | holds the response, so a loading state can be looked at           |
| `status`  | answers with this status instead of the endpoint's own            |
| `seed`    | different data for the same request, so two stories are not one   |
| `baseUrl` | where the API is mounted, when it is not the preview's own origin |

`generate` takes the same options a registry entry takes, checked against **this
entry's** schema — so a canonical path is a completion, and a path the schema
does not declare fails to compile on the line that carries it:

```ts
export const AllOffline = meta.story({
  beforeEach({ msw }) {
    msw.use(
      mockerHandler(registry, DEVICES, {
        count: 4,
        generate: { overrides: { 'results[].statusId': () => 'OFFLINE' } },
      }),
    )
  },
})
```

## Components that take props

Nothing to intercept, so nothing is. `mockLoader` generates from the same
schema, seeded from the story id — the same data on every reload, so a snapshot
is stable, and different data in every story, so two of them are not the same
picture.

```tsx
import { mockLoader } from '@magicspon/mocker-storybook'

const meta = preview.meta({
  component: PropertyCard,
  loaders: [mockLoader({ property: propertySchema })],
  render: (_args, { loaded }) => <PropertyCard property={loaded.property} />,
})

export const Default = meta.story({})
export const AnotherProperty = meta.story({})
```

A second argument takes any generation options — `nullishRate: 0` to fill the
optional fields, a `locale`, an override. Pass `seed` to pin the data to
something other than the story id, at the cost of two stories sharing it.

## What the handlers do

One handler per distinct method and path, each of which hands the request back
to the registry rather than answering from its own key. Three consequences worth
knowing:

- **Handler order does not matter.** MSW matches on path alone, so
  `/api/property/:reference` will happily match `/api/property/search`; the
  registry then picks the more specific key regardless of which handler was
  reached first.
- **A miss falls through** rather than answering 404. A request whose query
  failed one key's conditions can still be served by another, and your own
  handlers for the same path are not shadowed.
- **Data is a function of the request.** The seed is a hash of method, path and
  sorted query, so a story shows the same rows every reload, and `?page=2`
  agrees with `?page=1` about the total.

## Outside Storybook

The handlers are ordinary MSW, so `setupWorker(...mockerHandlers(registry))`
works anywhere a browser does. In Node — `setupServer`, for a Vitest suite —
MSW resolves a relative handler path against `location.href`, which Node does
not have: pass `baseUrl` there, or the handlers match nothing.

```ts
const server = setupServer(
  ...mockerHandlers(registry, { baseUrl: 'http://localhost:3000' }),
)
```

## Further reading

Recipes, the control headers, the registry design and the reasoning behind each
decision are in
[`docs/mocking-guide.md`](https://github.com/magicspon/mocker/blob/main/docs/mocking-guide.md).

MIT.
