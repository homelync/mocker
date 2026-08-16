import { handle } from '../core'
import type { MockEndpoint } from '../core'
import {
  describeConstraint,
  findMatch,
  isPathRegistered,
  matchPattern,
  parseKey,
} from './match'
import type { MockRegistry } from './types'

/**
 * Serve a request from a registry — the whole registry mechanism, minus a
 * runtime.
 *
 * This is deliberately the *second* platform-agnostic seam. `handle()` answers
 * "given this endpoint, what is the response?"; this answers "given this
 * request, which endpoint?" — and every runtime that intercepts by path needs
 * both. A Next endpoint, a Playwright `page.route`, an MSW handler and a Nest
 * middleware differ only in how they obtain a `Request` and hand back a
 * `Response`; none of them should be re-implementing key matching, the 404
 * cases, or the schema thunk.
 *
 * The registry is a parameter, never an import. The table is host data — this
 * repo's endpoints, this repo's schemas — and a library that reaches out for it
 * cannot be lifted into a package.
 */

/** Statuses this module returns itself, rather than generating a body. */
const NOT_FOUND = 404

/** A registry lookup that produced no endpoint, and why. */
export interface RegistryMiss {
  readonly status: number
  readonly error: string
}

function miss(error: string): RegistryMiss {
  return { status: NOT_FOUND, error }
}

/**
 * Why nothing matched, in the terms the developer can act on.
 *
 * Three failures wear the same 404, and the middle one is new with query
 * constraints and by far the easiest to stare at: the path *is* declared for
 * this verb, but the request did not carry the parameters the key requires. On
 * Next that request was never even rewritten — it fell through to the real
 * route — so a developer who reached the mock endpoint by hand, or any runtime
 * that intercepts by path alone, would otherwise be told only "not registered"
 * about a key sitting right there in the table.
 */
function explainMiss(
  keys: readonly string[],
  method: string,
  url: URL,
): string {
  const constrained = keys
    .map((key) => ({ key, parsed: parseKey(key) }))
    .filter(({ parsed }) => parsed.method === method)
    .filter(({ parsed }) => parsed.query.length > 0)
    .filter(({ parsed }) => matchPattern(parsed.pattern, url.pathname) !== null)

  if (constrained.length > 0) {
    const expected = constrained
      .map(({ parsed }) => parsed.query.map(describeConstraint).join('&'))
      .map((query) => `?${query}`)
      .join(' or ')

    return `No mock declared for ${method} ${url.pathname}${url.search}; the registry declares this path only with ${expected}.`
  }

  // Interception matched on path, so the *real* handler for this verb has
  // become unreachable, and nothing else would ever say so.
  return isPathRegistered(keys, url.pathname)
    ? `No mock declared for ${method} ${url.pathname}; this path is captured by the mock, so its real handler is unreachable. Add the key to the registry, or remove the entry that captures the path.`
    : `No mock registered for ${method} ${url.pathname}`
}

/**
 * Serve `request` from `registry`, or explain why nothing matched.
 *
 * The request must carry the URL the **caller** asked for, not whatever path
 * the runtime's interception mechanism rewrote it to. `handle()` seeds from
 * `hash(method + path + sorted query)`, so serving a rewritten path would
 * silently return different data than the same request served any other way.
 * Reconstructing the original request is each adapter's one real job.
 *
 * @param request the request as the caller made it
 * @param registry the host's endpoint declarations
 * @returns a generated `Response`, or a {@link RegistryMiss} to render however
 *   the runtime renders an error
 */
export async function serveFromRegistry(
  request: Request,
  registry: MockRegistry,
): Promise<Response | RegistryMiss> {
  const url = new URL(request.url)
  const keys = Object.keys(registry)
  const match = findMatch(keys, request.method, url.pathname, url.searchParams)

  if (match === null) {
    return miss(explainMiss(keys, request.method, url))
  }

  // Non-null: `findMatch` only ever returns a key drawn from `keys`, which is
  // this registry's own key set.
  const declaration = registry[match.key]!
  const endpoint: MockEndpoint = {
    output: await declaration.schema(),
    status: declaration.status,
    options: declaration.options,
  }

  return handle(request, endpoint, { params: match.params })
}

/** Whether a {@link serveFromRegistry} result is a miss rather than a response. */
export function isRegistryMiss(
  result: Response | RegistryMiss,
): result is RegistryMiss {
  return !(result instanceof Response)
}
