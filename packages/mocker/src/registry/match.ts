/**
 * Registry keys, and how a request is matched against them.
 *
 * A key is written in the dialect the developer already reads off the
 * filesystem and out of the browser's address bar —
 * `"GET /api/property/[reference]"`, `"GET /api/property?propertyReference=[reference]"`
 * — and this module answers the only two questions that are true in every
 * runtime: is this key well formed, and does this request match it?
 *
 * Runtime-specific derivations live in the adapter that needs them. Next's
 * rewrite `source`/`has`/`destination` and the `src/app/api/<dir>` mapping are
 * in `adapters/next/rewrites.ts`, because `:param`, `has` and `/api/mock` are
 * facts about the App Router, not about the registry.
 *
 * Pure by design — no zod, no faker, no `process.env`, no host imports — because
 * a build-time config (`next.config.ts`) evaluates it before any bundling.
 */

/** Methods a key may name. */
const METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
] as const

/**
 * A dynamic segment, in App Router dialect: `[reference]`.
 *
 * Annotated because it is exported: `isolatedDeclarations` is on, so tsdown can
 * emit this package's `.d.ts` with oxc instead of a typechecker.
 */
export const DYNAMIC_SEGMENT: RegExp = /^\[([A-Za-z_][A-Za-z0-9_]*)]$/

