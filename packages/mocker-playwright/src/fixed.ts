import {
  findMatch,
  fixturePath,
  isRegistryMiss,
  MOCK_MARKER_HEADER,
  readControls,
  serializeFixture,
  serveFromRegistry,
} from '@homelync/mocker'
import type { MockControls, MockRegistry, RegistryMiss } from '@homelync/mocker'
import type { FixtureStore } from './store'

/**
 * Fixed responses: generate once, then answer from a file — and, unlike
 * Storybook, **fail the test that had to write one**.
 *
 * The policy is inherited nearly whole from `mocker-storybook/src/fixed.ts`. The
 * derivation of the filename and of the bytes is literally shared, in
 * `@homelync/mocker/core`, so a store can be pointed at by both. Two things
 * differ, and both follow from a test being asserted on rather than looked at:
 *
 * 1. **A missing fixture is a failure.** Storybook writes one and carries on,
 *    which is right for a preview and actively wrong here. Under CI the
 *    forgiving version produces: someone adds a test, never runs it locally,
 *    pushes; CI has no fixture, generates one, serves it, the test is green, and
 *    the file dies with the container. The reviewer sees a test and no fixture in
 *    the diff, and the test asserts on faker output with nothing saying so. This
 *    is exactly what `toMatchSnapshot` does about a missing baseline, for exactly
 *    that reason.
 * 2. **Writing can be refused.** `write: 'none'` still fails, so a run that must
 *    not touch the working tree can say so.
 *
 * What does *not* differ: a fixture that fails its schema is a 500 naming the
 * file. Regenerating would destroy the edit that was the whole point, and
 * serving it unchecked moves the failure into the component, where it looks like
 * a bug in the component.
 */

/** Names the fixture a response was replayed from, so the trace shows the file. */
export const MOCK_FIXTURE_HEADER: string = 'x-mock-fixture'

const OK = 200
const CLIENT_ERROR = 400
const SERVER_ERROR = 500

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/** What serving from the store did, beyond producing an answer. */
export interface FixedOutcome {
  readonly result: Response | RegistryMiss
  /** The fixture written for this request, as a store-relative name. */
  readonly wrote?: string
  /** The fixture this request needed, which `write: 'none'` forbade writing. */
  readonly absent?: string
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
 * The check is here rather than in the store because zod is here. The store
 * deals in bytes precisely so that it need not know what a schema is.
 */
async function replay(
  request: Request,
  registry: MockRegistry,
  name: string,
  body: string,
  controls: MockControls,
): Promise<Response | RegistryMiss | null> {
  const url = new URL(request.url)
  const match = findMatch(
    Object.keys(registry),
    request.method,
    url.pathname,
    url.searchParams,
  )
  // Nothing declared for this request: let the registry answer, so a stale file
  // cannot capture a path the registry has since dropped.
  if (match === null) return null

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
 * @param store where fixtures live
 * @param write whether a missing fixture may be created
 */
export async function serveFixed(
  request: Request,
  registry: MockRegistry,
  store: FixtureStore,
  write: 'missing' | 'none',
): Promise<FixedOutcome> {
  let controls: MockControls
  let name: string
  try {
    controls = readControls(request.headers)
    name = fixturePath(request, controls)
  } catch {
    // A malformed control header. `handle()` turns that into a 400 naming the
    // header, which is a better answer than anything this module could give.
    return { result: await serveFromRegistry(request, registry) }
  }

  // A requested failure carries no data worth keeping, and a 500 written to disk
  // would become the endpoint's permanent answer — including for the test that
  // did not ask for one.
  if ((controls.status ?? OK) >= CLIENT_ERROR) {
    return { result: await serveFromRegistry(request, registry) }
  }

  const stored = await store.read(name)
  if (stored !== null) {
    const replayed = await replay(request, registry, name, stored, controls)
    if (replayed !== null) return { result: replayed }
  }

  const result = await serveFromRegistry(request, registry)
  if (isRegistryMiss(result) || !result.ok) return { result }

  const body = await result.clone().text()
  // A bodiless success — 204, 304 — has nothing to pin, and an empty file would
  // fail its schema on the next request.
  if (body === '') return { result }

  if (write === 'none') return { result, absent: name }

  await store.write(name, serializeFixture(body))
  return { result, wrote: name }
}
