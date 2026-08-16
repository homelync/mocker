import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { classify } from './zod-def'
import type { AnySchema } from './zod-def'

/**
 * `classify` is the only place that reads zod's internal `_zod.def`, so these
 * are the tests that fail on a zod upgrade — deliberately, and in one file. They
 * assert shapes observed at runtime, not shapes read off zod's types.
 */

describe('scalars', () => {
  it('classifies a bare string with no format and no bounds', () => {
    expect(classify(z.string())).toEqual({
      kind: 'string',
      format: undefined,
      bounds: {},
    })
  })

  it('carries a declared string format', () => {
    // The format is what lets the generator outrank a misleading field name.
    expect(classify(z.email())).toMatchObject({ format: 'email' })
    expect(classify(z.uuid())).toMatchObject({ format: 'uuid' })
    expect(classify(z.iso.datetime())).toMatchObject({ format: 'datetime' })
    expect(classify(z.iso.date())).toMatchObject({ format: 'date' })
  })

  it('classifies booleans, unknown and any', () => {
    expect(classify(z.boolean())).toEqual({ kind: 'boolean' })
    expect(classify(z.unknown())).toEqual({ kind: 'unknown' })
    // `any` is `unknown` here: neither says anything a generator could use.
    expect(classify(z.any())).toEqual({ kind: 'unknown' })
  })
})

describe('bounds', () => {
  it('reads string length bounds', () => {
    expect(classify(z.string().min(3).max(5))).toMatchObject({
      bounds: { min: 3, max: 5 },
    })
  })

  it('reads an exact string length separately from a range', () => {
    expect(classify(z.string().length(4))).toMatchObject({
      bounds: { exact: 4 },
    })
  })

  it('reads inclusive numeric bounds as written', () => {
    expect(classify(z.number().min(10).max(20))).toMatchObject({
      bounds: { min: 10, max: 20 },
    })
  })

  it('nudges an exclusive bound into a satisfiable one', () => {
    // `.positive()` is `> 0`; a generated 0 would fail the caller's own parse.
    expect(classify(z.number().positive())).toMatchObject({
      bounds: { min: 1 },
    })
    expect(classify(z.number().negative())).toMatchObject({
      bounds: { max: -1 },
    })
    expect(classify(z.number().gt(5).lt(9))).toMatchObject({
      bounds: { min: 6, max: 8 },
    })
  })

  it('records that a number must be whole', () => {
    expect(classify(z.number().int())).toMatchObject({ bounds: { int: true } })
  })

  it('ignores a check it does not recognise', () => {
    // A missed check risks a value the caller's output parse rejects loudly.
    // Refusing to generate at all would be worse, so unknown checks fall away.
    expect(classify(z.number().multipleOf(0.5))).toEqual({
      kind: 'number',
      bounds: {},
    })
  })

  it('keeps bounds alongside a format', () => {
    expect(classify(z.email().min(30))).toMatchObject({
      format: 'email',
      bounds: { min: 30 },
    })
  })
})

describe('closed value sets', () => {
  it('reads a single literal and a multi-value literal alike', () => {
    expect(classify(z.literal('ALARM'))).toEqual({
      kind: 'literal',
      values: ['ALARM'],
    })
    expect(classify(z.literal(['A', 'B']))).toEqual({
      kind: 'literal',
      values: ['A', 'B'],
    })
  })

  it('reads enum values, not enum keys', () => {
    expect(classify(z.enum(['A', 'B']))).toEqual({
      kind: 'enum',
      values: ['A', 'B'],
    })
    // A mapped enum's keys are names; only the values are ever emitted.
    expect(classify(z.enum({ Good: 'GOOD', Bad: 'BAD' }))).toEqual({
      kind: 'enum',
      values: ['GOOD', 'BAD'],
    })
  })
})

describe('containers', () => {
  it('exposes an array element and an object shape', () => {
    const array = classify(z.array(z.string()))
    expect(array.kind).toBe('array')

    const object = classify(z.object({ a: z.string(), b: z.number() }))
    expect(object.kind).toBe('object')
    if (object.kind === 'object') {
      expect(Object.keys(object.shape)).toEqual(['a', 'b'])
    }
  })

  it('treats an object with no fields as an object, not as unsupported', () => {
    const node = classify(z.object({}))

    expect(node.kind).toBe('object')
    if (node.kind === 'object') expect(node.shape).toEqual({})
  })

  it('flattens a discriminated union into a plain union', () => {
    // The discriminant is a literal in each branch, so nothing extra is needed
    // to generate one — picking a branch is the whole job either way.
    const node = classify(
      z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('a') }),
        z.object({ kind: z.literal('b') }),
      ]),
    )

    expect(node.kind).toBe('union')
    if (node.kind === 'union') expect(node.options).toHaveLength(2)
  })

  it('refuses an array with no element schema rather than emitting []', () => {
    // Not reachable through zod's public API, which is exactly why the branch
    // needs a test: a silent `[]` would look like an empty collection.
    const malformed = {
      _zod: { def: { type: 'array' } },
    } as unknown as AnySchema

    expect(classify(malformed)).toEqual({
      kind: 'unsupported',
      type: 'array(no element)',
    })
  })
})

describe('wrapper collapsing', () => {
  it('reports optional and nullable separately', () => {
    expect(classify(z.string().optional())).toMatchObject({
      kind: 'wrapper',
      optional: true,
      nullable: false,
      hasDefault: false,
    })
    expect(classify(z.string().nullable())).toMatchObject({
      optional: false,
      nullable: true,
    })
  })

  it('collapses a nullish chain into one node', () => {
    // Rolling absence once against the collapsed flags is what keeps
    // `nullishRate` honest — two 30% rolls would compound into 51%.
    expect(classify(z.string().nullish())).toMatchObject({
      kind: 'wrapper',
      optional: true,
      nullable: true,
      hasDefault: false,
    })
  })

  it('collapses a default however it was composed', () => {
    expect(classify(z.string().nullish().default('d'))).toMatchObject({
      optional: true,
      nullable: true,
      hasDefault: true,
    })
    expect(classify(z.string().default('d').nullable())).toMatchObject({
      nullable: true,
      hasDefault: true,
    })
  })

  it('exposes the unwrapped inner schema', () => {
    const node = classify(z.object({ a: z.string() }).nullish())

    expect(node.kind).toBe('wrapper')
    if (node.kind === 'wrapper') {
      expect(classify(node.inner).kind).toBe('object')
    }
  })
})

describe('unsupported nodes', () => {
  it('names the zod type so the caller can throw with a path', () => {
    for (const [schema, type] of [
      [z.date(), 'date'],
      [z.map(z.string(), z.number()), 'map'],
      [z.record(z.string(), z.number()), 'record'],
      [z.tuple([z.string()]), 'tuple'],
      [z.bigint(), 'bigint'],
      [z.lazy(() => z.string()), 'lazy'],
      [z.string().pipe(z.string()), 'pipe'],
    ] as const) {
      expect(classify(schema)).toEqual({ kind: 'unsupported', type })
    }
  })
})
