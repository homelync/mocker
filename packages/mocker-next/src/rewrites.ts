// The `/config` entry rather than the package root, deliberately: the root
// re-exports `serve.ts` and through it `core` and faker. `next.config.ts`
// evaluates this file in plain Node before any bundling, so it must stay cheap
// enough that nobody is tempted to make config loading conditional — and a
// production build must not be able to reach the generator from here at all.
import {
  DYNAMIC_SEGMENT,
  isMockConfigured,
  isMockEnabledFor,
  parseKey,
} from '@magicspon/mocker/config'
import type { MockRegistry, QueryConstraint } from '@magicspon/mocker/config'

/**
 * Everything the App Router needs to send a registered route to the mock, and
 * nothing else.
 *
 * This is where Next's dialect lives. A registry key is written the way the
 * filesystem reads (`"GET /api/property/[reference]"`); Next wants `:reference`
 * in a rewrite `source`, a `destination` under the catch-all endpoint, and — for
 * the host's drift test — the directory under `src/app/api` that the key names.
 * All three are facts about the App Router, so none of them belong in
 * `mock/registry`.
 *
 * Pure apart from the flag: no zod, no faker, no application imports.
 */

/** Where the rewrites land. Not a real route in its own right. */
export const MOCK_ENDPOINT_PREFIX = '/api/mock'

/** The prefix every key must carry: these are BFF routes under `/api`. */
const API_PREFIX = '/api/'

/**
 * One condition on a rewrite, beyond the path.
 *
 * `source` is path-to-regexp and understands paths only — feeding it a `?` is
 * the `Unexpected MODIFIER` error you get for writing a query into it. Query
 * conditions belong here instead, which is the whole reason Next has a separate
 * `has` array.
 */
export interface RewriteHas {
  readonly type: 'query'
  readonly key: string
  readonly value?: string
}

/**
 * One entry of Next's `beforeFiles` rewrite list.
 *
 * `has` is a mutable array rather than a `readonly` one purely to stay
 * assignable to Next's own `Rewrite`, which declares it mutable — and a
 * structural mismatch here surfaces as a type error in `next.config.ts`, well
 * away from the code that caused it.
 */
export interface Rewrite {
  readonly source: string
  readonly destination: string
  readonly has?: RewriteHas[]
}

/**
 * Assert the App Router convention the destination algebra depends on.
 *
 * `mock/registry` requires only a leading slash, because a key under `/v1` is
 * perfectly meaningful to a Nest adapter. Here it is not: the destination is
 * built by swapping `/api` for `/api/mock`, so a key outside `/api` would
 * silently produce a rewrite to a path no route serves.
 */
function requireApiPath(pattern: string): string {
  if (!pattern.startsWith(API_PREFIX)) {
    throw new Error(
      `Mock registry key "${pattern}" must start with "${API_PREFIX}" to be served by the Next adapter.`,
    )
  }
  return pattern
}

/**
 * The rewrite `source` Next needs: `/api/property/:reference`.
 *
 * Next matches rewrites on path only — there is no `method` condition — so one
 * source covers every verb to that path, and the mock endpoint dispatches on
 * method itself.
 *
 * @param pattern the *path* half of a key (`parseKey().pattern`). A raw key
 *   with a query string would reach path-to-regexp and fail to parse; that is
 *   what {@link toRewriteConditions} exists for.
 */
export function toRewriteSource(pattern: string): string {
  return pattern
    .split('/')
    .map((segment) => {
      const dynamic = DYNAMIC_SEGMENT.exec(segment)
      return dynamic ? `:${dynamic[1]}` : segment
    })
    .join('/')
}

/**
 * The rewrite `destination`: `/api/mock/property/:reference`.
 *
 * The original path minus `/api` becomes the catch-all's segments, which is how
 * the endpoint reconstructs the URL the caller actually asked for — see
 * {@link originalPathname}.
 */
export function toRewriteDestination(pattern: string): string {
  return `${MOCK_ENDPOINT_PREFIX}${toRewriteSource(requireApiPath(pattern)).slice('/api'.length)}`
}

/** Regex metacharacters, for literals that must match themselves. */
const REGEX_METACHARACTER = /[.*+?^${}()|[\]\\]/g

