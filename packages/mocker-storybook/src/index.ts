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
 * One entry point, and no `./config` sibling: a Storybook preview *is* the mock,
 * so there is no production build the generator has to be kept out of, and
 * `.storybook/main.ts` never imports this package at all. The two constraints
 * the other packages are shaped by simply do not apply here.
 *
 * What does apply is the browser: this runs inside the preview bundle, so
 * nothing here may reach a node builtin, and nothing here imports `storybook`.
 * These are plain MSW handlers — the same call works in a Vitest browser test —
 * and `package-boundary.test.ts` asserts both.
 */
export { mockerHandler, mockerHandlers } from './handlers'
export type { MockerEndpointOptions, MockerHandlerOptions } from './handlers'
export { mockLoader } from './loader'
export type { MockLoaderResult, StoryIdentity } from './loader'
