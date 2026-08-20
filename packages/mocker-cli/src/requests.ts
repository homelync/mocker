import { en, en_GB, Faker } from '@faker-js/faker'
import {
  DEFAULT_RULES,
  DYNAMIC_SEGMENT,
  hashSeed,
  parseKey,
} from '@magicspon/mocker'
import type { QueryConstraint } from '@magicspon/mocker'

/**
 * A registry key, as a request somebody could plausibly have made.
 *
 * Everything downstream of this file already exists: `serveFromRegistry` turns a
 * request into a response and `fixturePath` turns it into a filename. The one
 * thing a *generator* needs and a server never does is the request itself —
 * `"GET /api/property/[reference]"` names a shape, not a URL, and a file cannot
 * be written for a shape.
 *
 * So bindings are filled from the same {@link DEFAULT_RULES} the generator uses
 * on field names, which is what makes `[reference]` come out as `A7KQ2M1X` and
 * `[id]` as a hex handle rather than both as lorem. The rule already encodes the
 * one piece of knowledge available here — a name is weak evidence of intent, but
 * it is the only evidence — and reusing it means the URL in the filename reads
 * like the URLs the app actually requests.
 *
 * Deterministic, and seeded off the endpoint's **identity** rather than its full
 * key. Two runs on two machines must agree or the fixtures churn on every commit;
 * seeding off `"GET /api/property/[reference]"` and not the whole key means
 * adding a query constraint to an entry does not silently rename the file its
 * path fixture already lives in.
 */

/**
 * The origin generated requests carry.
 *
 * Arbitrary, and nothing reads it: `serveFromRegistry` matches on pathname and
 * search, and `fixturePath` hashes the same. A request still needs *an* origin
 * to be constructed at all.
 */
const ORIGIN = 'http://localhost'

/**
 * What a value must look like to stand as a URL path segment.
 *
 * A rule is consulted for every binding, but not every rule produces something
 * that belongs in a path — `[url]` would match the `url` rule and put an escaped
 * `https%3A%2F%2Fexample.com` where a reference belongs, and `[ownerName]` would
 * put a space there. Rejecting the value is better than encoding it: the
 * fallback is at least readable.
 */
const SEGMENT_SAFE = /^[A-Za-z0-9._~-]+$/

/** Fallback binding value: a short uppercase code, like a business reference. */
const FALLBACK_LENGTH = 8

/** A faker seeded from a string, matching how the generator seeds its own. */
function fakerFor(seed: string): Faker {
  const faker = new Faker({ locale: [en_GB, en] })
  faker.seed(hashSeed(seed))
  return faker
}

/**
 * A value for one binding, from the generator's own name rules.
 *
 * @param name the binding, e.g. `reference` from `[reference]`
 * @param identity the endpoint the binding belongs to, `"GET /api/property/[reference]"`
 */
export function bindingValue(name: string, identity: string): string {
  const faker = fakerFor(`${identity}|${name}`)
  const rule = DEFAULT_RULES.find(
    (candidate) =>
      candidate.types.includes('string') && candidate.match.test(name),
  )

  // `path` and `key` are both the binding name: a rule only ever matches on the
  // last segment, and here there is nothing else to give it.
  const suggested = rule?.gen({ path: name, key: name, faker })

  return typeof suggested === 'string' && SEGMENT_SAFE.test(suggested)
    ? suggested
    : faker.string.alphanumeric({ length: FALLBACK_LENGTH, casing: 'upper' })
}

/** The pattern with every `[binding]` replaced by a value. */
function fillPattern(pattern: string, identity: string): string {
  return pattern
    .split('/')
    .map((segment) => {
      const dynamic = DYNAMIC_SEGMENT.exec(segment)
      if (dynamic === null) return segment

      // Non-null: the capture group is not optional, so it participates in
      // every match `exec` returned.
      const value = bindingValue(dynamic[1]!, identity)
      // `matchPattern` decodes each segment before comparing, and `fixturePath`
      // decodes before re-encoding, so encoding here round-trips exactly.
      return encodeURIComponent(value)
    })
    .join('/')
}

/**
 * The query a key's conditions describe, as a search string.
 *
 * A key states what a request must *carry*, so this produces the minimum that
 * satisfies it and nothing more. Anything else the app appends — `page`, a sort,
 * a filter — changes the fixture's filename, which is why a request the CLI
 * cannot guess still has to be recorded by running the app. See the README.
 */
function fillQuery(
  constraints: readonly QueryConstraint[],
  identity: string,
): string {
  const query = new URLSearchParams()

  for (const constraint of constraints) {
    // A literal condition (`?mode=summary`) states its own value. A binding
    // (`?ref=[reference]`) and a bare name (`?ref`) both want a plausible one,
    // and the binding's name is the better hint when there is one.
    query.set(
      constraint.name,
      constraint.value ??
        bindingValue(constraint.param ?? constraint.name, identity),
    )
  }

  const search = query.toString()
  return search === '' ? '' : `?${search}`
}

/**
 * The request a registry key declares, with its bindings filled in.
 *
 * @param key a registry key, `"GET /api/property/[reference]"`
 * @param headers mock control headers to send, e.g. a pinned seed or count
 * @throws {InvalidRegistryKeyError} for a key that does not parse
 */
export function declaredRequest(
  key: string,
  headers: Readonly<Record<string, string>> = {},
): Request {
  const { method, pattern, query } = parseKey(key)
  const identity = `${method} ${pattern}`
  const url = `${ORIGIN}${fillPattern(pattern, identity)}${fillQuery(query, identity)}`

  return new Request(url, { method, headers })
}

/** A request as it reads in a report: `GET /api/property/A7KQ2M1X`. */
export function describeRequest(request: Request): string {
  const url = new URL(request.url)
  return `${request.method} ${url.pathname}${url.search}`
}
