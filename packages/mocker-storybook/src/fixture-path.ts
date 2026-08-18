import { hashSeed, requestSignature } from '@magicspon/mocker'
import type { MockControls } from '@magicspon/mocker'

/**
 * Where a request's fixed response lives, as a path under the fixture store.
 *
 * A fixture store is only useful if the same request lands on the same file every time,
 * on every machine, forever — a fixture is committed, reviewed and hand-edited,
 * and a name that drifts turns all three into wasted work. So this is a pure
 * function of the request, deliberately with no clock, no counter and no
 * registry key in it: two developers hitting the same endpoint edit the same
 * file, and renaming a registry key does not orphan the data it holds.
 *
 * The shape is a mirror of the URL — `GET/api/devices/3f9a1c2d.json` — because
 * the directory listing is the interface. Someone looking for the fixture behind
 * `/api/property/ABC123` should find it by reading directory names, not by
 * hashing a string in their head.
 *
 * Only the *leaf* is a hash, and only because the part it stands for — the query
 * string, plus whatever controls the story set — is not expressible as a
 * filename. Two pages of one collection differ solely in `?page=`, so they must
 * be two files; nesting a directory per parameter would bury the data several
 * levels deep for the common case of no query at all.
 */

/** Characters a path segment may carry through to a filename unencoded. */
const UNSAFE = /[^A-Za-z0-9._-]/g

/** Segments that mean something to a filesystem rather than naming a file. */
const RELATIVE = new Set(['.', '..'])

/** How many hex digits of the signature hash name the file. */
const HASH_LENGTH = 8

/** A segment as it was written, or as it stands if the escape is malformed. */
function decode(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

/**
 * One URL path segment, as a filename.
 *
 * Decoded before it is re-encoded, so the name is a function of the path the
 * caller *meant* rather than of how their client happened to spell it: `/a b`
 * and `/a%20b` are one endpoint and must not become two files that have to be
 * edited in step. `URL` has already canonicalised the pathname, so this only has
 * to undo that canonicalisation once.
 *
 * Percent-encoding on the way back rather than a `-` substitution because the
 * mapping has to stay injective — `/property/A B` and `/property/A-B` are
 * different endpoints — and because it leaves nothing a filesystem reads as
 * structure. A dot survives an ordinary segment (`v1.2` stays readable) and is
 * escaped only when the segment is `.` or `..`, the one case where it means
 * something other than itself.
 *
 * That last case is unreachable in practice: `URL` resolves dot segments away,
 * encoded or not, long before this sees them. It is here because the guarantee
 * "no name this produces can escape the store" should hold by construction and
 * not by the good behaviour of a parser two layers up.
 */
function safeSegment(segment: string): string {
  const decoded = decode(segment)
  if (RELATIVE.has(decoded)) return decoded.replaceAll('.', '%2E')

  return decoded.replaceAll(UNSAFE, (character) =>
    encodeURIComponent(character),
  )
}

/**
 * Everything about a request that changes the bytes it should answer with.
 *
 * The request signature is what `handle()` already seeds from, so a fixture
 * created for a request is keyed by exactly what that request would have
 * generated. The controls are appended because a story's `count` or `seed` also
 * changes the body — without them two stories of one endpoint would pin to one
 * file and the second story's controls would silently do nothing.
 *
 * `delayMs` is deliberately absent: it changes when the response arrives, not
 * what it says, and including it would give a story about a loading state its
 * own redundant copy of the data.
 */
function signature(method: string, url: URL, controls: MockControls): string {
  const request = requestSignature(method, url.pathname, url.searchParams)
  const seed = controls.seed ?? ''
  const count = controls.count === undefined ? '' : String(controls.count)
  const status = controls.status === undefined ? '' : String(controls.status)

  return `${request}|seed=${seed}|count=${count}|status=${status}`
}

/**
 * The fixture path for a request: `GET/api/devices/3f9a1c2d.json`.
 *
 * The request must be the one the *registry* declares — prefix already stripped
 * by `toRegistryPath` — for the same reason `serveFromRegistry` insists on it:
 * a `baseUrl` is a detail of where a story mounted the mock, and folding it into
 * the filename would give one endpoint two fixtures that must be edited in step.
 *
 * @param request the request as the registry declares it
 * @param controls the story's controls, already read from the request's headers
 */
export function fixturePath(request: Request, controls: MockControls): string {
  const url = new URL(request.url)
  const hash = hashSeed(signature(request.method, url, controls))
    .toString(16)
    .padStart(HASH_LENGTH, '0')

  const directories = url.pathname
    .split('/')
    .filter((segment) => segment !== '')
    .map(safeSegment)

  return [request.method.toUpperCase(), ...directories, `${hash}.json`].join(
    '/',
  )
}
