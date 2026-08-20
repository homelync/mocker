import { describe, expect, it } from 'vitest'
import { parseCliArgs, UsageError } from './args'
import type { CliOptions } from './args'

/**
 * Every mistake in argument parsing is silent — a flag that lands in the wrong
 * field does the wrong thing without complaining — so this is the one part of a
 * command worth asserting line by line.
 */

/** The options a run parses to, or a failure naming what came back instead. */
function options(...argv: string[]): CliOptions {
  const parsed = parseCliArgs(argv)
  if (parsed.kind !== 'run') {
    throw new Error(`Expected a run, got "${parsed.kind}"`)
  }
  return parsed.options
}

describe('parseCliArgs', () => {
  it('takes the registry and the output directory as positionals', () => {
    expect(options('./registry.ts', './tests/mocks')).toMatchObject({
      registry: './registry.ts',
      out: './tests/mocks',
    })
  })

  it('takes the output directory as a flag', () => {
    expect(options('./registry.ts', '--out', './mocks')).toMatchObject({
      out: './mocks',
    })
  })

  /** So a wrapper can append `--out` to a command line it did not write. */
  it('lets the flag win over the positional', () => {
    expect(
      options('./registry.ts', './positional', '-o', './flag'),
    ).toMatchObject({ out: './flag' })
  })

  it('defaults every switch to off', () => {
    expect(options('./registry.ts', './mocks')).toMatchObject({
      force: false,
      dryRun: false,
      skipPlanned: false,
      json: false,
      exportName: undefined,
      seed: undefined,
      count: undefined,
    })
  })

  it('reads the switches', () => {
    expect(
      options(
        './registry.ts',
        './mocks',
        '--force',
        '--dry-run',
        '--skip-planned',
        '--json',
      ),
    ).toMatchObject({
      force: true,
      dryRun: true,
      skipPlanned: true,
      json: true,
    })
  })

  it('reads the short switches', () => {
    expect(options('./registry.ts', './mocks', '-f', '-n')).toMatchObject({
      force: true,
      dryRun: true,
    })
  })

  it('reads the value flags', () => {
    expect(
      options('./r.ts', './mocks', '-e', 'table', '-s', 'abc', '-c', '4'),
    ).toMatchObject({ exportName: 'table', seed: 'abc', count: 4 })
  })

  it.each(['--help', '-h'])('returns help for %s', (flag) => {
    expect(parseCliArgs([flag]).kind).toBe('help')
  })

  it.each(['--version', '-v'])('returns the version for %s', (flag) => {
    expect(parseCliArgs([flag]).kind).toBe('version')
  })

  /**
   * Answered before the positionals are checked, so the flag someone reaches
   * for when they do not know the arguments does not demand the arguments.
   * A *misspelled* flag still wins, because `parseArgs` rejects the line before
   * anything here sees it — and being told about the typo is the better answer.
   */
  it('answers help without a registry or an output directory', () => {
    expect(parseCliArgs(['--help']).kind).toBe('help')
    expect(() => parseCliArgs(['--help', '--nonsense'])).toThrow(UsageError)
  })
})

describe('refusals', () => {
  it('refuses a line with no registry', () => {
    expect(() => parseCliArgs([])).toThrow(UsageError)
    expect(() => parseCliArgs([])).toThrow(/Missing <registry>/)
  })

  it('refuses a line with no output directory', () => {
    expect(() => parseCliArgs(['./registry.ts'])).toThrow(/Missing <out>/)
  })

  it('refuses a third positional', () => {
    expect(() => parseCliArgs(['./r.ts', './mocks', './extra'])).toThrow(
      /Unexpected argument "\.\/extra"/,
    )
  })

  it('refuses an unknown flag', () => {
    expect(() => parseCliArgs(['./r.ts', './mocks', '--nope'])).toThrow(
      UsageError,
    )
  })

  it.each(['twenty', '1.5', '-1'])('refuses --count %s', (value) => {
    expect(() => parseCliArgs(['./r.ts', './mocks', '--count', value])).toThrow(
      UsageError,
    )
  })
})
