import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  childPath,
  collectLeafKinds,
  collectPaths,
  elementPath,
  findArrayPaths,
  pathKey,
} from './paths'

/**
 * Canonical paths address a position in the *schema*, so array indices collapse
 * to `[]` and one override covers a whole collection. Everything downstream —
 * overrides, counts, echoing, the compile-time path types — spells them the
 * same way, so these are the tests that keep the spellings from drifting.
 */

const envelope = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      address: z.object({ postcode: z.string() }),
      tags: z.array(z.string()),
    }),
  ),
  count: z.number(),
})

describe('path construction', () => {
  it('omits the leading dot at the root', () => {
    expect(childPath('', 'results')).toBe('results')
  })

  it('joins a nested field with a dot', () => {
    expect(childPath('results[]', 'id')).toBe('results[].id')
    expect(childPath('a.b', 'c')).toBe('a.b.c')
  })

  it('collapses an array index to []', () => {
    expect(elementPath('results')).toBe('results[]')
    expect(elementPath('')).toBe('[]')
    expect(elementPath('matrix[]')).toBe('matrix[][]')
  })
})

describe('pathKey', () => {
  it('returns the final segment', () => {
    expect(pathKey('results[].address.postcode')).toBe('postcode')
    expect(pathKey('count')).toBe('count')
    expect(pathKey('')).toBe('')
  })

  it("gives an element the collection's own name", () => {
    // An element has no name of its own, and an empty key would silently opt
    // every array element out of name-based generation.
    expect(pathKey('results[]')).toBe('results')
    expect(pathKey('data.items[]')).toBe('items')
  })
})

describe('collectPaths', () => {
  it('includes the root and every reachable position', () => {
    expect(collectPaths(envelope)).toEqual([
      '',
      'results',
      'results[]',
      'results[].id',
      'results[].address',
      'results[].address.postcode',
      'results[].tags',
      'results[].tags[]',
      'count',
    ])
  })

  it('addresses a root array through the empty path', () => {
    expect(collectPaths(z.array(z.object({ id: z.string() })))).toEqual([
      '',
      '[]',
      '[].id',
    ])
  })

  it('sees through optional, nullable and default wrappers', () => {
    // A wrapper is not a position: an override on `maybe` must address the
    // string inside it, not the optional around it.
    const schema = z.object({
      maybe: z.object({ inner: z.string() }).nullish(),
      fallback: z.array(z.string()).default([]),
    })

    expect(collectPaths(schema)).toContain('maybe.inner')
    expect(collectPaths(schema)).toContain('fallback[]')
  })

  it('contributes the paths of every union branch', () => {
    // Any branch may be the one generated, so an override on either must be
    // accepted — rejecting one would depend on the seed.
    const schema = z.object({
      payload: z.union([
        z.object({ kind: z.literal('a'), a: z.string() }),
        z.object({ kind: z.literal('b'), b: z.number() }),
      ]),
    })

    const paths = collectPaths(schema)

    expect(paths).toContain('payload.a')
    expect(paths).toContain('payload.b')
  })

  it('reports a path shared by two branches only once', () => {
    const schema = z.union([
      z.object({ shared: z.string() }),
      z.object({ shared: z.string() }),
    ])

    expect(collectPaths(schema).filter((p) => p === 'shared')).toHaveLength(1)
  })

  it('terminates on a schema deeper than the walk budget', () => {
    // Recursive schemas are unsupported and throw during generation, but
    // collectPaths runs first and must not hang before they get the chance.
    let deep: z.ZodType = z.string()
    for (let level = 0; level < 30; level++) deep = z.object({ next: deep })

    // The root plus one path per level down to the depth-20 cut-off.
    expect(collectPaths(deep)).toHaveLength(21)
  })
})

describe('collectLeafKinds', () => {
  it('maps every scalar leaf to its kind', () => {
    expect([...collectLeafKinds(envelope)]).toEqual([
      ['results[].id', 'string'],
      ['results[].address.postcode', 'string'],
      ['results[].tags[]', 'string'],
      ['count', 'number'],
    ])
  })

  it('records the leaf kind of a bare scalar schema at the root', () => {
    expect(collectLeafKinds(z.boolean()).get('')).toBe('boolean')
  })

  it('omits objects and arrays, which hold no pinnable value', () => {
    const kinds = collectLeafKinds(envelope)

    expect(kinds.has('results')).toBe(false)
    expect(kinds.has('results[]')).toBe(false)
    expect(kinds.has('')).toBe(false)
  })

  it('takes the first branch where a union offers several kinds', () => {
    // A pinned value has to commit to one kind, and the first branch is the
    // only choice that does not depend on the seed.
    const schema = z.object({ uprn: z.union([z.number(), z.string()]) })

    expect(collectLeafKinds(schema).get('uprn')).toBe('number')
  })

  it('sees through wrappers', () => {
    const schema = z.object({ score: z.number().nullish() })

    expect(collectLeafKinds(schema).get('score')).toBe('number')
  })

  it('skips leaves it cannot pin', () => {
    const schema = z.object({
      when: z.iso.datetime(),
      choice: z.enum(['A', 'B']),
      tag: z.literal('X'),
      free: z.unknown(),
    })
    const kinds = collectLeafKinds(schema)

    // A declared format is still a string and may be echoed into; a closed
    // value set is not, since any pinned value would have to be one of them.
    expect(kinds.get('when')).toBe('string')
    expect(kinds.has('choice')).toBe(false)
    expect(kinds.has('tag')).toBe(false)
    expect(kinds.has('free')).toBe(false)
  })
})

describe('findArrayPaths', () => {
  it('returns the shallowest array first', () => {
    expect(findArrayPaths(envelope)).toEqual(['results', 'results[].tags'])
  })

  it('treats a root array as the primary collection', () => {
    expect(findArrayPaths(z.array(z.string()))[0]).toBe('')
  })

  it('breaks a tie at the same depth by declaration order', () => {
    // Stable across runs is the whole point: the primary collection must not
    // change because a key was renamed or a schema reordered.
    const schema = z.object({
      zebras: z.array(z.string()),
      apples: z.array(z.string()),
    })

    expect(findArrayPaths(schema)).toEqual(['zebras', 'apples'])
  })

  it('prefers a shallow array to one declared earlier but deeper', () => {
    const schema = z.object({
      wrapped: z.object({ deep: z.array(z.string()) }),
      shallow: z.array(z.string()),
    })

    expect(findArrayPaths(schema)[0]).toBe('shallow')
  })

  it('does not let a wrapper make an array look deeper than it is', () => {
    // `.nullish()` around a collection is a very common envelope shape; if it
    // counted as a level, an optional `results` would lose to a nested array.
    const schema = z.object({
      results: z.array(z.string()).nullish(),
      meta: z.object({ ids: z.array(z.string()) }),
    })

    expect(findArrayPaths(schema)[0]).toBe('results')
  })

  it('finds arrays inside union branches', () => {
    const schema = z.union([
      z.object({ rows: z.array(z.string()) }),
      z.object({ items: z.array(z.string()) }),
    ])

    expect(findArrayPaths(schema)).toEqual(['rows', 'items'])
  })

  it('returns nothing for a schema with no arrays', () => {
    expect(findArrayPaths(z.object({ id: z.string() }))).toEqual([])
  })
})
