/**
 * Which requests are the adapter's business, and where a matched one's path
 * starts.
 *
 * Two jobs that look unrelated and are not. Storybook narrows by registering one
 * MSW handler per registry path, so "in scope" never has to be said out loud;
 * this package registers a *single* route (see the README) and therefore has to
 * say it. And having said it, the same `baseUrl` that decides scope is the prefix
 * that must come back off a matched path before the registry sees it.
 *
 * `toRegistryPath` is copied from `mocker-storybook/src/pattern.ts` rather than
 * imported. Depending on a sibling adapter to reach a nine-line string function
 * would make either package unable to move without the other, and this is the
 * only part of that module a broad route needs — the `:reference` dialect it
 * exists for has no counterpart here.
 */

/** Trailing slashes, which would otherwise double up on a join. */
const TRAILING_SLASH = /\/+$/

/** An absolute URL, as opposed to a bare path prefix. */
const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:\/\//i

/**
 * What counts as in scope: a URL prefix, or a pattern over the whole URL.
 *
 * A string beginning with `/` is matched against the path alone, so a
 * same-origin app can narrow to `"/api"`; anything else is matched against the
 * full URL, so `"https://api.acme.com"` narrows to an origin.
 */
export type MockerScope = string | RegExp

/**
 * Where the mocked API is mounted, as a prefix that can be stripped.
 *
 * Not exported: `toRegistryPath` is the whole vocabulary, and a second way to
 * ask about a prefix is a second thing to keep in step with it.
 */
function toPrefix(baseUrl: string | undefined): string {
  if (baseUrl === undefined) return ''
  return baseUrl.replace(TRAILING_SLASH, '')
}

/**
 * The path half of a prefix — what a matched request carries beyond the origin.
 *
 * `https://api.acme.com/v1` contributes `/v1`; a bare `/v1` contributes itself;
 * an origin-only base contributes nothing.
 */
function toPrefixPath(baseUrl: string | undefined): string {
  const prefix = toPrefix(baseUrl)
  if (prefix === '') return ''
  if (!ABSOLUTE_URL.test(prefix)) return prefix

  return new URL(prefix).pathname.replace(TRAILING_SLASH, '')
}

/**
 * A matched request's path, as the registry declares it.
 *
 * Load-bearing beyond tidiness: `handle()` seeds from
 * `hash(method + path + sorted query)`, so serving `/v1/api/devices` would
 * return different data than the same endpoint served without a prefix, and
 * nothing anywhere would say so. It is also what keeps one endpoint on one
 * fixture file however the test happened to point at it.
 */
export function toRegistryPath(pathname: string, baseUrl?: string): string {
  const prefix = toPrefixPath(baseUrl)
  if (prefix === '' || !pathname.startsWith(prefix)) return pathname

  const stripped = pathname.slice(prefix.length)
  // A prefix that consumed the whole path leaves the root, not an empty string:
  // `new URL("", origin)` is the origin's own path and would not match a key.
  return stripped === '' ? '/' : stripped
}

/**
 * The scope a set of options implies, or `null` for "the page's own origin".
 *
 * `null` is not a missing answer — it is the answer that cannot be computed
 * before the browser has navigated anywhere, and it is the common case: an app
 * fetching its own `/api/...` has no origin to name until a page exists. The
 * handler resolves it per request from the frame that made the call, which is
 * the only place that fact is available.
 *
 * @param options the route options, read for `scope` and `baseUrl`
 */
export function resolveScope(options: {
  readonly scope?: MockerScope
  readonly baseUrl?: string
}): MockerScope | null {
  if (options.scope !== undefined) return options.scope

  const prefix = toPrefix(options.baseUrl)
  // A path-only `baseUrl` says where the API sits on an origin, not which
  // origin — so it narrows nothing that the same-origin rule does not already.
  if (prefix === '' || !ABSOLUTE_URL.test(prefix)) return null

  return prefix
}

/** Whether a URL falls inside an explicit scope. */
export function matchesScope(scope: MockerScope, url: string): boolean {
  if (typeof scope !== 'string') return scope.test(url)
  if (scope.startsWith('/')) return new URL(url).pathname.startsWith(scope)

  return url.startsWith(scope)
}

/**
 * Whether two URLs share an origin.
 *
 * The default scope, and deliberately a narrow one. A same-origin `fetch` an app
 * makes that the registry says nothing about is, essentially always, an endpoint
 * someone forgot to declare — which is what makes it safe to fail the test over.
 * A cross-origin one might be analytics, a font service or a CDN, so it is left
 * alone unless a `baseUrl` or `scope` says otherwise.
 */
export function sameOrigin(url: string, other: string): boolean {
  try {
    return new URL(url).origin === new URL(other).origin
  } catch {
    // A frame with no navigable URL — `about:blank`, a data: document. Nothing
    // it fetches can be judged, so nothing is claimed.
    return false
  }
}