/** A catch-all segment: `[...path]` / `[[...path]]`. */
const CATCH_ALL_SEGMENT = /^\[\[?\.\.\./

/**
 * A query parameter name a key may constrain.
 *
 * Narrower than the URL spec allows, deliberately. The characters left out are
 * the ones that make a key ambiguous to read (`?`, `=`, `&`, `[`) rather than
 * the ones a BFF endpoint actually uses, and a name outside this set is far
 * more likely to be a typo'd key than a real parameter.
 */
const QUERY_NAME = /^[A-Za-z_][A-Za-z0-9_.-]*$/

/**
 * One query condition a key places on a request.
 *
 * Exactly one of `param` / `value` is set, or neither:
 *
 * - `param` — `?propertyReference=[reference]`: present and non-empty, and the
 *   value is bound to `reference`, so it reaches `handle()` as a route param and
 *   is echoed into a response field of that name.
 * - `value` — `?mode=summary`: present and exactly equal. Lets two entries share
 *   one path and differ only by what was asked for.
 * - neither — `?propertyReference`: present, any value. The condition is that
 *   the caller supplied it at all.
 */
export interface QueryConstraint {
  /** The query parameter this constrains, e.g. `propertyReference`. */
  readonly name: string
  /** Binding name from `[param]`, e.g. `reference`. */
  readonly param?: string
  /** Literal the value must equal. */
  readonly value?: string
}

/** A registry key, split into the parts its three consumers each need. */
export interface RegistryKey {
  readonly method: string
  /**
   * The path in App Router dialect, e.g. `/api/property`.
   *
   * Path only: the query half is parsed out into {@link RegistryKey.query}. That
   * split is what lets a path consumer stay ignorant of query constraints —
   * `toRouteDirectory` maps this to a folder on disk, and a query string is not
   * a folder.
   */
  readonly pattern: string
  /** Query conditions, in key order. Empty for a key with no `?`. */
  readonly query: readonly QueryConstraint[]
}

/**
 * Thrown for a key this module cannot make sense of.
 *
 * Loud rather than skipped: a malformed key that is silently ignored produces a
 * route that is simply never mocked, and the only symptom is real data arriving
 * where fake data was expected — which reads as the flag not working.
 */
export class InvalidRegistryKeyError extends Error {
  constructor(key: string, reason: string) {
    super(`Invalid mock registry key "${key}": ${reason}`)
    this.name = 'InvalidRegistryKeyError'
  }
}

/** How a constraint reads back as key text, for error messages. */
export function describeConstraint(constraint: QueryConstraint): string {
  if (constraint.value !== undefined)
    return `${constraint.name}=${constraint.value}`
  if (constraint.param !== undefined)
    return `${constraint.name}=[${constraint.param}]`
  return constraint.name
}

/** Parse the half of a key after `?` into its conditions. */
function parseQuery(key: string, search: string): QueryConstraint[] {
  if (search === '') {
    throw new InvalidRegistryKeyError(key, '"?" with no query constraint after')
  }
  if (search.includes('?')) {
    throw new InvalidRegistryKeyError(key, 'more than one "?"')
  }

  const seen = new Set<string>()

  return search.split('&').map((clause): QueryConstraint => {
    const separator = clause.indexOf('=')
    const name = separator === -1 ? clause : clause.slice(0, separator)

    if (!QUERY_NAME.test(name)) {
      throw new InvalidRegistryKeyError(
        key,
        `"${name}" is not a usable query parameter name`,
      )
    }
    // Two conditions on one parameter can never both hold, so the key would
    // match nothing — which looks exactly like the mock being off.
    if (seen.has(name)) {
      throw new InvalidRegistryKeyError(key, `"${name}" is constrained twice`)
    }
    seen.add(name)

    if (separator === -1) return { name }

    const raw = clause.slice(separator + 1)
    const dynamic = DYNAMIC_SEGMENT.exec(raw)
    if (dynamic) return { name, param: dynamic[1] }

    if (raw === '') {
      throw new InvalidRegistryKeyError(
        key,
        `"${name}=" matches only an empty value; write "${name}" to require it with any value`,
      )
    }
    if (raw.includes('[') || raw.includes(']')) {
      throw new InvalidRegistryKeyError(
        key,
        `"${raw}" is a malformed binding; write "${name}=[param]"`,
      )
    }

    return { name, value: raw }
  })
}

/** Every name a key binds a value to, across both halves. */
function bindingNames(
  pattern: string,
  query: readonly QueryConstraint[],
): string[] {
  const fromPath = pattern
    .split('/')
    .map((segment) => DYNAMIC_SEGMENT.exec(segment)?.[1])
    .filter((name): name is string => name !== undefined)

  const fromQuery = query
    .map((constraint) => constraint.param)
    .filter((name): name is string => name !== undefined)

  return [...fromPath, ...fromQuery]
}

/**
 * Split `"GET /api/property?propertyReference=[reference]"` into its parts.
 *
 * @throws {InvalidRegistryKeyError} for anything this module cannot make sense of
 */
export function parseKey(key: string): RegistryKey {
  const [method, target, ...rest] = key.split(' ')

  if (method === undefined || target === undefined || rest.length > 0) {
    throw new InvalidRegistryKeyError(key, 'expected exactly "METHOD /path"')
  }
  if (!METHODS.includes(method as (typeof METHODS)[number])) {
    throw new InvalidRegistryKeyError(key, `"${method}" is not an HTTP method`)
  }

  const separator = target.indexOf('?')
  const pattern = separator === -1 ? target : target.slice(0, separator)
  const query =
    separator === -1 ? [] : parseQuery(key, target.slice(separator + 1))

  // Only a leading slash is required here. Whether the path must sit under
  // `/api` is a host convention — the Next adapter enforces it, because that is
  // where the prefix is load-bearing.
  if (!pattern.startsWith('/')) {
    throw new InvalidRegistryKeyError(key, 'path must start with "/"')
  }
  if (pattern.endsWith('/')) {
    throw new InvalidRegistryKeyError(key, 'path must not end with a slash')
  }
  if (pattern.split('/').some((segment) => CATCH_ALL_SEGMENT.test(segment))) {
    // Deliberately unsupported: a catch-all key cannot be checked against the
    // filesystem, which is the whole basis of the drift test.
    throw new InvalidRegistryKeyError(
      key,
      'catch-all segments are not supported',
    )
  }

  // A path segment and a query constraint binding the same name would silently
  // resolve to whichever the merge saw last, and the loser would simply not be
  // echoed — a missing field with no error anywhere.
  const bindings = bindingNames(pattern, query)
  const duplicate = bindings.find(
    (name, index) => bindings.indexOf(name) !== index,
  )
  if (duplicate !== undefined) {
    throw new InvalidRegistryKeyError(key, `"[${duplicate}]" is bound twice`)
  }

  return { method, pattern, query }
}

/**
 * Match a concrete pathname against a pattern, recovering dynamic segments.
 *
 * Segment-wise rather than by regex, so a literal segment containing a regex
 * metacharacter needs no escaping and cannot widen the match.
 *
 * Path only, and deliberately so: `isPathRegistered` and the host's shadowing
 * test both ask a question about paths alone. Query conditions are
 * {@link matchQuery}.
 *
 * @returns the dynamic segments, or `null` if the pattern does not match
 */
export function matchPattern(
  pattern: string,
  pathname: string,
): Record<string, string> | null {
  const expected = pattern.split('/')
  const actual = pathname.split('/')
  if (expected.length !== actual.length) return null

  const params: Record<string, string> = {}

  for (const [index, segment] of expected.entries()) {
    const dynamic = DYNAMIC_SEGMENT.exec(segment)
    // Non-null: the two arrays were length-checked above, so every index of one
    // is an index of the other.
    const candidate = actual[index]!

    if (dynamic === null) {
      if (segment !== candidate) return null
      continue
    }

    // An empty dynamic segment means a double slash, not a match: `/api/property//`
    // is not a request for a property.
    const value = decodeURIComponent(candidate)
    if (value === '') return null
    // Non-null: the capture group is not optional, so it participates in every
    // match the exec above returned.
    params[dynamic[1]!] = value
  }

  return params
}

/**
 * Match a request's query against a key's conditions, recovering bindings.
 *
 * Extra parameters the key says nothing about are ignored — `?propertyReference=X&page=2`
 * still matches `?propertyReference=[reference]`. A key states what a request
 * must carry, not everything it may carry; the alternative would make every
 * filter, sort and page parameter a reason to stop mocking.
 *
 * @returns the bound values, or `null` if any condition fails
 */
export function matchQuery(
  constraints: readonly QueryConstraint[],
  query: URLSearchParams,
): Record<string, string> | null {
  const params: Record<string, string> = {}

  for (const constraint of constraints) {
    // Already percent-decoded by URLSearchParams, matching what `matchPattern`
    // does to a path segment.
    const value = query.get(constraint.name)
    if (value === null) return null

    if (constraint.value !== undefined) {
      if (value !== constraint.value) return null
      continue
    }
    if (constraint.param === undefined) continue

    // The query mirror of the empty-segment rule: `?propertyReference=` names no
    // property, and echoing "" into the response would render a page about
    // nothing rather than failing.
    if (value === '') return null
    params[constraint.param] = value
  }

  return params
}

/** Dynamic segments in a pattern. Fewer is more specific. */
function dynamicSegments(pattern: string): number {
  return pattern.split('/').filter((segment) => DYNAMIC_SEGMENT.test(segment))
    .length
}

/**
 * Order two keys most-specific first.
 *
 * Three tiebreaks, in the order a reader would guess: a literal path beats a
 * dynamic one, then more query conditions beat fewer, then an exact value beats
 * a binding. Every one of them exists so that registering both of a pair does
 * not make the winner depend on object key order.
 */
function compareSpecificity(a: RegistryKey, b: RegistryKey): number {
  const exact = (key: RegistryKey): number =>
    key.query.filter((constraint) => constraint.value !== undefined).length

  return (
    dynamicSegments(a.pattern) - dynamicSegments(b.pattern) ||
    b.query.length - a.query.length ||
    exact(b) - exact(a)
  )
}

/** A registry key that matched a request, with its recovered params. */
export interface RegistryMatch {
  readonly key: string
  readonly params: Record<string, string>
}

/**
 * Find the entry serving `method pathname` with this query, most specific first.
 *
 * A static pattern beats a dynamic one, mirroring how the App Router resolves
 * `property/search` against `property/[reference]`; a query-constrained key
 * beats an unconstrained one on the same path, mirroring how a Next rewrite
 * with a `has` condition is the narrower rule.
 *
 * @param query the request's search params; omitted means a request with none,
 *   which matches only keys that constrain nothing
 */
export function findMatch(
  keys: readonly string[],
  method: string,
  pathname: string,
  query: URLSearchParams = new URLSearchParams(),
): RegistryMatch | null {
  const candidates = keys
    .map((key) => ({ key, parsed: parseKey(key) }))
    .filter(({ parsed }) => parsed.method === method)
    .map(({ key, parsed }) => ({
      key,
      parsed,
      path: matchPattern(parsed.pattern, pathname),
      search: matchQuery(parsed.query, query),
    }))
    .filter((candidate) => candidate.path !== null && candidate.search !== null)
    .sort((a, b) => compareSpecificity(a.parsed, b.parsed))

  const best = candidates[0]
  return best
    ? { key: best.key, params: { ...best.path, ...best.search } }
    : null
}

/**
 * Whether any key at all covers this path, regardless of method or query.
 *
 * Used to tell "no mock here" apart from "this path is captured but declares no
 * mock for *this* verb" — the second needs a much louder answer, because on a
 * runtime that intercepts by path (Next rewrites, Playwright `page.route`) the
 * real handler has silently become unreachable.
 */
export function isPathRegistered(
  keys: readonly string[],
  pathname: string,
): boolean {
  return keys.some(
    (key) => matchPattern(parseKey(key).pattern, pathname) !== null,
  )
}
