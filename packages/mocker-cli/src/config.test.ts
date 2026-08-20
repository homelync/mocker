import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CONFIG_FILE, ConfigError, loadConfig } from './config'

/**
 * Real files, for the same reason `load.test.ts` uses real modules: what goes
 * wrong with a config file is that it is absent, unreadable or malformed, and a
 * stubbed `readFile` proves nothing about any of the three.
 *
 * The validation cases matter more than they look. A config is written once and
 * then trusted forever, so a misspelled key that is silently ignored means a
 * repository whose fixtures quietly stopped honouring a setting somebody thinks
 * is in force.
 */

let directory: string

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'mocker-config-'))
})

afterEach(async () => {
  await rm(directory, { recursive: true, force: true })
})

/** Write the conventional config file, and return its directory. */
async function write(contents: unknown): Promise<string> {
  const body =
    typeof contents === 'string' ? contents : JSON.stringify(contents)
  await writeFile(path.join(directory, CONFIG_FILE), body, 'utf8')
  return directory
}

describe('loadConfig', () => {
  it('reads the conventional file from the working directory', async () => {
    const cwd = await write({
      registry: './src/mocks/registry.ts',
      out: './tests/mocks',
      params: { reference: 'lorem999' },
    })

    const loaded = await loadConfig(undefined, cwd)

    expect(loaded?.config).toEqual({
      registry: './src/mocks/registry.ts',
      out: './tests/mocks',
      params: { reference: 'lorem999' },
    })
    expect(loaded?.file).toBe(path.join(cwd, CONFIG_FILE))
    expect(loaded?.dir).toBe(cwd)
  })

  it('prefers a file named on the command line to the conventional one', async () => {
    const cwd = await write({ out: './conventional' })
    await writeFile(path.join(cwd, 'named.json'), '{"out":"./named"}', 'utf8')

    const loaded = await loadConfig('./named.json', cwd)

    expect(loaded?.config.out).toBe('./named')
    expect(loaded?.file).toBe(path.join(cwd, 'named.json'))
  })

  it('leaves every option unset when the file states none', async () => {
    const cwd = await write({})

    expect((await loadConfig(undefined, cwd))?.config).toEqual({
      registry: undefined,
      out: undefined,
      params: undefined,
    })
  })

  it('allows $schema, so an editor can be told what the file is', async () => {
    const cwd = await write({ $schema: './schema.json', out: './mocks' })

    expect((await loadConfig(undefined, cwd))?.config.out).toBe('./mocks')
  })

  /** Most repositories have no config, and the command works without one. */
  it('is undefined when there is no conventional file', async () => {
    expect(await loadConfig(undefined, directory)).toBeUndefined()
  })
})

describe('refusals', () => {
  /** A named file that is not there is a typo, not a repository without one. */
  it('refuses a named file that is missing', async () => {
    await expect(loadConfig('./nope.json', directory)).rejects.toThrow(
      ConfigError,
    )
  })

  it('refuses a file that is not JSON', async () => {
    const cwd = await write('{ registry: nope }')

    await expect(loadConfig(undefined, cwd)).rejects.toThrow(/not valid JSON/)
  })

  it.each([['[]'], ['"nope"'], ['null']])(
    'refuses %s, which is not an object',
    async (body) => {
      const cwd = await write(body)

      await expect(loadConfig(undefined, cwd)).rejects.toThrow(
        /must contain a JSON object/,
      )
    },
  )

  it('refuses an option it does not have, naming the ones it does', async () => {
    const cwd = await write({ outDir: './mocks' })

    await expect(loadConfig(undefined, cwd)).rejects.toThrow(
      /no option named "outDir"\. It takes: registry, out, params/,
    )
  })

  it.each([['registry'], ['out']])('refuses an empty %s', async (key) => {
    const cwd = await write({ [key]: '  ' })

    await expect(loadConfig(undefined, cwd)).rejects.toThrow(
      /must be a non-empty string/,
    )
  })

  it('refuses params that is not a table', async () => {
    const cwd = await write({ params: ['reference'] })

    await expect(loadConfig(undefined, cwd)).rejects.toThrow(
      /must be an object mapping a binding name/,
    )
  })

  /** An empty value produces a path segment no registry key matches. */
  it.each([[''], [42], [null]])(
    'refuses a param value of %p',
    async (value) => {
      const cwd = await write({ params: { reference: value } })

      await expect(loadConfig(undefined, cwd)).rejects.toThrow(
        /"params\.reference".*non-empty string/,
      )
    },
  )
})
