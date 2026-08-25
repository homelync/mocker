import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  fixturePath,
  isRegistryMiss,
  MOCK_COUNT_HEADER,
  MOCK_SEED_HEADER,
  readControls,
  serializeFixture,
  serveFromRegistry,
} from '@homelync/mocker'
import type { MockRegistry, MockRegistryEntry } from '@homelync/mocker'
import { declaredRequest, describeRequest } from './requests'

/**
 * Every endpoint in a registry, written to disk once.
 *
 * The layout is `fixturePath`'s, unchanged and deliberately so: these files are
 * the ones the Playwright and Storybook adapters already replay, so seeding a
 * store is what this command *is*. It answers the failure `mocker-playwright`'s
 * `fixed.ts` describes at length — someone adds a test, never runs it locally,
 * and CI generates a fixture, serves it, passes, then throws the file away —
 * by putting the fixtures in the repository before the first run rather than
 * after it.
 *
 * Two rules follow from a fixture being a committed, hand-edited, reviewed file:
 *
 * 1. **An existing file is left alone.** Regenerating would destroy the edit
 *    that was the whole point of the file being on disk. `force` is the way to
 *    say otherwise, and it is a deliberate act.
 * 2. **A failure is reported, not swallowed.** An entry whose schema throws
 *    means the registry and the generator disagree, and finding that out here
 *    beats finding it out as a red test with no obvious cause.
 */

/** What happened to one registry entry. */
export type EmitStatus = 'written' | 'kept' | 'skipped' | 'failed'

/** One entry's outcome. */
export interface EmitResult {
  /** The registry key, verbatim. */
  readonly key: string
  /**
   * `written` covers a dry run: the bytes were produced and the file was not,
   * because the caller asked for the report and not the effect.
   */
  readonly status: EmitStatus
  /** The request that was generated, `GET /api/property/A7KQ2M1X`. */
  readonly request: string
  /** Absolute path to the fixture, when the entry produced one. */
  readonly file?: string
  /** Why, for `skipped` and `failed`. */
  readonly reason?: string
}

/** How a run is configured. */
export interface EmitOptions {
  /** Directory the fixture tree is rooted at. Created as needed. */
  readonly out: string
  /**
   * Fixed values for bindings, by name: `{ reference: "lorem999" }` puts
   * `lorem999` wherever `[reference]` appears. Anything unnamed is guessed from
   * the generator's name rules, as before.
   */
  readonly params?: Readonly<Record<string, string>>
  /** `x-mock-seed`, if the fixtures should pin one. */
  readonly seed?: string
  /** `x-mock-count`, sizing every primary collection. */
  readonly count?: number
  /** Overwrite fixtures that already exist. Off by default; see above. */
  readonly force?: boolean
  /** Produce the report and none of the files. */
  readonly dryRun?: boolean
  /** Leave out entries carrying a `planned` ticket reference. */
  readonly skipPlanned?: boolean
}

const CLIENT_ERROR = 400

/** The control headers a run sends with every request. */
function controlHeaders(options: EmitOptions): Record<string, string> {
  const headers: Record<string, string> = {}
  if (options.seed !== undefined) headers[MOCK_SEED_HEADER] = options.seed
  if (options.count !== undefined) {
    headers[MOCK_COUNT_HEADER] = String(options.count)
  }
  return headers
}

/**
 * Write one fixture, refusing any name that would land outside the root.
 *
 * `fixturePath` percent-encodes every segment, so a name it produced cannot
 * contain a traversal to begin with. Checked anyway, exactly as the Playwright
 * store checks it: the guarantee should hold by construction rather than by the
 * good behaviour of the module that happens to call it today.
 */
