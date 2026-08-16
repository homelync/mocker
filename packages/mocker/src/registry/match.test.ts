import { describe, expect, it } from 'vitest'
import { findMatch, isPathRegistered, matchQuery, parseKey } from './match'
import type { QueryConstraint } from './match'

/**
 * The key algebra, on its own.
 *
 * Pure input/output — no schema, no runtime, no host — which is the point:
 * `src/mocks/verify/registry.test.ts` proves this application's real routes work
 * end to end, and cannot also enumerate the malformed keys and near-miss
 * requests that this layer is responsible for rejecting.
 */

const search = (query: string): URLSearchParams => new URLSearchParams(query)

describe('a key with a query string', () => {
  it('splits the query off the path, so path consumers never see it', () => {
    // The load-bearing split. `toRouteDirectory` maps `pattern` to a folder on
    // disk and `toRewriteSource` hands it to path-to-regexp; a `?` reaching
    // either is the `Unexpected MODIFIER` error rather than a wrong answer.
    const key = parseKey('GET /api/property?propertyReference=[reference]')

    expect(key.pattern).toBe('/api/property')
    expect(key.query).toEqual([
      { name: 'propertyReference', param: 'reference' },
    ])
  })

  it('reads all three constraint forms', () => {
    const key = parseKey('GET /api/property?ref=[reference]&mode=summary&sort')

    expect(key.query).toEqual<QueryConstraint[]>([
      { name: 'ref', param: 'reference' },
      { name: 'mode', value: 'summary' },
      { name: 'sort' },
    ])
  })

  it('leaves a key with no query string with no constraints', () => {
    expect(parseKey('GET /api/property/[reference]').query).toEqual([])
  })
})

describe('a malformed query in a key', () => {
  // Every one of these would otherwise produce a key that matches nothing,
  // whose only symptom is real data arriving where fake data was expected.
  it.each([
    ['GET /api/property?', /no query constraint/],
    ['GET /api/property?ref=', /matches only an empty value/],
    ['GET /api/property?ref=[a]&ref=[b]', /constrained twice/],
    ['GET /api/property?ref=x[y]', /malformed binding/],
    ['GET /api/property?=x', /not a usable query parameter name/],
    ['GET /api/property?a=1?b=2', /more than one/],
  ])('rejects %s', (key, reason) => {
    expect(() => parseKey(key)).toThrow(reason)
  })

  it('rejects a name bound by both halves of the key', () => {
    // The merge would keep one silently and drop the other, and the loser is
    // simply never echoed — a missing field with no error anywhere.
    expect(() =>
      parseKey('GET /api/property/[reference]?ref=[reference]'),
    ).toThrow(/bound twice/)
  })
})

describe("matching a request's query", () => {
  const constraints = parseKey(
    'GET /api/property?propertyReference=[reference]',
  ).query

  it('recovers the bound value under the name the key gave it', () => {
    // `propertyReference` on the wire, `reference` in the schema. This rename is
    // the whole reason a binding names a parameter rather than reusing the key.
    expect(matchQuery(constraints, search('propertyReference=ABC123'))).toEqual(
      {
        reference: 'ABC123',
      },
    )
  })

  it('ignores parameters the key says nothing about', () => {
    // Otherwise every filter, sort or page the UI adds would stop the mocking.
    expect(
      matchQuery(constraints, search('propertyReference=ABC123&page=2')),
    ).toEqual({ reference: 'ABC123' })
  })

  it('does not match when the parameter is absent', () => {
    expect(matchQuery(constraints, search('page=2'))).toBeNull()
  })

  it('does not match an empty value', () => {
    // The query mirror of `/api/property//`: echoing "" would render a page
    // about nothing instead of failing.
    expect(matchQuery(constraints, search('propertyReference='))).toBeNull()
  })

  it('requires an exact value where the key names one', () => {
    const exact = parseKey('GET /api/report?mode=summary').query

    expect(matchQuery(exact, search('mode=summary'))).toEqual({})
    expect(matchQuery(exact, search('mode=detail'))).toBeNull()
  })

  it('accepts any value for a presence-only constraint', () => {
    const presence = parseKey('GET /api/report?tenant').query

    expect(matchQuery(presence, search('tenant=anything'))).toEqual({})
    expect(matchQuery(presence, search(''))).toBeNull()
  })
})

describe('choosing between keys on the same path', () => {
  const keys = [
    'GET /api/property',
    'GET /api/property?propertyReference=[reference]',
    'GET /api/property?propertyReference=[reference]&mode=summary',
  ]

  it('prefers the key with the most constraints', () => {
    // Without this the winner depends on object key order in the registry,
    // which is invisible in review and changes when someone sorts the table.
    const match = findMatch(
      keys,
      'GET',
      '/api/property',
      search('propertyReference=ABC123&mode=summary'),
    )

    expect(match?.key).toBe(
      'GET /api/property?propertyReference=[reference]&mode=summary',
    )
    expect(match?.params).toEqual({ reference: 'ABC123' })
  })

  it('falls back to the looser key when the tighter one does not apply', () => {
    const match = findMatch(
      keys,
      'GET',
      '/api/property',
      search('propertyReference=ABC123'),
    )

    expect(match?.key).toBe('GET /api/property?propertyReference=[reference]')
  })

  it('falls back to the unconstrained key for a bare request', () => {
    expect(findMatch(keys, 'GET', '/api/property')?.key).toBe(
      'GET /api/property',
    )
  })

  it('prefers a literal path over a dynamic one before it weighs the query', () => {
    // Path specificity stays the first tiebreak, mirroring how the App Router
    // resolves `property/search` against `property/[reference]`.
    const match = findMatch(
      ['GET /api/property/[reference]', 'GET /api/property/search?q=[term]'],
      'GET',
      '/api/property/search',
      search('q=boiler'),
    )

    expect(match?.key).toBe('GET /api/property/search?q=[term]')
    expect(match?.params).toEqual({ term: 'boiler' })
  })
})

describe('a query-constrained path that is not satisfied', () => {
  const keys = ['GET /api/property?propertyReference=[reference]']

  it('matches nothing without the parameter', () => {
    expect(findMatch(keys, 'GET', '/api/property')).toBeNull()
  })

  it('still counts the path as registered', () => {
    // `isPathRegistered` answers a question about paths alone, because that is
    // the granularity a path-intercepting runtime captures at.
    expect(isPathRegistered(keys, '/api/property')).toBe(true)
  })
})
