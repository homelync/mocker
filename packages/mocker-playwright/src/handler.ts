import {
  isRegistryMiss,
  MOCK_MARKER_HEADER,
  serveFromRegistry,
} from '@magicspon/mocker'
import type { MockRegistry } from '@magicspon/mocker'
import { serveFixed } from './fixed'
import type { MockerMiss } from './miss'
import { asDeclared } from './options'
import type { MockerEndpointOptions, ResolvedOptions } from './options'
import { findOverride, overrideRegistry } from './overrides'
import type { MockerOverride } from './overrides'
import { matchesScope, sameOrigin, toRegistryPath } from './scope'
import type { MockerScope } from './scope'
import type { FixtureStore } from './store'

/**
 * The whole pipeline, in one route.
 *
 * ```
 * in-scope request
 *   ├── resourceType not fetch/xhr → route.fallback()
 *   ├── override list (last wins)  → serve
 *   ├── findMatch hit              → fixture file, else generate and write
 *   └── miss                       → 404 explainMiss, record, fail in teardown
 * ```
 *
 * One route rather than one per registry key, which is where most of this
 * package's simplicity comes from: no third pattern dialect to invent (the
 * registry writes `[reference]`, MSW wants `:reference`, and a plain
 * `'/api/devices'` glob does not even match `/api/devices?page=2`), and
 * precedence is a list this module owns rather than an ordering Playwright
 * happens to apply.
 *
 * `resourceType` is the discriminator MSW does not have, and it is what makes
 * strictness affordable. Being strict about every request would break any test
 * that loads a font; being strict about `fetch` and `xhr` alone catches the
 * thing worth catching — a same-origin API call nobody declared — and leaves
 * documents, scripts, stylesheets, images, fonts and media untouched.
 *
 * **No CORS handling, and that is a verified absence rather than an oversight.**
 * `route.fulfill()` was checked against Playwright 1.62 in all three engines: a
 * fulfilled cross-origin response is delivered to the page with no
 * `access-control-allow-origin` at all, even with `credentials: "include"`, and
 * an intercepted non-simple request never issues a preflight — so no `OPTIONS`
 * ever reaches this handler. An `OPTIONS` that does reach it is one the app
 * genuinely sent, and it is treated like any other request: declared, or a miss.
 */

/** What this package uses of Playwright's `Request`. A real one satisfies it. */
export interface InterceptedRequest {
  url(): string
  method(): string
  headers(): Record<string, string>
  resourceType(): string
  frame(): { url(): string }
}

/** What this package uses of Playwright's `Route`. A real one satisfies it. */
export interface InterceptedRoute {
  request(): InterceptedRequest
  fulfill(options: {
    status: number
    headers: Record<string, string>
    body: string
  }): Promise<void>
  fallback(): Promise<void>
}

/** Everything one installed route carries between requests. */
export interface HandlerState {
  readonly registry: MockRegistry
  readonly options: ResolvedOptions
  /** `null` means "whatever origin the page is on"; see `resolveScope`. */
  readonly scope: MockerScope | null
  readonly overrides: MockerOverride[]
  readonly misses: MockerMiss[]
  readonly store: FixtureStore
}

/** The only resource types an undeclared request is worth failing over. */
const STRICT_TYPES = new Set(['fetch', 'xhr'])

const SERVER_ERROR = 500

function inScope(
  request: InterceptedRequest,
  scope: MockerScope | null,
): boolean {
  const url = request.url()
  if (scope !== null) return matchesScope(scope, url)

  try {
    return sameOrigin(url, request.frame().url())
  } catch {
    // A request with no frame — a service worker's, or one made after the page
    // went away. Nothing to compare it to, so it is not ours.
    return false
  }
}

/**
 * The route's options with one endpoint's changes applied.
 *
 * Only the controls bend. `dir`, `scope`, `unmatched` and `write` are decided
 * once, when the route is installed: the store is already open by the time a
 * `use()` runs, and an override that appeared to move it would write nothing
 * anywhere anyone looked.
 */
