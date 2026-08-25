import {
  MOCK_COUNT_HEADER,
  MOCK_DELAY_HEADER,
  MOCK_SEED_HEADER,
  MOCK_STATUS_HEADER,
} from '@homelync/mocker'
import type { GenerateOptions } from '@homelync/mocker'
import type { MockerScope } from './scope'
import { toRegistryPath } from './scope'

/**
 * What a test may say about the mock, and how it reaches the library.
 *
 * The controls are the same four the Storybook adapter takes, with the same
 * meanings, and they travel the same way: as the headers `handle()` already
 * reads. Headers rather than a second options path because `shapeRequest`
 * decides the seed from the request signature and lets only `x-mock-seed`
 * displace it — going through the controls means a test, a story and a devtools
 * request produce identical bytes, and the validation is the library's rather
 * than a copy of it.
 *
 * Two defaults are inverted from Storybook's, both deliberately; see the README.
 */

/** How a test bends the mock, without touching the registry. */
export interface MockerRouteOptions {
  /**
   * Where the mocked API is mounted, when it is not the app's own origin —
   * `"https://api.acme.com"`, or a path prefix like `"/v1"`.
   *
   * Registry keys stay written as the API declares them; this is stripped again
   * before the key is matched, so the data a test sees does not depend on where
   * the component points. An absolute value also becomes the default
   * {@link scope}.
   */
  readonly baseUrl?: string
  /**
   * Replace the request-derived seed, so the same request yields different data.
   * The one knob that makes two tests of one endpoint see different rows.
   */
  readonly seed?: string
  /** Size the primary collection — a one-row table, an empty state. */
  readonly count?: number
  /** Wait this long before responding, so a loading state can be asserted on. */
  readonly delayMs?: number
  /** Respond with this status instead of the endpoint's own, for error states. */
  readonly status?: number
  /**
   * Answer from a JSON file on disk instead of generating per request.
   *
   * **Default `true`**, which is the opposite of the Storybook adapter and the
   * one asymmetry between them worth stating twice. A story is *looked at*, so
   * plausible data is enough; a test *asserts*, and the values it asserts on
   * should be readable in the repo rather than only in a network panel.
   *
   * See the README for what a missing fixture does, which is the other half of
   * this decision.
   */
  readonly fixed?: boolean
  /**
   * Where the fixture store lives. Absolute, or relative to `testInfo.config.rootDir`
   * under the test fixture and to `process.cwd()` under {@link mockerRoutes}.
   *
   * @default "mocks"
   */
  readonly dir?: string
  /**
   * What to do with an in-scope `fetch`/`xhr` the registry does not declare.
   *
   * `'error'` answers 404 with the reason, records the request, and fails the
   * test in teardown. `'passthrough'` lets it reach the network — which is what
   * every other route in the run does anyway, and which is why it is not the
   * default: an undeclared call reaching a real backend is the flakiest thing an
   * e2e suite can do, and a `POST` that does it writes to a real database.
   *
   * @default "error"
   */
  readonly unmatched?: 'error' | 'passthrough'
  /**
   * Which requests are in scope at all.
   *
   * A string starting with `/` narrows by path; anything else is a URL prefix.
   * Out-of-scope requests are handed straight on, so a test that loads a font or
   * an analytics beacon is not this package's business.
   *
   * @default the `baseUrl` origin when it is absolute, else the page's own origin
   */
  readonly scope?: MockerScope
  /**
   * Whether a missing fixture may be written.
   *
   * `'none'` never writes and still fails, for a run that must not touch the
   * working tree. Taken from `--update-snapshots=none` when it is not set here;
   * `'all'` and `'changed'` are deliberately ignored, because accepting a
   * screenshot change must not regenerate every hand-edited fixture in the repo.
   *
   * @default "missing"
   */
  readonly write?: 'missing' | 'none'
}

/** {@link MockerRouteOptions}, plus what only a single endpoint can be told. */
export interface MockerEndpointOptions<
  Output = unknown,
> extends MockerRouteOptions {
  /**
   * Generation options merged over the registry entry's own — an override
   * pinning a field, a nested array length, a locale.
   *
   * Checked against *this entry's* schema, so `"results[].statusId"` is a
   * completion rather than a guess, and a path the schema does not declare is a
   * compile error on the line that carries it.
   *
   * `seed` and `count` are ignored here: both are decided per request, from the
   * request signature and the controls above. Set them on the options object
   * itself.
   */
  readonly generate?: GenerateOptions<Output>
}

/** Every option resolved to a value, so nothing downstream re-decides a default. */
export interface ResolvedOptions extends MockerRouteOptions {
  readonly fixed: boolean
  readonly unmatched: 'error' | 'passthrough'
  readonly write: 'missing' | 'none'
  /** Absolute. Resolved once, by whoever knew what to resolve it against. */
  readonly dir: string
}

/** The controls, as the headers `handle()` reads them from. */
function applyControls(headers: Headers, options: MockerRouteOptions): Headers {
  if (options.seed !== undefined) headers.set(MOCK_SEED_HEADER, options.seed)
  if (options.count !== undefined) {
    headers.set(MOCK_COUNT_HEADER, String(options.count))
  }
  if (options.delayMs !== undefined) {
    headers.set(MOCK_DELAY_HEADER, String(options.delayMs))
  }
  if (options.status !== undefined) {
    headers.set(MOCK_STATUS_HEADER, String(options.status))
  }
  return headers
}

/** What the adapter needs from an intercepted request to rebuild it. */
export interface RequestFacts {
  readonly url: string
  readonly method: string
  readonly headers: Readonly<Record<string, string>>
}

/**
 * Rebuild an intercepted request as the registry declares it.
 *
 * Two changes and no others: the `baseUrl` prefix comes off the path, and the
 * test's controls go on as headers. The browser's own headers are kept
 * underneath so that a component which sets `x-mock-count` itself still works —
 * and are overwritten by the test's, because the test is the more specific
 * statement of intent and the alternative is a `test.use()` that quietly does
 * nothing.
 *
 * Deliberately carries no body, for the reason `handle()` gives: it never reads
 * one, and cloning a request body means dealing with `duplex` streaming for no
 * benefit.
 */
export function asDeclared(
  request: RequestFacts,
  options: MockerRouteOptions,
): Request {
  const url = new URL(request.url)
  const pathname = toRegistryPath(url.pathname, options.baseUrl)

  return new Request(new URL(`${pathname}${url.search}`, url.origin), {
    method: request.method,
    headers: applyControls(new Headers(request.headers), options),
  })
}
