import { parseArgs } from 'node:util'
import { isLocaleName } from '@homelync/mocker'

/**
 * The command line, and nothing else.
 *
 * Separated from `cli.ts` because argument parsing is the one part of a command
 * worth testing directly — every mistake in it is silent (a flag that parses to
 * the wrong shape simply does the wrong thing) and none of it needs a
 * filesystem, a registry or a process to exercise.
 *
 * `--help` and `--version` come back as *results* rather than exiting here, for
 * the same reason: a function that calls `process.exit` cannot be asserted on.
 */

/** A command line this module cannot act on. */
export class UsageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UsageError'
  }
}

/**
 * What the command line said, before `mocker.config.json` has a turn.
 *
 * `registry` and `out` are optional *here* and required in `CliOptions`,
 * because a config file may state either: whether the line is complete is a
 * question this module cannot answer, so it does not try. `resolveOptions` does.
 */
export interface CliArgs {
  /** Module holding the registry table. */
  readonly registry?: string
  /** Directory the fixture tree is rooted at. */
  readonly out?: string
  /** Config file to read instead of the conventional one. */
  readonly config?: string
  /** Export to read the table from; auto-detected when absent. */
  readonly exportName?: string
  /** `x-mock-seed` sent with every request. */
  readonly seed?: string
  /** `x-mock-count` sent with every request. */
  readonly count?: number
  /** `x-mock-locale` sent with every request: locale names, in priority order. */
  readonly locale?: readonly string[]
  readonly force: boolean
  readonly dryRun: boolean
  readonly skipPlanned: boolean
  /** Report as JSON on stdout, for a script rather than a person. */
  readonly json: boolean
}

/** Parsed arguments: a run, or one of the two commands that only print. */
export type ParsedArgs =
  | { readonly kind: 'run'; readonly args: CliArgs }
  | { readonly kind: 'help' }
  | { readonly kind: 'version' }

export const USAGE: string = `mocker — write every endpoint in a mock registry to disk

Usage
  mocker <registry> <out> [options]
  mocker <registry> --out <dir> [options]
  mocker [options]                     with a mocker.config.json

Arguments
  <registry>  module exporting the registry table, e.g. ./src/mocks/registry.ts
  <out>       directory to write the fixture tree into

Options
  -o, --out <dir>       output directory, if not given as the second argument
      --config <file>   config file to read (default: ./mocker.config.json)
  -e, --export <name>   export holding the table (default: mockRegistry, registry, default)
  -s, --seed <value>    pin x-mock-seed on every request
  -c, --count <n>       pin x-mock-count, sizing every primary collection
  -l, --locale <names>  pin x-mock-locale, e.g. de_CH or de_CH,de (default: en_GB)
  -f, --force           overwrite fixtures that already exist (default: keep them)
  -n, --dry-run         report what would be written, and write nothing
      --skip-planned    leave out entries carrying a \`planned\` ticket reference
      --json            report as JSON on stdout
  -h, --help            show this
  -v, --version         print the version

Notes
  mocker.config.json, in the working directory, may state the registry, the
  output directory, the locale, and fixed values for bindings:

    { "registry": "./src/mocks/registry.ts",
      "out": "./tests/mocks",
      "locale": "de_CH",
      "params": { "reference": "lorem999" } }

  An argument on the command line wins over the file. Paths in the file are
  relative to the file.

  A locale sets the language of every generated value, and of the bindings in a
  fixture's filename with it. "en" backs whatever is named, since most locales
  define only part of the data. An entry that states its own locale is overruled,
  as it is by --seed and --count. Fixtures generated under a locale are named
  apart from the ones generated without, so a tree can hold both.

  Existing fixtures are kept, because they are committed files somebody may have
  edited by hand. Pass --force to regenerate them.

  Bindings — [reference] in a path, ?ref=[reference] in a query — are filled with
  deterministic faker values derived from the endpoint, so two machines produce
  identical trees. A request the registry does not fully describe (an app that
  also sends ?page=2) lands in a different file, and only running the app can
  record that one.

Exit codes
  0  every endpoint accounted for
  1  at least one endpoint failed to generate
  2  the command itself was wrong`

/** A whole non-negative number, or a {@link UsageError} naming the flag. */
function integer(flag: string, raw: string): number {
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0) {
    throw new UsageError(`--${flag} expects a whole number, not "${raw}".`)
  }
  return value
}

/**
 * The locale chain, from `--locale de_CH,de` or a repeated `--locale`.
 *
 * Names are checked here rather than left to the mock, because a typo would
 * otherwise fail once per entry, twenty entries deep into a report, for a
 * mistake that is on the command line in front of you.
 */
function locales(raw: readonly string[]): readonly string[] | undefined {
  const names = raw
    .flatMap((value) => value.split(','))
    .map((name) => name.trim())
    .filter((name) => name !== '')

  for (const name of names) {
    if (!isLocaleName(name)) {
      throw new UsageError(
        `--locale does not know "${name}". Expected a faker locale name, e.g. de_CH.`,
      )
    }
  }

  return names.length === 0 ? undefined : names
}

/**
 * Parse a command line.
 *
 * @param argv arguments after the executable and script, i.e. `process.argv.slice(2)`
 * @throws {UsageError} for an unknown flag, a missing argument or a bad value
 */
export function parseCliArgs(argv: readonly string[]): ParsedArgs {
  let parsed
  try {
    parsed = parseArgs({
      args: [...argv],
      allowPositionals: true,
      options: {
        out: { type: 'string', short: 'o' },
        config: { type: 'string' },
        export: { type: 'string', short: 'e' },
        seed: { type: 'string', short: 's' },
        count: { type: 'string', short: 'c' },
        locale: { type: 'string', short: 'l', multiple: true },
        force: { type: 'boolean', short: 'f' },
        'dry-run': { type: 'boolean', short: 'n' },
        'skip-planned': { type: 'boolean' },
        json: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
    })
  } catch (error) {
    // `parseArgs` already says which flag it choked on, and better than a
    // rewrite of the message would.
    throw new UsageError(error instanceof Error ? error.message : String(error))
  }

  const { values, positionals } = parsed
  if (values.help === true) return { kind: 'help' }
  if (values.version === true) return { kind: 'version' }

  const [registry, positionalOut, ...extra] = positionals
  if (extra.length > 0) {
    throw new UsageError(`Unexpected argument "${extra[0] ?? ''}".`)
  }

  return {
    kind: 'run',
    args: {
      registry,
      // The flag wins over the positional, which is the way round that lets a
      // wrapper script append `--out` to a command line it did not write.
      out: values.out ?? positionalOut,
      config: values.config,
      exportName: values.export,
      seed: values.seed,
      count:
        values.count === undefined ? undefined : integer('count', values.count),
      locale: values.locale === undefined ? undefined : locales(values.locale),
      force: values.force === true,
      dryRun: values['dry-run'] === true,
      skipPlanned: values['skip-planned'] === true,
      json: values.json === true,
    },
  }
}
