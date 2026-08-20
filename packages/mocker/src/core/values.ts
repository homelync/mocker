import type { Faker } from '@faker-js/faker'
import { pathKey } from './paths'
import type { GenContext, Generator, LeafKind, NameRule } from './types'
import type { Bounds } from './zod-def'

/**
 * Values for the schema's scalar leaves.
 *
 * Split from the walk because it answers a different question: the walk decides
 * *which* leaves exist and what they are called, this decides what a leaf of a
 * given kind, format and name should contain.
 */

/** The context a {@link Generator} is called with at `path`. */
export function genContext(path: string, faker: Faker): GenContext {
  return { path, key: pathKey(path), faker }
}

/** First rule matching both the field name and the leaf's kind. */
function matchRule(
  rules: readonly NameRule[],
  key: string,
  kind: LeafKind,
): NameRule | undefined {
  return rules.find((rule) => rule.types.includes(kind) && rule.match.test(key))
}

/**
 * Faker generators for zod's declared string formats. Consulted before name
 * rules: `z.email()` is a stated fact about the value, whereas a field called
 * `email` is only a strong hint.
 */
const FORMAT_GENERATORS: Readonly<Record<string, Generator>> = {
  email: ({ faker }) => faker.internet.email(),
  url: ({ faker }) => faker.internet.url(),
  uuid: ({ faker }) => faker.string.uuid(),
  guid: ({ faker }) => faker.string.uuid(),
  datetime: ({ faker }) => faker.date.recent().toISOString(),
  date: ({ faker }) => faker.date.recent().toISOString().slice(0, 10),
  time: ({ faker }) => faker.date.recent().toISOString().slice(11, 19),
  duration: () => 'PT1H',
  ipv4: ({ faker }) => faker.internet.ipv4(),
  ipv6: ({ faker }) => faker.internet.ipv6(),
  emoji: () => '🏠',
  cuid: ({ faker }) => faker.string.nanoid(),
  cuid2: ({ faker }) => faker.string.nanoid(),
  ulid: ({ faker }) => faker.string.nanoid(26),
  nanoid: ({ faker }) => faker.string.nanoid(),
}

/** A string satisfying the leaf's declared format, name rules and bounds. */
export function generateString(
  format: string | undefined,
  bounds: Bounds,
  path: string,
  faker: Faker,
  rules: readonly NameRule[],
): string {
  const ctx = genContext(path, faker)

  const byFormat = format ? FORMAT_GENERATORS[format] : undefined
  if (byFormat) return clampString(String(byFormat(ctx)), bounds, faker)

  const rule = matchRule(rules, ctx.key, 'string')
  if (rule) return clampString(String(rule.gen(ctx)), bounds, faker)

  return clampString(faker.lorem.words({ min: 1, max: 3 }), bounds, faker)
}

/**
 * Bring a generated string within the schema's length bounds.
 *
 * Padding rather than regenerating keeps the value recognisable — a truncated
 * ISO date is still obviously a date — and keeps faker consumption stable,
 * which determinism depends on.
 */
function clampString(value: string, bounds: Bounds, faker: Faker): string {
  if (bounds.exact !== undefined) {
    return value.length >= bounds.exact
      ? value.slice(0, bounds.exact)
      : value.padEnd(bounds.exact, faker.string.alpha(1))
  }
  let result = value
  if (bounds.min !== undefined && result.length < bounds.min) {
    result = result.padEnd(bounds.min, 'x')
  }
  if (bounds.max !== undefined && result.length > bounds.max) {
    result = result.slice(0, bounds.max)
  }
  return result
}

/** A number satisfying the leaf's name rules and bounds. */
export function generateNumber(
  bounds: Bounds,
  path: string,
  faker: Faker,
  rules: readonly NameRule[],
): number {
  const ctx = genContext(path, faker)
  const rule = matchRule(rules, ctx.key, 'number')

  if (rule) {
    const value = Number(rule.gen(ctx))
    return clampNumber(value, bounds)
  }

  const min = bounds.min ?? 0
  const max = bounds.max ?? 1000
  return bounds.int === false
    ? faker.number.float({ min, max, fractionDigits: 2 })
    : faker.number.int({ min, max })
}

function clampNumber(value: number, bounds: Bounds): number {
  let result = value
  if (bounds.min !== undefined) result = Math.max(result, bounds.min)
  if (bounds.max !== undefined) result = Math.min(result, bounds.max)
  return bounds.int ? Math.round(result) : result
}
