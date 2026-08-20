import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { InvalidControlError } from '@magicspon/mocker'
import type { MockRegistry } from '@magicspon/mocker'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { generateFixtures } from './emit'
import type { EmitResult } from './emit'

/**
 * These tests write real files, because the thing under test *is* writing real
 * files. A mocked filesystem would leave the two claims that matter unproven:
 * that the tree matches `fixturePath`'s layout exactly — the whole basis for
 * calling this "seeding a fixture store" rather than "exporting some JSON" — and
 * that a file already on disk survives a second run.
 */

const propertySchema = z.object({
  reference: z.string(),
  bedrooms: z.number(),
})

const deviceListSchema = z.object({
  propertyReference: z.string(),
  results: z.array(z.object({ id: z.string() })),
})

const registry: MockRegistry = {
  'GET /api/property/[reference]': {
    schema: () => Promise.resolve(propertySchema),
  },
  'GET /api/devices?propertyReference=[reference]': {
    schema: () => Promise.resolve(deviceListSchema),
  },
}

let out: string

beforeEach(async () => {
  out = await mkdtemp(path.join(tmpdir(), 'mocker-cli-'))
})

afterEach(async () => {
  await rm(out, { recursive: true, force: true })
})

/** The one result for a key, so a failure names the key rather than an index. */
function resultFor(results: readonly EmitResult[], key: string): EmitResult {
  const found = results.find((result) => result.key === key)
  if (found === undefined) throw new Error(`No result for "${key}"`)
  return found
}

describe('generateFixtures', () => {
  it('writes one fixture per entry, in the fixture-store layout', async () => {
    const results = await generateFixtures(registry, { out })

    expect(results.map((result) => result.status)).toEqual([
      'written',
      'written',
    ])

    for (const result of results) {
      // `METHOD/<path segments>/<8 hex>.json` — the layout `fixturePath` derives
      // and both adapters read.
      expect(path.relative(out, result.file ?? '')).toMatch(
        /^(GET|POST)\/api\/.+\/[0-9a-f]{8}\.json$/,
      )
    }
  })

  it('writes canonical JSON that satisfies the schema it came from', async () => {
    const results = await generateFixtures(registry, { out })
    const file = resultFor(results, 'GET /api/property/[reference]').file ?? ''
    const body = await readFile(file, 'utf8')

    expect(body.endsWith('\n')).toBe(true)
    expect(body).toBe(`${JSON.stringify(JSON.parse(body), null, 2)}\n`)
    expect(propertySchema.safeParse(JSON.parse(body)).success).toBe(true)
  })

  /** The binding in the URL is echoed into the field of the same name. */
  it('echoes a bound path segment into the response', async () => {
    const results = await generateFixtures(registry, { out })
    const result = resultFor(results, 'GET /api/property/[reference]')
    const body: unknown = JSON.parse(await readFile(result.file ?? '', 'utf8'))

    const [, reference] = /^GET (\/api\/property\/[^/?]+)/.exec(
      result.request,
    ) ?? ['', '']
    expect(body).toMatchObject({
      reference: decodeURIComponent((reference ?? '').split('/').pop() ?? ''),
    })
  })

  /**
   * The end of the config file's `params`: a value stated once in
   * `mocker.config.json` decides the URL, the filename and the echoed field, so
   * a fixture tree can hold the references the host's seeded data actually has.
   */
  it('writes a configured param into the URL and the response', async () => {
    const results = await generateFixtures(registry, {
      out,
      params: { reference: 'lorem999' },
    })
    const result = resultFor(results, 'GET /api/property/[reference]')
    const body: unknown = JSON.parse(await readFile(result.file ?? '', 'utf8'))

    expect(result.request).toBe('GET /api/property/lorem999')
    expect(path.relative(out, result.file ?? '')).toMatch(
      /^GET\/api\/property\/lorem999\/[0-9a-f]{8}\.json$/,
    )
    expect(body).toMatchObject({ reference: 'lorem999' })
  })

  it('produces byte-identical output on a second machine', async () => {
    const first = await generateFixtures(registry, { out })
    const elsewhere = await mkdtemp(path.join(tmpdir(), 'mocker-cli-'))

    try {
      const second = await generateFixtures(registry, { out: elsewhere })

      for (const [index, result] of first.entries()) {
        const other = second[index]
        expect(path.relative(out, result.file ?? '')).toBe(
          path.relative(elsewhere, other?.file ?? ''),
        )
        expect(await readFile(result.file ?? '', 'utf8')).toBe(
          await readFile(other?.file ?? '', 'utf8'),
        )
      }
    } finally {
      await rm(elsewhere, { recursive: true, force: true })
    }
  })

  it('keeps a fixture that is already there', async () => {
    const [first] = await generateFixtures(registry, { out })
    await writeFile(first?.file ?? '', '{"edited":true}\n', 'utf8')

    const results = await generateFixtures(registry, { out })

    expect(results.map((result) => result.status)).toEqual(['kept', 'kept'])
    expect(await readFile(first?.file ?? '', 'utf8')).toBe('{"edited":true}\n')
  })

  it('overwrites a fixture when forced', async () => {
    const [first] = await generateFixtures(registry, { out })
    await writeFile(first?.file ?? '', '{"edited":true}\n', 'utf8')

    const results = await generateFixtures(registry, { out, force: true })

    expect(results.map((result) => result.status)).toEqual([
      'written',
      'written',
    ])
    expect(await readFile(first?.file ?? '', 'utf8')).not.toBe(
      '{"edited":true}\n',
    )
  })

  it('writes nothing on a dry run, and still reports what it would write', async () => {
    const results = await generateFixtures(registry, { out, dryRun: true })

    expect(results.map((result) => result.status)).toEqual([
      'written',
      'written',
    ])
    await expect(readFile(results[0]?.file ?? '', 'utf8')).rejects.toThrow()
  })

  it('sizes the primary collection from count', async () => {
    const results = await generateFixtures(registry, { out, count: 3 })
    const key = 'GET /api/devices?propertyReference=[reference]'
    const body = JSON.parse(
      await readFile(resultFor(results, key).file ?? '', 'utf8'),
    ) as z.infer<typeof deviceListSchema>

    expect(body.results).toHaveLength(3)
  })

  it('lands a pinned seed in its own file', async () => {
    const [plain] = await generateFixtures(registry, { out })
    const [seeded] = await generateFixtures(registry, { out, seed: 'pinned' })

    expect(seeded?.file).not.toBe(plain?.file)
  })

  it('rejects a control the library will not accept', async () => {
    await expect(
      generateFixtures(registry, { out, count: 10_001 }),
    ).rejects.toBeInstanceOf(InvalidControlError)
  })
})

