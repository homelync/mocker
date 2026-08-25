import path from 'node:path'
import type { MockRegistry } from '@homelync/mocker'
import type { BrowserContext } from 'playwright-core'
import type { z } from 'zod'
import { handleRoute } from './handler'
import type { HandlerState } from './handler'
import type { MockerMiss } from './miss'
import type {
  MockerEndpointOptions,
  MockerRouteOptions,
  ResolvedOptions,
} from './options'
import type { MockerOverride } from './overrides'
import { matchesScope, resolveScope } from './scope'
import { fixtureStore } from './store'

/**
 * Installing the mock on a browser context, and the handle a test bends it with.
 *
 * `context.route` rather than `page.route` because it costs nothing and survives
 * a popup or a second page. And a browser context rather than MSW's
 * `setupServer`, which would see nothing at all: under Playwright the browser is
 * a separate process, and almost none of what it fetches goes through Node's
 * http stack.
 *
 * The other half of that decision is written down in the README: if the app under
 * test can start an MSW *worker* itself, `mockerHandlers()` from
 * `@homelync/mocker-storybook` already works there unchanged, and Playwright
 * needs to intercept nothing. What this package is for is the case where it
 * cannot — a built app, a cross-origin API — and the case that no worker can
 * serve at all: **per-test variation**, where one test needs an empty list and
 * the next needs three rows.
 */

/** What an entry's schema thunk resolves to, or `unknown` if it cannot be read. */
type EntryOutput<Entry> = Entry extends {
  readonly schema: () => Promise<infer Schema extends z.ZodType>
}
  ? z.infer<Schema>
  : unknown

/** What a test holds to bend one endpoint, and to read what went wrong. */
export interface MockerController<
  Registry extends MockRegistry = MockRegistry,
> {
  /**
   * Answer one endpoint differently for the rest of this test.
   *
   * **Call it before the request is made** — before `page.goto()`, before the
   * click that triggers the fetch. A route is consulted when the request
   * happens, so an override registered afterwards never fires. Nothing can
   * enforce that; it is the one rule this package asks a test to keep.
   *
   * Later calls win over earlier ones, including for the same key. Keys with
   * query conditions bend one endpoint of a shared path and leave the other
   * alone.
   *
   * Synchronous, because there is only ever one route registered: this pushes
   * onto a list.
   *
   * ```ts
   * mocker.use('GET /api/devices', { count: 0 })
   * ```
   *
   * @param key the entry to bend, as written in the registry
   * @param options controls, plus generation options checked against this
   *   entry's own schema
   * @throws Error if the key is not in the registry
   */
  use<Key extends keyof Registry & string>(
    key: Key,
    options?: MockerEndpointOptions<EntryOutput<Registry[Key]>>,
  ): void
  /**
   * Requests that must fail the test: fixtures written, fixtures missing,
   * undeclared endpoints, adapter errors. The test fixture reports these in
   * teardown; an imperative caller reads them here and hands them to
   * `describeMisses`.
   */
  readonly misses: readonly MockerMiss[]
}

/**
 * Fill in every default, so nothing downstream decides one twice.
 *
 * `dir` is resolved here rather than deeper because this is the layer that knows
 * what a relative path is relative *to* — `process.cwd()` for a direct call,
 * `testInfo.config.rootDir` for the test fixture, which resolves it before
 * calling this. "Almost always the same directory" is exactly where that bug
 * would live.
 */
export function resolveOptions(options: MockerRouteOptions): ResolvedOptions {
  return {
    ...options,
    fixed: options.fixed ?? true,
    unmatched: options.unmatched ?? 'error',
    write: options.write ?? 'missing',
    dir: path.resolve(options.dir ?? 'mocks'),
  }
}

/**
 * Serve a registry to everything a browser context fetches.
 *
 * ```ts
 * const mocker = await mockerRoutes(context, registry)
 * mocker.use('GET /api/devices', { count: 0 })
 * await page.goto('/devices')
 * ```
 *
 * The imperative half of this package. `mockerTest()` is the same thing wired
 * into Playwright's fixtures, and it exists because only a test fixture has an
 * after-phase in which to fail over `mocker.misses` — a plain caller must check
 * them itself.
 *
 * A consumer's own `context.route` for an in-scope path must be registered
 * **after** this call to win: Playwright consults the most recently registered
 * route first, and this one answers rather than falling through.
 *
 * @param context the browser context to intercept on
 * @param registry the endpoint declarations, passed in rather than imported
 * @param options route-level controls; see {@link MockerRouteOptions}
 */
export async function mockerRoutes<Registry extends MockRegistry>(
  context: BrowserContext,
  registry: Registry,
  options: MockerRouteOptions = {},
): Promise<MockerController<Registry>> {
  const resolved = resolveOptions(options)
  const scope = resolveScope(resolved)

  const state: HandlerState = {
    registry,
    options: resolved,
    scope,
    overrides: [] as MockerOverride[],
    misses: [] as MockerMiss[],
    store: fixtureStore(resolved.dir),
  }

  // A URL predicate when the scope is knowable, so out-of-scope traffic is never
  // paused at all; otherwise everything is intercepted and `inScope` decides per
  // request, because "the page's own origin" does not exist until a page does.
  // The predicate is only ever an optimisation — never narrower than the rule.
  const matcher =
    scope === null
      ? (): boolean => true
      : (url: URL): boolean => matchesScope(scope, url.href)

  await context.route(matcher, (route) => handleRoute(route, state))

  return {
    misses: state.misses,
    use(key, useOptions = {}) {
      if (registry[key] === undefined) {
        throw new Error(`No mock registered for "${key}".`)
      }
      state.overrides.push({
        key,
        // The widening `handle()` performs at the same seam, and for the same
        // reason: `generate` was checked against *this entry's* schema in the
        // signature above, where the caller wrote it, and the list this joins
        // holds overrides for every entry in the table at once.
        options: useOptions as MockerEndpointOptions,
      })
    },
  }
}
