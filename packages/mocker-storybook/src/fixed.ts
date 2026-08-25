import {
  findMatch,
  fixturePath,
  isRegistryMiss,
  MOCK_MARKER_HEADER,
  readControls,
  serializeFixture,
  serveFromRegistry,
} from '@homelync/mocker'
import type { MockControls, MockRegistry } from '@homelync/mocker'
import { readFixture, writeFixture } from './fixtures'

/**
 * Fixed responses: generate once, then answer from a file.
 *
 * The generator is already deterministic — the same request seeds the same data
 * on every machine — so this is not about stability. It is about *editing*.
 * A fixture on disk is a plain JSON file that can be opened, corrected to say
 * the thing the story is actually about, and committed; the generator gives you
 * plausible data, and this gives you the specific data. It is also what lets a
 * visual snapshot survive a schema gaining a field, which would otherwise change
 * every generated response at once.
 *
 * Written on the first miss rather than by a separate command, because a fixture
 * nobody generated is a fixture nobody has, and asking developers to run a
 * script before their stories work is how a feature goes unused.
 *
 * Deliberately layered *over* `serveFromRegistry` rather than inside it. The
 * library is stateless by construction — two processes serving one request agree
 * without sharing anything — and a filesystem is the exact opposite of that. It
 * belongs to the adapter that has a filesystem to reach.
 */

/** Names the fixture a response was replayed from, so devtools shows the file. */
export const MOCK_FIXTURE_HEADER = 'x-mock-fixture'

const OK = 200
const CLIENT_ERROR = 400
const SERVER_ERROR = 500

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/** The registry's answer, with a miss rendered the way MSW reads a pass. */
async function generate(
  request: Request,
  registry: MockRegistry,
): Promise<Response | undefined> {
  const result = await serveFromRegistry(request, registry)
  return isRegistryMiss(result) ? undefined : result
}

function fixtureError(
  name: string,
  error: unknown,
  issues?: unknown,
): Response {
  return Response.json(
    {
      error: `Mock fixture "${name}" no longer matches its schema: ${String(error)}`,
      issues,
    },
    {
      status: SERVER_ERROR,
      headers: { [MOCK_MARKER_HEADER]: '1', [MOCK_FIXTURE_HEADER]: name },
    },
  )
}

/**
 * A file on disk, checked against the schema it was generated from.
 *
 * A 500 rather than a quiet regeneration, and rather than serving it anyway.
 * These files are edited by hand, so drift is the expected failure — a field
 * renamed in the schema, a typo in an edit — and both of the alternatives hide
 * it: regenerating destroys the edit that was the whole point of the fixture,
 * and serving it unchecked moves the failure into the component, where it looks
 * like a bug in the component. This is the same call `handle()` makes about
 * generated output that fails its own schema, for the same reason.
 *
 * The check is here rather than in the Vite plugin because zod is here. The
 * store deals in bytes precisely so that it need not know what a schema is.
 */
async function replay(
  request: Request,
  registry: MockRegistry,
  name: string,
  body: string,
  controls: MockControls,
): Promise<Response | undefined> {
  const url = new URL(request.url)
  const match = findMatch(
    Object.keys(registry),
    request.method,
    url.pathname,
    url.searchParams,
  )
  // Nothing declared for this request: fall through, exactly as an unfixed
  // handler does, so a stale file cannot capture a path the registry dropped.
  if (match === null) return undefined

  // Non-null: `findMatch` only ever returns a key drawn from the set it was given.
  const entry = registry[match.key]!

  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch (error) {
    return fixtureError(name, error)
  }

  const schema = await entry.schema()
  const checked = schema.safeParse(parsed)
  if (!checked.success) {
    return fixtureError(
      name,
      'the file failed validation',
      checked.error.issues,
    )
  }

  if (controls.delayMs !== undefined && controls.delayMs > 0) {
    await sleep(controls.delayMs)
  }

  // `parsed`, not `checked.data`: a mock stands in for the wire, and the wire
  // carries a schema's input. The same choice `handle()` makes on the way out.
  return Response.json(parsed, {
    status: controls.status ?? entry.status ?? OK,
    headers: { [MOCK_MARKER_HEADER]: '1', [MOCK_FIXTURE_HEADER]: name },
  })
}

/**
 * Serve a request from its fixture, writing one if there is none.
 *
 * @param request the request as the registry declares it, prefix already stripped
 * @param registry the host's endpoint declarations
 * @returns a response, or `undefined` for MSW to carry on down the handler list
 */
export async function serveFixed(
  request: Request,
  registry: MockRegistry,
): Promise<Response | undefined> {
  let controls: MockControls
  let name: string
  try {
    controls = readControls(request.headers)
    name = fixturePath(request, controls)
  } catch {
    // A malformed control header. `handle()` turns that into a 400 naming the
    // header, which is a better answer than anything this module could give.
    return generate(request, registry)
  }

  // A requested failure carries no data worth keeping, and a 500 written to disk
  // would become the endpoint's permanent answer — including for the story that
  // did not ask for one.
  if ((controls.status ?? OK) >= CLIENT_ERROR)
    return generate(request, registry)

  const stored = await readFixture(name)
  if (stored.kind === 'hit') {
    return replay(request, registry, name, stored.body, controls)
  }

  const response = await generate(request, registry)
  if (stored.kind !== 'miss' || response === undefined || !response.ok) {
    return response
  }

  const body = await response.clone().text()
  // A bodiless success — 204, 304 — has nothing to pin, and an empty file would
  // fail its schema on the next request.
  if (body !== '') {
    await writeFixture(name, serializeFixture(body))
  }

  return response
}
