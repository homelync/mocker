import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { MockRegistry } from '@homelync/mocker'

/**
 * Getting a host's registry out of a file and into this process.
 *
 * The awkward half of a command that is otherwise a loop. Every other consumer
 * of a registry is *imported by the host* — a `next.config.ts`, a Storybook
 * preview, a Playwright fixture — so the host's own toolchain has already
 * resolved the module by the time the table is in hand. A CLI has no toolchain
 * behind it and has to load the file itself.
 *
 * Node's type stripping carries the common case: a registry is written against
 * `MockRegistryDraft` with every schema a thunk and every type import erased,
 * which is exactly the subset `erasableSyntaxOnly` describes. What it does not
 * carry is a tsconfig `paths` alias — `@/mocks/schemas` means nothing to node —
 * and the Next example's registry says so in a comment for the same reason its
 * own config loader has the same limitation. {@link RegistryLoadError} names the
 * escape hatch rather than leaving it to be discovered.
 */

/**
 * Export names tried, in order, when the caller names none.
 *
 * `mockRegistry` first because it is what the checked-table idiom produces —
 * `const registry = {...}; export const mockRegistry = registry satisfies ...`
 * — so the *un*checked `registry` is often present too, and picking it would
 * quietly bypass the check the host wrote two statements to get.
 */
const CONVENTIONAL: readonly string[] = ['mockRegistry', 'registry', 'default']

/** A registry that could not be loaded, with the fix in the message. */
export class RegistryLoadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'RegistryLoadError'
  }
}

/**
 * Whether a value is a table of registry entries.
 *
 * Structural and shallow on purpose: the type is `Record<string, { schema:
 * () => Promise<ZodType> }>` and only the thunk is checkable without calling it.
 * Calling it to find out would load the host's schemas just to answer a question
 * about the table's shape.
 */
function isRegistry(value: unknown): value is MockRegistry {
  if (typeof value !== 'object' || value === null) return false

  const entries = Object.values(value)
  return (
    entries.length > 0 &&
    entries.every(
      (entry: unknown) =>
        typeof entry === 'object' &&
        entry !== null &&
        'schema' in entry &&
        typeof entry.schema === 'function',
    )
  )
}

/** The module's exports, or a `RegistryLoadError` explaining what stopped it. */
async function importModule(file: string): Promise<Record<string, unknown>> {
  const absolute = path.resolve(file)

  try {
    return (await import(pathToFileURL(absolute).href)) as Record<
      string,
      unknown
    >
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)

    // "The file is not there" is a different problem from "the file will not
    // load", and the loader is only an answer to the second — offered for the
    // first it sends someone to install tsx over a typo in a path. Node quotes
    // the specifier it could not find, so a message naming *this* file is the
    // first case and one naming something else is the second. Either spelling:
    // node reports the path, a loader in front of it reports the URL.
    const quoted = /Cannot find (?:module|package) '([^']+)'/.exec(reason)?.[1]
    const missing =
      quoted === absolute || quoted === pathToFileURL(absolute).href
    const hint =
      missing || !/\.tsx?$/.test(absolute)
        ? ''
        : ' If it imports through a tsconfig "paths" alias, or uses syntax node cannot strip, run the command under a loader: `NODE_OPTIONS=--import=tsx mocker …`.'

    throw new RegistryLoadError(
      `Could not load "${absolute}": ${reason}.${hint}`,
      {
        cause: error,
      },
    )
  }
}

/**
 * Read a registry out of a module.
 *
 * @param file path to the module holding the table, relative to the cwd
 * @param exportName the export to read; auto-detected from {@link CONVENTIONAL}
 *   when omitted
 * @throws {RegistryLoadError} if the module will not load, or holds no table
 */
export async function loadRegistry(
  file: string,
  exportName?: string,
): Promise<MockRegistry> {
  const module = await importModule(file)

  if (exportName !== undefined) {
    const value = module[exportName]
    if (value === undefined) {
      throw new RegistryLoadError(
        `"${file}" has no export named "${exportName}". It exports: ${Object.keys(module).join(', ')}.`,
      )
    }
    if (!isRegistry(value)) {
      throw new RegistryLoadError(
        `"${exportName}" in "${file}" is not a mock registry: expected a non-empty object whose every value has a \`schema\` function.`,
      )
    }
    return value
  }

  for (const name of CONVENTIONAL) {
    const value = module[name]
    if (isRegistry(value)) return value
  }

  throw new RegistryLoadError(
    `"${file}" exports no mock registry. Looked for ${CONVENTIONAL.join(', ')}; pass --export to name a different one.`,
  )
}
