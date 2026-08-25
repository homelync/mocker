/**
 * `@homelync/mocker-playwright` — a mock registry, served to a browser context.
 *
 * One entry, and no sibling to it. The other adapters split themselves around a
 * config file evaluated unbundled (`next.config.ts`, `.storybook/main.ts`) or a
 * production build a mock must be absent from; a Playwright run has neither. It
 * is node from top to bottom, so the fixture store is `readFile` and `rename` in
 * this process — no plugin, no HTTP hop, no shared route constant.
 *
 * Two ways in, and the difference is an after-phase:
 *
 * - {@link mockerTest} — Playwright fixtures. Installs the mock for every test,
 *   and **fails a test that had to write a fixture or met an undeclared
 *   endpoint**. Use this one.
 * - {@link mockerRoutes} — the same mock on a `BrowserContext` you hand it, for
 *   a script driving `playwright-core`. Read `controller.misses` yourself;
 *   {@link describeMisses} turns them into the message the fixture would throw.
 *
 * Playwright itself is never imported at runtime — only its types — which is
 * what keeps both peers optional and this package building when the runner API
 * moves.
 */

export { mockerRoutes } from './routes'
export type { MockerController } from './routes'
export { mockerTest } from './test-fixtures'
export type {
  MockerFixtureOptions,
  MockerTestConfig,
  MockerTestFixtures,
} from './test-fixtures'
export { describeMisses } from './miss'
export type { MockerMiss } from './miss'
export { MOCK_FIXTURE_HEADER } from './fixed'
export type { MockerEndpointOptions, MockerRouteOptions } from './options'
export type { MockerScope } from './scope'
