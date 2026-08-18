/**
 * `@magicspon/mocker-storybook` — the same mock registry, served into Storybook
 * by Mock Service Worker.
 *
 * Two ways in, because a component gets its data one of two ways:
 *
 * - {@link mockerHandlers} / {@link mockerHandler} — the component fetches, and
 *   MSW answers from the registry. Preview-wide, or bent per story.
 * - {@link mockLoader} — the component takes props, and the story generates them
 *   from a schema, seeded so they are stable across reloads.
 *
 * No `./config` sibling: a Storybook preview *is* the mock, so there is no
 * production build the generator has to be kept out of. The constraint that
 * shapes the other two packages does not apply here.
 *
 * What does apply is the browser: this runs inside the preview bundle, so
 * nothing here may reach a node builtin, and nothing here imports `storybook`.
 * These are plain MSW handlers — the same call works in a Vitest browser test —
 * and `package-boundary.test.ts` asserts both.
 *
 * There is a second entry, `@magicspon/mocker-storybook/vite`, for exactly one
 * feature: `fixed` answers from JSON on disk, and a browser has no disk. That
 * entry is the node half, loaded by `.storybook/main.ts` and never by the
 * preview — which is why it is an entry rather than an export from this one.
 */
export { mockerHandler, mockerHandlers } from './handlers'
export type { MockerEndpointOptions, MockerHandlerOptions } from './handlers'
export { mockLoader } from './loader'
export type { MockLoaderResult, StoryIdentity } from './loader'
export { MOCK_FIXTURE_HEADER } from './fixed'
export { FIXTURE_ROUTE } from './route'