/**
 * The `has` conditions a key's query constraints become.
 *
 * A binding (`?propertyReference=[reference]`) becomes a *presence* condition
 * with no `value`, not a capture. Next preserves the query string across a
 * rewrite, so the value reaches the mock endpoint on the URL regardless, and
 * `serveFromRegistry` re-matches the key there anyway — asking Next to capture
 * it would be a second, weaker copy of matching that is already done properly
 * downstream.
 *
 * The gap that leaves is `?propertyReference=` (present but empty), which
 * satisfies a presence condition and is then rejected by `matchQuery`. It
 * arrives at the mock endpoint and gets an explicit 404 rather than falling
 * through to the real route — the right trade, since a page about the empty
 * string is the failure nobody would think to look for.
 *
 * @returns the conditions, or `undefined` for a key that constrains nothing —
 *   Next treats an empty `has` array as a rule that can never match
 */
export function toRewriteConditions(
  query: readonly QueryConstraint[],
): RewriteHas[] | undefined {
  if (query.length === 0) return undefined

  return query.map((constraint) => ({
    type: 'query' as const,
    // Escaped: Next compiles `value` to a regex, so an unescaped `.` in a
    // literal would quietly match any character.
    ...(constraint.value === undefined
      ? {}
      : { value: constraint.value.replace(REGEX_METACHARACTER, '\\$&') }),
    key: constraint.name,
  }))
}

/**
 * The route directory a key names, relative to `src/app/api`.
 *
 * `"GET /api/property/[reference]"` → `"property/[reference]"`, which is exactly
 * how the host's drift test enumerates routes off disk. The bracket dialect is
 * chosen for precisely this: a key maps to a file path by pure string
 * transform, so a moved route fails a test the same day.
 */
export function toRouteDirectory(pattern: string): string {
  return requireApiPath(pattern).slice(API_PREFIX.length)
}

/**
 * The path the caller originally requested, rebuilt from the catch-all segments.
 *
 * The mock endpoint is invoked at its own destination path, so `request.url`
 * cannot be trusted to name the route the caller asked for. The segments can:
 * they *are* the original path minus `/api`, put there by the rewrite.
 */
export function originalPathname(segments: readonly string[]): string {
  return `${API_PREFIX}${segments.map(encodeURIComponent).join('/')}`
}

/**
 * The rewrites that send registered routes to the mock endpoint.
 *
 * `beforeFiles`, so a registered route is intercepted *before* its `route.ts`
 * is matched — `afterFiles` would never fire for a route that exists, which is
 * most of them.
 *
 * One rewrite per unique path *and set of conditions*, not per key: Next
 * rewrites cannot match on method, so `GET` and `POST` to the same path share a
 * rule and the endpoint dispatches on the verb itself — but two keys on one path
 * that require different query parameters are genuinely two rules.
 *
 * Emitted most-constrained first. Next takes the first rewrite that matches, so
 * an unconditional rule ahead of a conditional one on the same source would
 * swallow it, and the narrower key would never be reached.
 *
 * Evaluated at config time, in plain Node, before any bundling — which is what
 * makes it the strongest guarantee in this design. `next build` runs with
 * `NODE_ENV=production`, so this returns an empty list and a production build
 * contains no path to the mock endpoint at all: the feature is absent by
 * construction rather than disabled by a runtime flag.
 *
 * @param registry the host's endpoint table, passed in rather than imported —
 *   the library has no opinion about which endpoints exist
 */
export function mockRewrites(registry: MockRegistry): Rewrite[] {
  if (!isMockConfigured()) return []

  const byRule = new Map<string, Rewrite>()

  for (const key of Object.keys(registry)) {
    const { pattern, query } = parseKey(key)

    // Matched against the *original* path, exactly as `withMock` matches it, so
    // `MOCK_API=property/search` means the same thing under both mechanisms.
    if (!isMockEnabledFor(pattern)) continue

    const source = toRewriteSource(requireApiPath(pattern))
    const has = toRewriteConditions(query)
    const rule: Rewrite = {
      source,
      destination: toRewriteDestination(pattern),
      ...(has === undefined ? {} : { has }),
    }

    byRule.set(ruleSignature(rule), rule)
  }

  return [...byRule.values()].sort(
    (a, b) => (b.has?.length ?? 0) - (a.has?.length ?? 0),
  )
}

/** A rewrite's identity for de-duplication: what it matches, not where it goes. */
function ruleSignature(rule: Rewrite): string {
  const conditions = (rule.has ?? [])
    .map((condition) => `${condition.key}=${condition.value ?? ''}`)
    .join('&')

  return `${rule.source}?${conditions}`
}
