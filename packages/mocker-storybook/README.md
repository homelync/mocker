# @homelync/mocker-storybook

Storybook adapter for
[`@homelync/mocker`](https://github.com/homelync/mocker/tree/main/packages/mocker):
answer a component's requests with Mock Service Worker, generated from the zod
schemas your API already responds with.

```sh
npm install --save-dev @homelync/mocker-storybook msw msw-storybook-addon
npx msw init public --save
```

`@homelync/mocker` comes with it. `msw` (v2) and `zod` (v4) are peers. `vite` is
an optional peer, needed only for [fixed responses](#fixed-responses-from-a-file-on-disk).
ESM only.

**No Storybook dependency of its own** — these are plain MSW handlers, so the
same call works in a Vitest browser test or a bare `setupWorker`, and nothing
here breaks when Storybook's addon API moves.

## Quickstart

Register the addon, then hand it your registry:

```ts
// .storybook/main.ts
export default {
  framework: "@storybook/react-vite",
  addons: ["msw-storybook-addon"],
  // MSW intercepts from a service worker; it has to be served.
  staticDirs: ["../public"],
};
```

```ts
// .storybook/preview.ts
import { definePreview } from "@storybook/react-vite";
import addonMsw from "msw-storybook-addon";
import { mockerHandlers } from "@homelync/mocker-storybook";
import { registry } from "../src/mocks/registry";

export default definePreview({
  addons: [addonMsw()],
  beforeEach({ msw }) {
    msw.use(...mockerHandlers(registry));
  },
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

Every story of every component now answers from the schemas. A story that
fetches needs no fixture, no handler and no setup of its own:

```ts
export const Default = meta.story({});
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
import { mockerHandler } from "@homelync/mocker-storybook";

const DEVICES = "GET /api/devices?propertyReference=[reference]";

export const NoDevices = meta.story({
  beforeEach({ msw }) {
    msw.use(mockerHandler(registry, DEVICES, { count: 0 }));
  },
});

export const Loading = meta.story({
  beforeEach({ msw }) {
    msw.use(mockerHandler(registry, DEVICES, { delayMs: 60_000 }));
  },
});

export const ServerError = meta.story({
  beforeEach({ msw }) {
    msw.use(mockerHandler(registry, DEVICES, { status: 500 }));
  },
});
```

| Option    | Does                                                              |
| --------- | ----------------------------------------------------------------- |
| `count`   | sizes the primary collection — a one-row table, an empty state    |
| `delayMs` | holds the response, so a loading state can be looked at           |
| `status`  | answers with this status instead of the endpoint's own            |
| `seed`    | different data for the same request, so two stories are not one   |
| `baseUrl` | where the API is mounted, when it is not the preview's own origin |
| `fixed`   | answers from a JSON file on disk — see below                      |

`generate` takes the same options a registry entry takes, checked against **this
entry's** schema — so a canonical path is a completion, and a path the schema
does not declare fails to compile on the line that carries it:

```ts
export const AllOffline = meta.story({
  beforeEach({ msw }) {
    msw.use(
      mockerHandler(registry, DEVICES, {
        count: 4,
        generate: { overrides: { "results[].statusId": () => "OFFLINE" } },
      }),
    );
  },
});
```

## Fixed responses, from a file on disk

`fixed: true` answers from a JSON file instead of generating per request, and
writes the file from the generated data the first time it is asked for.

Generation is already deterministic, so this is not about stability. It is about
being able to **edit** the answer: the generator gives you plausible data, and a
fixture gives you the specific data — the device name the story is actually
about, the one address the screenshot is meant to show — reviewable in a diff
and the same for everybody who checks the repo out.

> Not to be confused with an `overrides` entry, which pins one **field** while
> the rest of the response is still generated. `fixed` freezes the **whole
> response**, and does it as a file rather than as code.

A preview is a browser and has no disk, so the store lives on Storybook's dev
server. One line in `.storybook/main.ts`:

```ts
import { mockerFixtures } from "@homelync/mocker-storybook/vite";

export default defineMain({
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["msw-storybook-addon"],
  viteFinal: (config) => ({
    ...config,
    plugins: [...(config.plugins ?? []), mockerFixtures()],
  }),
});
```

Then ask for it, per story or preview-wide:

```ts
// one story
export const Fixed = meta.story({
  beforeEach({ msw }) {
    msw.use(mockerHandler(registry, DEVICES, { count: 3, fixed: true }));
  },
});

// or every endpoint, in .storybook/preview.ts
msw.use(...mockerHandlers(registry, { fixed: true }));
```

Run the story once and the file appears:

```
mocks/
  GET/
    api/
      devices/
        3f9a1c2d.json        ← ?propertyReference=ABC123
        b71e04aa.json        ← the same endpoint, count: 3
```

Open it, change what the story is actually about, commit it. The next run serves
your edit.

The name is derived from the request — method, path, sorted query, and the
`seed` / `count` / `status` the story set — so it is the same on every machine,
does not move when a registry key is renamed, and gives two stories of one
endpoint two files rather than one they fight over. `mockerFixtures({ dir })`
puts them somewhere other than `mocks`.

| Situation                         | What happens                                 |
| --------------------------------- | -------------------------------------------- |
| No file yet                       | generate, answer, write the file             |
| File exists                       | serve it verbatim — your formatting survives |
| File no longer matches the schema | **500 naming the file**, with the zod issues |
| `status: 500` and other failures  | never written; served as usual               |
| Plugin missing, or a static build | one console warning, then generate as usual  |

The two that are decisions rather than mechanics:

- **A stale file is a 500, not a silent regeneration.** Regenerating would
  destroy the edit that was the whole point, and serving it unchecked would move
  the failure into the component, where it looks like a bug in the component.
- **A requested failure is never stored.** One story wanting a 500 must not make
  the error that endpoint's permanent answer for every other story.

Responses carry `x-mock-fixture: GET/api/devices/3f9a1c2d.json`, so devtools
tells you which file answered.

## Components that take props

Nothing to intercept, so nothing is. `mockLoader` generates from the same
schema, seeded from the story id — the same data on every reload, so a snapshot
is stable, and different data in every story, so two of them are not the same
picture.

```tsx
import { mockLoader } from "@homelync/mocker-storybook";

const meta = preview.meta({
  component: PropertyCard,
  loaders: [mockLoader({ property: propertySchema })],
  render: (_args, { loaded }) => <PropertyCard property={loaded.property} />,
});

export const Default = meta.story({});
export const AnotherProperty = meta.story({});
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
  ...mockerHandlers(registry, { baseUrl: "http://localhost:3000" }),
);
```

### Under Playwright

If your app can start a worker itself, these handlers mock it there too, and
Playwright needs no adapter at all:

```ts
// the app's own entry, behind a flag
setupWorker(...mockerHandlers(registry)).start();
```

Note that this is `setupWorker`, in the browser — **not** `setupServer` in the
test process. Under Playwright the browser is a separate process, and almost
nothing it fetches goes through Node's http stack, so `setupServer` would see
none of it.

The trade is that `mockServiceWorker.js` has to be served by the app under test
and registered before the first navigation, and that every test sees the same
data. When either of those is a problem — a built app, a cross-origin API, or one
test needing an empty list while the next needs three rows —
[`@homelync/mocker-playwright`](https://github.com/homelync/mocker/tree/main/packages/mocker-playwright)
intercepts at the browser context instead, from the same registry.

## Further reading

Recipes, the control headers, the registry design and the reasoning behind each
decision are in
[`docs/mocking-guide.md`](https://github.com/homelync/mocker/blob/main/docs/mocking-guide.md).
Pinning a field by path, and teaching the generator what a field name means, are
in [`docs/overrides-and-rules.md`](https://github.com/homelync/mocker/blob/main/docs/overrides-and-rules.md).

MIT.
