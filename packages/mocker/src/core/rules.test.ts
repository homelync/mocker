import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { generate } from './generate'
import { DEFAULT_RULES } from './rules'
import { LEAF_KINDS } from './types'
import type { NameRule } from './types'

/**
 * Name rules exist because zod describes shape, not intent: `z.string()` is all
 * the schema says about `installationDate`, and a lorem word there renders
 * "Invalid DateTime" in every date cell.
 *
 * Two kinds of test, because the rules make two kinds of claim. What a rule
 * *produces* is asserted through `generate`, so precedence and type gating are
 * exercised as well. What a rule must *not* claim is asserted against the
 * pattern directly — an anti-match has no output to look at.
 */

function ruleNamed(name: string): NameRule {
  const rule = DEFAULT_RULES.find((candidate) => candidate.name === name)
  if (rule === undefined) throw new Error(`No default rule named "${name}"`)
  return rule
}

const SEEDS = [0, 1, 2, 3, 4, 5, 6, 7]

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
/** Faker's place and person names are capitalised; lorem words are not. */
const CAPITALISED = /^\p{Lu}/u

describe('the rule table itself', () => {
  it('names every rule uniquely, so a consumer can replace one', () => {
    const names = DEFAULT_RULES.map((rule) => rule.name)

    expect(new Set(names).size).toBe(names.length)
  })

  it('declares at least one valid leaf kind per rule', () => {
    // A rule with no types can never match, and one with a bogus type would
    // claim a field whose kind it cannot satisfy.
    for (const rule of DEFAULT_RULES) {
      expect(rule.types.length).toBeGreaterThan(0)
      for (const kind of rule.types) expect(LEAF_KINDS).toContain(kind)
    }
  })

  it('pairs the identifier rules by type rather than by name', () => {
    // The reason rules carry `types` at all: `deviceRow.id` is a string while
    // `address.id` is a number, and one pattern has to serve both.
    expect(ruleNamed('identifier').types).toEqual(['string'])
    expect(ruleNamed('identifier-numeric').types).toEqual(['number'])
    expect(ruleNamed('identifier').match.source).toBe(
      ruleNamed('identifier-numeric').match.source,
    )
  })
})

describe('string rules', () => {
  const cases: readonly (readonly [field: string, pattern: RegExp])[] = [
    ['createdAt', ISO],
    ['installationDate', ISO],
    ['date', ISO],
    ['timestamp', ISO],
    ['postcode', /\d/],
    ['postalCode', /\d/],
    ['zip', /\d/],
    ['emailAddress', /@/],
    ['phone', /\d/],
    ['mobile', /\d/],
    ['imageUrl', /^https?:\/\//],
    ['href', /^https?:\/\//],
    ['link', /^https?:\/\//],
    ['firstName', /^\p{Lu}.* /u],
    ['createdBy', /^\p{Lu}.* /u],
    ['addressLine1', CAPITALISED],
    ['city', CAPITALISED],
    ['county', CAPITALISED],
    ['country', CAPITALISED],
    ['jobReference', /^[A-Z0-9]{8}$/],
    ['deviceId', /^[0-9a-f]{8}$/i],
    ['serialNumber', /^[A-Z0-9]{12}$/],
  ]

  it.each(cases)('generates a plausible %s', (field, pattern) => {
    const schema = z.object({ [field]: z.string() })

    for (const seed of SEEDS) {
      const value = generate(schema, { seed, nullishRate: 0 })[field]
      expect(String(value)).toMatch(pattern)
    }
  })
})

describe('number rules', () => {
  const cases: readonly (readonly [field: string, min: number, max: number])[] =
    [
      [
        'createdAt',
        Date.parse('2023-01-01T00:00:00Z'),
        Date.parse('2026-06-01T00:00:00Z'),
      ],
      ['addressId', 1, 999_999],
      ['completionRate', 0, 100],
      ['percentComplete', 0, 100],
      ['lat', -90, 90],
      ['latitude', -90, 90],
      ['lng', -180, 180],
      ['longitude', -180, 180],
      ['count', 0, 500],
      ['deviceCount', 0, 500],
      ['total', 0, 500],
      ['quantity', 0, 500],
    ]

  it.each(cases)('keeps %s inside its plausible range', (field, min, max) => {
    const schema = z.object({ [field]: z.number() })

    for (const seed of SEEDS) {
      const value = generate(schema, { seed, nullishRate: 0 })[field]
      expect(value).toBeGreaterThanOrEqual(min)
      expect(value).toBeLessThanOrEqual(max)
    }
  })

  it('never makes a tally negative', () => {
    // A negative `count` breaks every paging control that reads it.
    const schema = z.object({ count: z.number(), total: z.number() })

    for (let seed = 0; seed < 40; seed++) {
      const result = generate(schema, { seed, nullishRate: 0 })
      expect(Number.isInteger(result.count)).toBe(true)
      expect(result.count).toBeGreaterThanOrEqual(0)
      expect(result.total).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('type gating', () => {
  it('leaves a field to the generic generator when only the kind differs', () => {
    // `tally` is number-only, so a string `count` must fall through rather than
    // be handed a number that the output parse would then reject.
    const schema = z.object({ count: z.string() })

    for (const seed of SEEDS) {
      const { count } = generate(schema, { seed, nullishRate: 0 })
      expect(count).toMatch(/^[a-z ]+$/)
    }
  })
})

describe('patterns that must not over-claim', () => {
  it('keeps the date rules off names that merely contain a date word', () => {
    // Case-sensitivity is load-bearing: `/At$/` matches `createdAt`, and the
    // case-insensitive form would also claim `format`.
    const { match } = ruleNamed('iso-date')

    expect(match.test('createdAt')).toBe(true)
    expect(match.test('date')).toBe(true)
    expect(match.test('format')).toBe(false)
    expect(match.test('dateFormat')).toBe(false)
    expect(match.test('updateStrategy')).toBe(false)
  })

  it('separates county, country and count', () => {
    expect(ruleNamed('county').match.test('county')).toBe(true)
    expect(ruleNamed('county').match.test('billingCounty')).toBe(true)
    expect(ruleNamed('county').match.test('country')).toBe(false)
    expect(ruleNamed('county').match.test('count')).toBe(false)

    expect(ruleNamed('country').match.test('country')).toBe(true)
    expect(ruleNamed('country').match.test('county')).toBe(false)
  })

  it('keeps the tally rule off a lowercase substring match', () => {
    const { match } = ruleNamed('tally')

    expect(match.test('count')).toBe(true)
    expect(match.test('deviceCount')).toBe(true)
    expect(match.test('quantity')).toBe(true)
    expect(match.test('discount')).toBe(false)
    expect(match.test('accountant')).toBe(false)
  })

  it('keeps the identifier rule off names that merely end in "id"', () => {
    const { match } = ruleNamed('identifier')

    expect(match.test('id')).toBe(true)
    expect(match.test('deviceId')).toBe(true)
    expect(match.test('valid')).toBe(false)
    expect(match.test('idle')).toBe(false)
  })

  it('leaves a bare `name` to the generic string generator', () => {
    // In this kind of API a bare `name` is far more often a device model or an
    // event type than a person.
    const { match } = ruleNamed('person-name')

    expect(match.test('firstName')).toBe(true)
    expect(match.test('name')).toBe(false)
  })
})