async function writeFixture(
  root: string,
  name: string,
  body: string,
): Promise<string> {
  const target = path.resolve(root, name)
  if (!target.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Fixture name "${name}" escapes the output directory.`)
  }

  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, body, 'utf8')
  return target
}

/** Whether a fixture is already on disk. */
async function exists(file: string): Promise<boolean> {
  try {
    // `access` would do, but `isFile` also declines to treat a *directory*
    // sitting where a fixture belongs as a fixture worth keeping.
    return (await stat(file)).isFile()
  } catch {
    return false
  }
}

/** The message inside a generated error response, if it carries one. */
async function errorFrom(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'string'
    ) {
      return body.error
    }
  } catch {
    // Not JSON. The status alone is all there is to report.
  }
  return `the mock answered ${String(response.status)}`
}

function failure(key: string, request: string, reason: string): EmitResult {
  return { key, status: 'failed', request, reason }
}

/**
 * The result for an entry a run declines before generating anything, or
 * `undefined` for one it should go on and generate.
 *
 * A missing entry is a malformed registry rather than a bad endpoint, and is
 * reported as a failure so the key is not silently dropped from the report.
 */
function declined(
  key: string,
  entry: MockRegistryEntry | undefined,
  options: EmitOptions,
): EmitResult | undefined {
  if (entry === undefined) return failure(key, key, 'no such entry')

  if (options.skipPlanned === true && entry.planned !== undefined) {
    return {
      key,
      status: 'skipped',
      request: key,
      reason: `planned (${entry.planned})`,
    }
  }

  return undefined
}

/** Generate and write the fixture for one entry. */
async function emitOne(
  key: string,
  registry: MockRegistry,
  options: EmitOptions,
  root: string,
): Promise<EmitResult> {
  const early = declined(key, registry[key], options)
  if (early !== undefined) return early

  const request = declaredRequest(key, controlHeaders(options), options.params)
  const described = describeRequest(request)

  const name = fixturePath(request, readControls(request.headers))
  const target = path.resolve(root, name)

  if (options.force !== true && (await exists(target))) {
    return { key, status: 'kept', request: described, file: target }
  }

  const result = await serveFromRegistry(request, registry)

  // A key that does not match the request derived from that very key means the
  // filled-in bindings broke a constraint the key states — a bug here, not in
  // the registry, and one worth saying out loud.
  if (isRegistryMiss(result)) {
    return failure(key, described, result.error)
  }
  if (result.status >= CLIENT_ERROR) {
    return failure(key, described, await errorFrom(result))
  }

  const body = await result.text()
  // A bodiless success — 204, 304 — has nothing to pin, and an empty file would
  // fail its schema the first time it was replayed.
  if (body === '') {
    return {
      key,
      status: 'skipped',
      request: described,
      reason: `${String(result.status)} carries no body`,
    }
  }

  if (options.dryRun === true) {
    return { key, status: 'written', request: described, file: target }
  }

  const file = await writeFixture(root, name, serializeFixture(body))
  return { key, status: 'written', request: described, file }
}

/**
 * Write a fixture for every endpoint the registry declares.
 *
 * Sequential rather than concurrent, and that is not laziness: the entries share
 * one output tree, the work is dominated by the schema thunks' dynamic imports
 * (which the module cache serialises anyway), and a report that arrives in
 * registry order is one a developer can read against the table they wrote.
 *
 * Never throws for a bad entry — the failure lands in that entry's result, so a
 * single broken schema does not cost the other twenty their fixtures. A bad
 * `seed` or `count` is the one exception, and it is not about an entry.
 *
 * @param registry the host's endpoint declarations
 * @param options where the tree goes, and what to do about files already in it
 * @returns one result per key, in registry order
 * @throws {InvalidControlError} if `seed` or `count` is not a usable control
 */
export async function generateFixtures(
  registry: MockRegistry,
  options: EmitOptions,
): Promise<EmitResult[]> {
  // Checked once, against the library's own rules, before anything is written.
  // Per-entry it would be the same complaint twenty times over, with the actual
  // mistake — the command line — buried in the middle of them.
  readControls(new Headers(controlHeaders(options)))

  const root = path.resolve(options.out)
  const results: EmitResult[] = []

  for (const key of Object.keys(registry)) {
    try {
      results.push(await emitOne(key, registry, options, root))
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      results.push(failure(key, key, reason))
    }
  }

  return results
}
