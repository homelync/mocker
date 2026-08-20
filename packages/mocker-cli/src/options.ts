import path from 'node:path'
import { UsageError } from './args'
import type { CliArgs } from './args'
import { CONFIG_FILE } from './config'
import type { LoadedConfig } from './config'

/**
 * The command line and `mocker.config.json`, resolved into one run.
 *
 * Its own module rather than a few lines in `cli.ts` for the reason argument
 * parsing is: precedence is the part of a config system that goes wrong
 * silently. A file that quietly overrides an argument, or a path resolved
 * against the wrong directory, produces a *working* command that writes the
 * fixtures somewhere nobody looks.
 *
 * Two rules, and both are worth stating out loud:
 *
 * 1. **The command line wins.** The file is the repository's default; an
 *    argument is what somebody typed *this time*, usually to override it.
 * 2. **A path in the file is relative to the file**, not to the working
 *    directory — so `pnpm mocks` means the same thing from a package as from
 *    the repo root.
 */

/** What a run needs, once the flags and the config file are resolved. */
export interface CliOptions {
  /** Module holding the registry table. */
  readonly registry: string
  /** Directory the fixture tree is rooted at. */
  readonly out: string
  /** Fixed values for bindings, by name. Stated by the config file only. */
  readonly params?: Readonly<Record<string, string>>
  /** Export to read the table from; auto-detected when absent. */
  readonly exportName?: string
  /** `x-mock-seed` sent with every request. */
  readonly seed?: string
  /** `x-mock-count` sent with every request. */
  readonly count?: number
  readonly force: boolean
  readonly dryRun: boolean
  readonly skipPlanned: boolean
  /** Report as JSON on stdout, for a script rather than a person. */
  readonly json: boolean
}

/** A path from the config file, against the file's own directory. */
function fromConfig(
  value: string | undefined,
  loaded: LoadedConfig | undefined,
): string | undefined {
  if (value === undefined || loaded === undefined) return undefined
  return path.resolve(loaded.dir, value)
}

/** What to tell someone who has given neither the argument nor the option. */
function missing(
  argument: string,
  option: string,
  what: string,
  loaded: LoadedConfig | undefined,
): UsageError {
  const where =
    loaded === undefined
      ? `create ${CONFIG_FILE} with "${option}" in it`
      : `add "${option}" to ${loaded.file}`

  return new UsageError(`Missing ${argument}: ${what}. Pass it, or ${where}.`)
}

/**
 * Resolve a run from the command line and the config file, if there is one.
 *
 * @param args the parsed command line
 * @param loaded the config file, or `undefined` when the repository has none
 * @throws {UsageError} when neither states the registry or the output directory
 */
export function resolveOptions(
  args: CliArgs,
  loaded?: LoadedConfig,
): CliOptions {
  const registry = args.registry ?? fromConfig(loaded?.config.registry, loaded)
  if (registry === undefined) {
    throw missing(
      '<registry>',
      'registry',
      'the module exporting the table',
      loaded,
    )
  }

  const out = args.out ?? fromConfig(loaded?.config.out, loaded)
  if (out === undefined) {
    throw missing(
      '<out>',
      'out',
      'the directory to write fixtures into',
      loaded,
    )
  }

  return {
    registry,
    out,
    // No flag equivalent: a binding value is a per-repository fact, and a
    // command line that had to restate it would be the thing the file exists
    // to remove.
    params: loaded?.config.params,
    exportName: args.exportName,
    seed: args.seed,
    count: args.count,
    force: args.force,
    dryRun: args.dryRun,
    skipPlanned: args.skipPlanned,
    json: args.json,
  }
}
