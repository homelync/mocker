import path from 'node:path'
import type { MockRegistry } from '@homelync/mocker'
import type {
  Fixtures,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
} from '@playwright/test'
import { describeMisses } from './miss'
import type { MockerRouteOptions } from './options'
import { mockerRoutes } from './routes'
import type { MockerController } from './routes'

/**
 * The same mock, wired into Playwright's fixtures.
 *
 * Not sugar over {@link mockerRoutes}: it is the only place with an
 * **after-phase**. A missing fixture and an undeclared endpoint are both
 * discovered inside a route handler, where a throw rejects a promise nobody
 * awaits — so the requests are recorded during the test and reported here, once,
 * when it ends. Without a teardown there is nowhere to fail from, and the
 * mechanism that makes fixtures reviewable would be decorative in CI, which is
 * the one environment that gates merges.
 *
 * Returned as a plain object rather than a `test` object, so the consumer keeps
 * ownership of their own `base.extend` chain and this package never imports
 * `@playwright/test` at runtime. `package-boundary.test.ts` asserts that.
 */

/** {@link MockerRouteOptions}, plus the switch that turns the whole thing off. */
export interface MockerFixtureOptions extends MockerRouteOptions {
  /**
   * Set `false` for a file that wants the real API.
   *
   * The controller is still injected, and still throws from `use()`, because a
   * disabled mock that silently accepted overrides would be a test asserting on
   * data nobody served.
   */
  readonly enabled?: boolean
}

/** The registry to serve, plus the defaults every test in the project starts from. */
export interface MockerTestConfig<
  Registry extends MockRegistry,
> extends MockerRouteOptions {
  readonly registry: Registry
}

/** The two fixtures {@link mockerTest} adds to a `test` object. */
export interface MockerTestFixtures<
  Registry extends MockRegistry = MockRegistry,
> {
  /**
   * Per-file and per-project controls: `test.use({ mockerOptions: { count: 3 } })`.
   *
   * A separate name from `mocker` because Playwright's option mechanism *is* a
   * fixture — one identifier cannot be both the thing you configure and the
   * thing you are handed.
   */
  mockerOptions: MockerFixtureOptions
  /** The controller, installed automatically for every test. */
  mocker: MockerController<Registry>
}

/** The handle a disabled file still gets, so `use()` says why nothing happened. */
function disabled<Registry extends MockRegistry>(): MockerController<Registry> {
  return {
    misses: [],
    use() {
      throw new Error(
        '[mocker] mocker.use() was called, but the mock is disabled for this file by test.use({ mockerOptions: { enabled: false } }).',
      )
    },
  }
}

/**
 * Playwright fixtures serving a registry to every test.
 *
 * ```ts
 * // tests/fixtures.ts
 * import { test as base } from '@playwright/test'
 * import { mockerTest } from '@homelync/mocker-playwright'
 * import { registry } from '../src/mocks/registry'
 *
 * export const test = base.extend(mockerTest({ registry }))
 * ```
 *
 * ```ts
 * // tests/devices.spec.ts
 * test.use({ mockerOptions: { count: 3 } })      // this whole file
 *
 * test('empty state', async ({ page, mocker }) => {
 *   mocker.use('GET /api/devices', { count: 0 }) // before goto
 *   await page.goto('/devices')
 * })
 * ```
 *
 * The `mocker` fixture is `auto`, so a test that never mentions it is still
 * mocked — which is what makes "an undeclared endpoint fails the test" a
 * property of the suite rather than of the tests that remembered to opt in.
 *
 * @param config the registry, plus defaults for every test
 */
export function mockerTest<Registry extends MockRegistry>(
  config: MockerTestConfig<Registry>,
): Fixtures<
  MockerTestFixtures<Registry>,
  Record<never, never>,
  PlaywrightTestArgs & PlaywrightTestOptions,
  Record<never, never>
> {
  const { registry, ...defaults } = config

  return {
    mockerOptions: [{}, { option: true }],

    mocker: [
      async ({ context, mockerOptions }, use, testInfo) => {
        if (mockerOptions.enabled === false) {
          await use(disabled<Registry>())
          return
        }

        const merged: MockerRouteOptions = { ...defaults, ...mockerOptions }
        const controller = await mockerRoutes(context, registry, {
          ...merged,
          // Anchored to `rootDir` rather than `cwd`, so the store is the same
          // directory wherever `playwright test` was invoked from.
          dir: path.resolve(testInfo.config.rootDir, merged.dir ?? 'mocks'),
          // `--update-snapshots=none` means "write nothing"; `all` and `changed`
          // are deliberately ignored. Someone accepting a legitimate screenshot
          // change must not thereby regenerate every hand-edited fixture in the
          // repo — the device renamed to make an assertion readable would become
          // faker output again, and the diff would be hundreds of files. To
          // regenerate one fixture, delete it: a deliberate act that shows up in
          // `git status`.
          write:
            merged.write ??
            (testInfo.config.updateSnapshots === 'none' ? 'none' : 'missing'),
        })

        await use(controller)

        const report = describeMisses(controller.misses)
        if (report !== null) throw new Error(report)
      },
      { auto: true },
    ],
  }
}
