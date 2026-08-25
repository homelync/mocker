/**
 * The one thing the browser half and the node half must agree on.
 *
 * Its own module, importing nothing, because the two sides of the fixture store
 * live on opposite ends of the boundary this package is shaped by: `fixtures.ts`
 * is bundled into the preview and may not reach a node builtin, `vite.ts` runs
 * in Storybook's config load and must not drag `@homelync/mocker` — and faker
 * with it — into `main.ts`. A constant shared through either of them would break
 * one or the other, so it is shared through neither.
 */

/**
 * Where the Vite plugin mounts the fixture store.
 *
 * Double-underscored in the way Vite's own internal routes are, so it cannot
 * collide with an API a consumer is mocking. A fixture is addressed by appending
 * the path {@link fixturePath} derives:
 * `/__mocker/fixture/GET/api/devices/3f9a1c2d.json`.
 */
export const FIXTURE_ROUTE: string = '/__mocker/fixture'
