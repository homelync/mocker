import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { UsageError } from './args'
import type { CliArgs } from './args'
import type { LoadedConfig } from './config'
import { resolveOptions } from './options'

/**
 * Precedence, and the directory paths resolve against. Both are silent when
 * wrong — the command still runs, it just writes the fixtures somewhere nobody
 * looks — which is exactly the kind of mistake worth a test rather than a
 * careful reading.
 */

/** A command line with every switch off. */
function args(overrides: Partial<CliArgs> = {}): CliArgs {
  return {
    force: false,
    dryRun: false,
    skipPlanned: false,
    json: false,
    ...overrides,
  }
}

/** A config file at `/repo/mocker.config.json`. */
function config(contents: LoadedConfig['config']): LoadedConfig {
  const dir = path.resolve('/repo')
  return { config: contents, dir, file: path.join(dir, 'mocker.config.json') }
}

describe('resolveOptions', () => {
  it('takes both paths from the command line when it gives them', () => {
    expect(
      resolveOptions(args({ registry: './r.ts', out: './mocks' })),
    ).toMatchObject({ registry: './r.ts', out: './mocks' })
  })

  it('takes both paths from the config file when the line gives neither', () => {
    const options = resolveOptions(
      args(),
      config({ registry: './src/registry.ts', out: './tests/mocks' }),
    )

    expect(options).toMatchObject({
      registry: path.resolve('/repo/src/registry.ts'),
      out: path.resolve('/repo/tests/mocks'),
    })
  })

  /** The file is the repository's default; an argument is what somebody typed. */
  it('lets the command line win over the file', () => {
    const options = resolveOptions(
      args({ registry: './typed.ts', out: './typed' }),
      config({ registry: './configured.ts', out: './configured' }),
    )

    expect(options).toMatchObject({ registry: './typed.ts', out: './typed' })
  })

  it('takes each path from wherever it was given', () => {
    const options = resolveOptions(
      args({ out: './typed' }),
      config({ registry: './src/registry.ts', out: './configured' }),
    )

    expect(options).toMatchObject({
      registry: path.resolve('/repo/src/registry.ts'),
      out: './typed',
    })
  })

  /** So `pnpm mocks` means the same thing from a package as from the root. */
  it('resolves a configured path against the config file, not the cwd', () => {
    const options = resolveOptions(
      args(),
      config({ registry: 'r.ts', out: 'm' }),
    )

    expect(options.out).toBe(path.resolve('/repo/m'))
    expect(options.out).not.toBe(path.resolve('m'))
  })

  it('carries the params through, and leaves them unset without a config', () => {
    const params = { reference: 'lorem999' }

    expect(
      resolveOptions(
        args({ registry: './r.ts', out: './m' }),
        config({ params }),
      ).params,
    ).toEqual(params)
    expect(
      resolveOptions(args({ registry: './r.ts', out: './m' })).params,
    ).toBeUndefined()
  })

  it('carries the flags through untouched', () => {
    const options = resolveOptions(
      args({
        registry: './r.ts',
        out: './m',
        exportName: 'table',
        seed: 'abc',
        count: 4,
        force: true,
        dryRun: true,
        skipPlanned: true,
        json: true,
      }),
    )

    expect(options).toMatchObject({
      exportName: 'table',
      seed: 'abc',
      count: 4,
      force: true,
      dryRun: true,
      skipPlanned: true,
      json: true,
    })
  })
})

describe('refusals', () => {
  it('refuses a run with no registry anywhere', () => {
    expect(() => resolveOptions(args({ out: './m' }))).toThrow(UsageError)
    expect(() => resolveOptions(args({ out: './m' }))).toThrow(
      /Missing <registry>.*create mocker\.config\.json/s,
    )
  })

  it('refuses a run with no output directory anywhere', () => {
    expect(() => resolveOptions(args({ registry: './r.ts' }))).toThrow(
      /Missing <out>/,
    )
  })

  /** With a config already in hand, "create one" is the wrong instruction. */
  it('points at the config file it read, when there was one', () => {
    expect(() =>
      resolveOptions(args({ out: './m' }), config({ out: './m' })),
    ).toThrow(/add "registry" to .*mocker\.config\.json/)
  })
})