function bend(
  base: ResolvedOptions,
  override: MockerEndpointOptions | null,
): ResolvedOptions {
  if (override === null) return base

  return {
    ...base,
    seed: override.seed ?? base.seed,
    count: override.count ?? base.count,
    delayMs: override.delayMs ?? base.delayMs,
    status: override.status ?? base.status,
    fixed: override.fixed ?? base.fixed,
  }
}

/** A generated `Response`, as Playwright fulfils one. */
async function fulfillWith(
  route: InterceptedRoute,
  response: Response,
): Promise<void> {
  await route.fulfill({
    status: response.status,
    // Kept whole so `x-mock` and `x-mock-fixture` survive into the trace viewer:
    // a mocked response is then inspectable, and its fixture nameable, with no
    // further work from anyone.
    headers: Object.fromEntries(response.headers),
    body: await response.text(),
  })
}

/** A refusal that names itself, so the page shows an error rather than hanging. */
async function fulfillError(
  route: InterceptedRoute,
  status: number,
  error: string,
): Promise<void> {
  await route.fulfill({
    status,
    headers: {
      'content-type': 'application/json',
      [MOCK_MARKER_HEADER]: '1',
    },
    body: JSON.stringify({ error }),
  })
}

async function answer(
  route: InterceptedRoute,
  state: HandlerState,
): Promise<void> {
  const request = route.request()

  if (!inScope(request, state.scope)) return route.fallback()
  if (!STRICT_TYPES.has(request.resourceType())) return route.fallback()

  const url = new URL(request.url())
  const registryUrl = new URL(
    `${toRegistryPath(url.pathname, state.options.baseUrl)}${url.search}`,
    url.origin,
  )

  const override = findOverride(state.overrides, request.method(), registryUrl)
  const options = bend(state.options, override?.options ?? null)
  const registry =
    override === null
      ? state.registry
      : overrideRegistry(state.registry, override)

  const declared = asDeclared(
    {
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
    },
    options,
  )

  const outcome = options.fixed
    ? await serveFixed(declared, registry, state.store, state.options.write)
    : { result: await serveFromRegistry(declared, registry) }

  if (outcome.wrote !== undefined) {
    state.misses.push({
      kind: 'fixture-written',
      method: request.method(),
      url: request.url(),
      file: state.store.file(outcome.wrote),
    })
  }
  if (outcome.absent !== undefined) {
    state.misses.push({
      kind: 'fixture-missing',
      method: request.method(),
      url: request.url(),
      file: state.store.file(outcome.absent),
    })
  }

  if (!isRegistryMiss(outcome.result)) {
    return fulfillWith(route, outcome.result)
  }

  if (state.options.unmatched === 'passthrough') return route.fallback()

  state.misses.push({
    kind: 'unmatched',
    method: request.method(),
    url: request.url(),
    reason: outcome.result.error,
  })

  return fulfillError(route, outcome.result.status, outcome.result.error)
}

/**
 * Answer one intercepted request.
 *
 * Nothing is allowed to escape. A throw inside a Playwright route handler
 * rejects a promise nobody awaits: the request hangs, the page waits, and the
 * test dies of a timeout naming a locator rather than a cause. So an adapter
 * failure becomes a 500 the page can render *and* a recorded miss, which is the
 * only way it reaches anyone.
 *
 * @param route the intercepted route
 * @param state the installed route's registry, options and ledgers
 */
export async function handleRoute(
  route: InterceptedRoute,
  state: HandlerState,
): Promise<void> {
  try {
    await answer(route, state)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    state.misses.push({
      kind: 'error',
      method: route.request().method(),
      url: route.request().url(),
      reason,
    })

    try {
      await fulfillError(route, SERVER_ERROR, `[mocker] ${reason}`)
    } catch {
      // The route was already answered, or the page is gone. The miss is
      // recorded either way, which is the part that fails the test.
    }
  }
}
