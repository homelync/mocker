import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * `mocker.config.json`, read off disk.
 *
 * The command's three repeated arguments — where the registry is, where the
 * fixtures go, and what to put in a binding — are properties of the *repository*
 * rather than of a run, so writing them out on every invocation is the sort of
 * duplication a `predev` script, a CI step and a developer's shell each get
 * subtly wrong. The file states them once.
 *
 * Not a published subpath, unlike `src/config.ts` in the runtime packages. This
 * is a reader for a host's file, not a surface a host imports.
 *
 * JSON rather than a module, and deliberately: the registry already needs type
 * stripping or a loader to import, and making the *configuration* need one too
 * would mean the file that names the escape hatch could not be read without it.
 */

/** The file looked for when none is named. */
export const CONFIG_FILE: string = 'mocker.config.json'

/** A config file that is missing when named, unreadable, or wrong. */
export class ConfigError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'ConfigError'
  }
}

/** What `mocker.config.json` may state. */
export interface MockerConfig {
  /** Module holding the registry table, relative to the config file. */
  readonly registry?: string
  /** Directory the fixture tree is rooted at, relative to the config file. */
  readonly out?: string
  /**
   * Fixed values for bindings, by name: `{ "reference": "lorem999" }` puts
   * `lorem999` wherever `[reference]` appears, in a path or in a query.
   *
   * The generated value is a guess — a name rule's best effort — and a guess is
   * wrong whenever the host's own data is not. Naming the value is how a fixture
   * tree comes to hold the references the seeded database actually has.
   */
  readonly params?: Readonly<Record<string, string>>
}

/** A config file, and where it was read from. */
export interface LoadedConfig {
  readonly config: MockerConfig
  /** Absolute path to the file. */
  readonly file: string
  /** The file's directory: what its relative paths are relative to. */
  readonly dir: string
}

/** Keys a config may carry; anything else is a typo worth reporting. */
const KNOWN: readonly string[] = ['$schema', 'registry', 'out', 'params']

/** A key's value as a non-empty string, or a {@link ConfigError} naming it. */
function text(value: unknown, where: string, file: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ConfigError(
      `"${where}" in ${file} must be a non-empty string, not ${JSON.stringify(value) ?? 'undefined'}.`,
    )
  }
  return value
}

/** The `params` table, checked value by value. */
function params(
  value: unknown,
  file: string,
): Readonly<Record<string, string>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ConfigError(
      `"params" in ${file} must be an object mapping a binding name to its value, e.g. { "reference": "lorem999" }.`,
    )
  }

  const table: Record<string, string> = {}
  for (const [name, raw] of Object.entries(value)) {
    // An empty value would produce an empty path segment, which no key matches:
    // the fixture would be written under a name nothing ever asks for.
    table[name] = text(raw, `params.${name}`, file)
  }
  return table
}

/** Parsed JSON as a config, or a {@link ConfigError} naming what is wrong. */
function validate(raw: unknown, file: string): MockerConfig {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ConfigError(`${file} must contain a JSON object.`)
  }

  const unknown = Object.keys(raw).filter((key) => !KNOWN.includes(key))
  if (unknown.length > 0) {
    throw new ConfigError(
      `${file} has no option named "${unknown[0] ?? ''}". It takes: ${KNOWN.slice(1).join(', ')}.`,
    )
  }

  // `in` narrows each key to `unknown` on an object-typed value, which is what
  // lets this read the file without casting it to a shape it has not been
  // checked against yet.
  return {
    registry:
      'registry' in raw ? text(raw.registry, 'registry', file) : undefined,
    out: 'out' in raw ? text(raw.out, 'out', file) : undefined,
    params: 'params' in raw ? params(raw.params, file) : undefined,
  }
}

/** Whether a thrown error is "there is no such file". */
function isMissingFile(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  )
}

/**
 * Read a config file.
 *
 * A file the caller *named* and cannot be read is an error; the conventional
 * one simply not being there is not, because most repositories have no config
 * and the command works without one.
 *
 * @param file path to a config file, if one was named on the command line
 * @param cwd directory the conventional {@link CONFIG_FILE} is looked for in
 * @returns the config and its directory, or `undefined` when there is none
 * @throws {ConfigError} for a file that will not read, will not parse, or
 *   states an option this command does not have
 */
export async function loadConfig(
  file?: string,
  cwd: string = process.cwd(),
): Promise<LoadedConfig | undefined> {
  const named = file !== undefined
  const absolute = path.resolve(cwd, file ?? CONFIG_FILE)

  let contents
  try {
    contents = await readFile(absolute, 'utf8')
  } catch (error) {
    if (!named && isMissingFile(error)) return undefined

    const reason = error instanceof Error ? error.message : String(error)
    throw new ConfigError(`Could not read ${absolute}: ${reason}.`, {
      cause: error,
    })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new ConfigError(`${absolute} is not valid JSON: ${reason}.`, {
      cause: error,
    })
  }

  return {
    config: validate(parsed, absolute),
    file: absolute,
    dir: path.dirname(absolute),
  }
}
