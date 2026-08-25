---
"@homelync/mocker-storybook": minor
---

Add `@homelync/mocker-storybook`: the Storybook adapter, over Mock Service
Worker.

`mockerHandlers(registry)` turns the same endpoint table the Next adapter takes
into MSW handlers, so a component fetching in a story sees the bytes it sees in
`next dev`. `mockerHandler(registry, key, options)` bends one endpoint for the
length of one story — an empty collection, a held response, a 500, an override
checked against that entry's own schema — and everything else still answers from
the registry. For components that take props rather than fetching, `mockLoader`
generates from a schema seeded off the story id: stable across reloads,
different in every story.

The package depends on `msw` and on nothing from Storybook, so the handlers work
just as well in a Vitest browser test or a bare `setupWorker`.
