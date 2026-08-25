import { DYNAMIC_SEGMENT } from '@homelync/mocker'

/**
 * Registry keys, in the dialect MSW matches on.
 *
 * This is the whole of what Storybook's mocking layer knows that the registry
 * does not. A key is written the way the App Router reads a path —
 * `"GET /api/property/[reference]"` — and MSW's matcher is path-to-regexp, which
 * wants `:reference`. That is the same translation `mocker-next` does for a
 * rewrite `source`, and it lives here for the same reason it lives there: the
 * dialect belongs to the runtime, not to the registry.
 *
 * Pure — no MSW import, no registry import — so the conversion can be asserted
 * on its own, which is the only part of this package a mistake would make
 * silently wrong rather than loudly broken.
 */

/** Trailing slashes, which would otherwise double up on a join. */
const TRAILING_SLASH = /\/+$/

/** An absolute URL, as opposed to a bare path prefix. */
const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:\/\//i

/**
 * Where the mocked API is mounted, as a prefix that can be joined or stripped.
 *
 * Two forms are accepted because both are real: a component may fetch
 * `/api/devices` (same origin as the Storybook preview) or
 * `https://api.acme.com/v1/devices` (a service on another host). An absolute
 * `baseUrl` gives MSW an absolute pattern to match; a bare path prefix narrows
 * a same-origin match.
 *
 * Not exported: the two functions below are the whole vocabulary, and a third
 * way to ask about a prefix is a third thing to keep in step with them.
 */
function toPrefix(baseUrl: string | undefined): string {
  if (baseUrl === undefined) return ''
  return baseUrl.replace(TRAILING_SLASH, '')
}

/**
 * The path half of a prefix — what a matched request carries beyond the origin.
 *
 * Used to recover the path the *registry* declares from the URL a component
 * actually called. `https://api.acme.com/v1` contributes `/v1`; a bare `/v1`
 * contributes itself; an origin-only base contributes nothing.
 */
export function toPrefixPath(baseUrl: string | undefined): string {
  const prefix = toPrefix(baseUrl)
  if (prefix === '') return ''
  if (!ABSOLUTE_URL.test(prefix)) return prefix

  return new URL(prefix).pathname.replace(TRAILING_SLASH, '')
}

/**
 * The MSW path for a key's pattern: `/api/property/:reference`.
 *
 * Path only. Query constraints are deliberately not expressed here — MSW
 * ignores a request's extra search parameters when matching, which is the same
 * rule the registry states, and re-encoding a key's conditions into a matcher
 * would put a second implementation of the registry's query matching in this
 * package. The resolver hands the request back to `serveFromRegistry`, which
 * already knows.
 *
 * @param pattern the path half of a key, from `parseKey().pattern`
 * @param baseUrl where the API is mounted; see {@link toPrefix}
 */
export function toHandlerPath(pattern: string, baseUrl?: string): string {
  const path = pattern
    .split('/')
    .map((segment) => {
      const dynamic = DYNAMIC_SEGMENT.exec(segment)
      // Non-null: the capture group is not optional, so it participates in
      // every match `exec` returned.
      return dynamic ? `:${dynamic[1]!}` : segment
    })
    .join('/')

  return `${toPrefix(baseUrl)}${path}`
}

/**
 * A matched request's path, as the registry declares it.
 *
 * The mirror of {@link toHandlerPath}: whatever prefix put the mock where the
 * component could reach it has to come back off before the key is matched
 * again. Load-bearing beyond tidiness — `handle()` seeds from
 * `hash(method + path + sorted query)`, so serving `/v1/api/devices` would
 * return different data than the same endpoint served without a prefix, and
 * nothing anywhere would say so.
 */
export function toRegistryPath(pathname: string, baseUrl?: string): string {
  const prefix = toPrefixPath(baseUrl)
  if (prefix === '' || !pathname.startsWith(prefix)) return pathname

  const stripped = pathname.slice(prefix.length)
  // A prefix that consumed the whole path leaves the root, not an empty string:
  // `new URL("", origin)` is the origin's own path and would not match a key.
  return stripped === '' ? '/' : stripped
}