describe('entries that produce no fixture', () => {
  it('skips a planned entry when asked, and includes it otherwise', async () => {
    const planned: MockRegistry = {
      'GET /api/property/[reference]/timeline': {
        schema: () => Promise.resolve(propertySchema),
        planned: 'WP-101',
      },
    }

    const [skipped] = await generateFixtures(planned, {
      out,
      skipPlanned: true,
    })
    expect(skipped).toMatchObject({
      status: 'skipped',
      reason: 'planned (WP-101)',
    })

    const [included] = await generateFixtures(planned, { out })
    expect(included?.status).toBe('written')
  })

  it('skips a success that carries no body', async () => {
    const bodiless: MockRegistry = {
      'DELETE /api/property/[reference]': {
        schema: () => Promise.resolve(z.object({})),
        status: 204,
      },
    }

    const [result] = await generateFixtures(bodiless, { out })
    expect(result).toMatchObject({ status: 'skipped' })
    expect(result?.reason).toMatch(/204/)
  })

  /**
   * One broken entry must not cost the others their fixtures — which is the
   * whole reason the loop catches rather than the caller.
   */
  it('records a failing entry and carries on', async () => {
    const broken: MockRegistry = {
      'GET /api/broken': {
        schema: () => Promise.reject(new Error('schema module is missing')),
      },
      'GET /api/property/[reference]': {
        schema: () => Promise.resolve(propertySchema),
      },
    }

    const results = await generateFixtures(broken, { out })

    expect(results[0]).toMatchObject({
      status: 'failed',
      reason: 'schema module is missing',
    })
    expect(results[1]?.status).toBe('written')
  })

  it('records an entry whose schema the generator cannot walk', async () => {
    const unsupported: MockRegistry = {
      'GET /api/exotic': {
        schema: () => Promise.resolve(z.map(z.string(), z.string())),
      },
    }

    const [result] = await generateFixtures(unsupported, { out })
    expect(result?.status).toBe('failed')
    expect(result?.reason).toBeTruthy()
  })
})
