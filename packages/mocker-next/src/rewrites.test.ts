import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { parseKey } from '@magicspon/mocker/config'
import type { MockRegistry } from '@magicspon/mocker/config'
import { serveRegistryRoute } from './registry-route'
import {
  mockRewrites,
  toRewriteConditions,
  toRewriteDestination,
  toRewriteSource,
  toRouteDirectory,
} from './rewrites'

/**
 * Query-constrained registry keys, through Next's dialect.
 *
 * The failure this file exists for is a build-time one: a key's query string
 * handed to a rewrite `source` is `Unexpected MODIFIER` from path-to-regexp,
 * because `source` is a path grammar and knows nothing about `?` or `[...]`.
 * Query conditions belong in the separate `has` array, and these tests pin that
 * split — along with the ordering it forces, which no type can express.
 *
 * Synthetic registries throughout: `src/mocks/verify/registry.test.ts` owns the
 * question of what this application declares, and this file owns the question of
 * what any declaration turns into.
 */

const detailSchema = z.object({ reference: z.string(), city: z.string() })

const registry = (keys: readonly string[]): MockRegistry =>
  Object.fromEntries(
    keys.map((key) => [
      key,
      { schema: (): Promise<z.ZodType> => Promise.resolve(detailSchema) },
    ]),
  )

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('a query-constrained key becomes source plus conditions', () => {
  const key = 'GET /api/property/devices?propertyReference=[reference]'

  it('keeps the query out of the source path-to-regexp parses', () => {
    // The regression test proper. `/api/property/devices?propertyReference=[reference]`
    // in a `source` fails Next's config parse outright, taking the dev server
    // with it.
    const { pattern } = parseKey(key)

    expect(toRewriteSource(pattern)).toBe('/api/property/devices')
    expect(toRewriteDestination(pattern)).toBe('/api/mock/property/devices')
    expect(toRewriteSource(pattern)).not.toContain('?')
  })

  it('expresses a binding as presence, not as a capture', () => {
    // No `value`: the query string survives the rewrite untouched, and
    // `serveFromRegistry` re-matches the key at the destination anyway. Asking
    // Next to capture it too would be a second, weaker copy of matching.
    expect(toRewriteConditions(parseKey(key).query)).toEqual([
      { type: 'query', key: 'propertyReference' },
    ])
  })

  it('pins an exact value, escaped so it cannot widen', () => {
    const conditions = toRewriteConditions(
      parseKey('GET /api/report?mode=summary.v2').query,
    )

    // Next compiles `value` to a regex; an unescaped `.` would match any
    // character, so `?mode=summaryXv2` would silently be served too.
    expect(conditions).toEqual([
      { type: 'query', key: 'mode', value: 'summary\\.v2' },
    ])
  })

  it('emits no conditions at all for an unconstrained key', () => {
    // Not an empty array: Next treats `has: []` as a rule that can never match,
    // which would turn every existing registry entry off.
    expect(
      toRewriteConditions(parseKey('GET /api/property/[reference]').query),
    ).toBeUndefined()
  })

  it('still names the route directory the drift test checks', () => {
    expect(toRouteDirectory(parseKey(key).pattern)).toBe('property/devices')
  })
})

describe('the rewrite list Next is handed', () => {
  it('emits one rule per path and condition set', () => {
    vi.stubEnv('MOCK_API', '1')

    const rules = mockRewrites(
      registry([
        'GET /api/property/devices?propertyReference=[reference]',
        // Same path, same conditions, different verb: rewrites cannot match a
        // method, so this must not produce a second rule.
        'POST /api/property/devices?propertyReference=[reference]',
        'GET /api/property/devices',
      ]),
    )

    expect(rules).toEqual([
      {
        source: '/api/property/devices',
        destination: '/api/mock/property/devices',
        has: [{ type: 'query', key: 'propertyReference' }],
      },
      {
        source: '/api/property/devices',
        destination: '/api/mock/property/devices',
      },
    ])
  })

  it('puts the most constrained rule first', () => {
    vi.stubEnv('MOCK_API', '1')

    // Order is the whole correctness argument here: Next takes the first
    // matching rewrite, so the unconstrained rule declared first in the table
    // would swallow every request and the narrower key would never be reached.
    const rules = mockRewrites(
      registry([
        'GET /api/property/devices',
        'GET /api/property/devices?propertyReference=[reference]&mode=summary',
        'GET /api/property/devices?propertyReference=[reference]',
      ]),
    )

    expect(rules.map((rule) => rule.has?.length ?? 0)).toEqual([2, 1, 0])
  })
})

describe('a query-constrained route served end to end', () => {
  const table = registry([
    'GET /api/property/devices?propertyReference=[reference]',
  ])

  const serve = (search: string): Promise<Response> => {
    vi.stubEnv('MOCK_API', '1')
    return serveRegistryRoute(
      // As the rewrite delivers it: the mock endpoint's path, the original path
      // in the catch-all, and the query string carried across untouched.
      new NextRequest(
        `http://localhost:4400/api/mock/property/devices${search}`,
      ),
      ['property', 'devices'],
      table,
    )
  }

  it('echoes the bound value into the field the schema names', () => {
    // `propertyReference` on the wire, `reference` in the schema. The rename is
    // the reason a binding names a parameter instead of reusing the query key.
    return serve('?propertyReference=ABC123')
      .then((response) => response.json())
      .then((body) => {
        expect(body).toMatchObject({ reference: 'ABC123' })
      })
  })

  it('varies the data with the value, not with the clock', async () => {
    const [first, again, other] = await Promise.all([
      serve('?propertyReference=ABC123').then((r) => r.text()),
      serve('?propertyReference=ABC123').then((r) => r.text()),
      serve('?propertyReference=XYZ789').then((r) => r.text()),
    ])

    expect(again).toBe(first)
    expect(other).not.toBe(first)
  })

  it('says which parameters it wanted when the query does not satisfy the key', async () => {
    const response = await serve('?page=2')

    expect(response.status).toBe(404)
    const body = (await response.json()) as { error: string }
    // Otherwise this reads as "not registered" about a key sitting right there
    // in the table.
    expect(body.error).toContain('?propertyReference=[reference]')
  })
})
