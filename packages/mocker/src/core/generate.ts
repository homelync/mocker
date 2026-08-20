import { Faker, en, en_GB } from '@faker-js/faker'
import type { z } from 'zod'
import { UnknownOverridePathError, UnsupportedSchemaError } from './errors'
import { hashSeed } from './hash'
import { childPath, collectPaths, elementPath, findArrayPaths } from './paths'
import { DEFAULT_RULES } from './rules'
import type { GenerateOptions, Generator, NameRule } from './types'
import { generateNumber, generateString, genContext } from './values'
import { classify } from './zod-def'
import type { AnySchema, SchemaNode } from './zod-def'

/** Absent-value probability for `.optional()` / `.nullable()` fields. */
const DEFAULT_NULLISH_RATE = 0.3

/** Length range for arrays that are not the primary collection. */
const DEFAULT_NESTED_ARRAY_LENGTH: readonly [number, number] = [0, 3]

/** Length of the primary collection when `count` is not given. */
const DEFAULT_PRIMARY_COUNT = 10

/** Guards against a self-referential schema; recursion is not supported. */
const MAX_DEPTH = 20

/** Everything the walk needs that does not change from node to node. */
interface WalkContext {
  readonly faker: Faker
  readonly rules: readonly NameRule[]
  readonly nullishRate: number
  readonly overrides: ReadonlyMap<string, Generator>
  readonly arrayLength: (path: string) => number
}

/** A wrapper node, and the scalar leaves, as separate halves of the union. */
type WrapperNode = Extract<SchemaNode, { kind: 'wrapper' }>
type LeafNode = Exclude<
  SchemaNode,
  { kind: 'wrapper' | 'object' | 'array' | 'union' }
>

/**
 * Generate fake data satisfying a zod schema.
 *
 * Values are resolved per field in strict precedence order:
 *
 *   1. an explicit `overrides` entry for the field's canonical path
 *   2. a schema-declared format or closed value set (`z.email()`, enum, literal)
 *   3. a matching `NameRule` for the field's name *and* leaf kind
 *   4. a generic value derived from the zod type and its bounds
 *
 * Schema evidence outranks name guesses at step 2 because a declared format is
 * a fact while a name is an inference; an override outranks everything because
 * it is the caller stating intent the schema cannot express.
 *
 * The function is pure and re-entrant: all randomness comes from a Faker
 * instance created per call and seeded from `options.seed`, so concurrent calls
 * cannot interfere and the same seed always yields byte-identical output.
 *
 * @throws {UnsupportedSchemaError} on a zod node this walker cannot generate.
 * @throws {UnknownOverridePathError} on an override path absent from the schema.
 */
export function generate<T extends z.ZodType>(
  schema: T,
  options: GenerateOptions<z.infer<T>> = {},
): z.infer<T> {
  // Typed at the edge, untyped inside. Override paths are checked against
  // `z.infer<T>` in the signature, where a caller writes them by hand; the walk
  // below addresses the schema by runtime path and cannot carry that proof.
  const {
    seed = 0,
    count,
    counts = {},
    nestedArrayLength = DEFAULT_NESTED_ARRAY_LENGTH,
    nullishRate = DEFAULT_NULLISH_RATE,
    rules = DEFAULT_RULES,
    overrides = {},
    locale,
  } = options as GenerateOptions

  const overrideEntries = new Map(Object.entries(overrides))
  const countEntries = new Map(Object.entries(counts))

  if (overrideEntries.size > 0) {
    assertOverridePathsExist(schema, overrideEntries)
  }

  // `en_GB` first so postcodes, counties and street names match the domain,
  // with `en` behind it to fill any gaps the GB locale does not define.
  const faker = new Faker({ locale: locale ? [locale] : [en_GB, en] })
  faker.seed(hashSeed(seed))

  // Only the shallowest array is the "primary collection"; everything deeper is
  // incidental (a row's tags, an alert's recommendations) and must stay small,
  // or a 20-row page would carry 20 × 137 nested entries.
  const primaryArrayPath = findArrayPaths(schema)[0]

  const arrayLength = (path: string): number => {
    const explicit = countEntries.get(path)
    if (explicit !== undefined) return explicit
    if (path === primaryArrayPath) return count ?? DEFAULT_PRIMARY_COUNT
    const [min, max] = nestedArrayLength
    return faker.number.int({ min, max })
  }

  const ctx: WalkContext = {
    faker,
    rules,
    nullishRate,
    overrides: overrideEntries,
    arrayLength,
  }

  return walk(ctx, schema, '', 0) as z.infer<T>
}

/** One node's value: an override if the caller pinned this path, else the schema's. */
function walk(
  ctx: WalkContext,
  schema: AnySchema,
  path: string,
  depth: number,
): unknown {
  if (depth > MAX_DEPTH) {
    throw new UnsupportedSchemaError('recursive schema', path)
  }

  const override = ctx.overrides.get(path)
  if (override) return override(genContext(path, ctx.faker))

  return valueFor(ctx, classify(schema), path, depth)
}

/** Dispatch on the node's kind; the composite kinds recurse, the leaves do not. */
function valueFor(
  ctx: WalkContext,
  node: SchemaNode,
  path: string,
  depth: number,
): unknown {
  switch (node.kind) {
    case 'wrapper':
      return isAbsent(ctx, node)
        ? absentValue(node.optional, node.nullable, ctx.faker)
        : walk(ctx, node.inner, path, depth + 1)

    case 'object':
      return walkObject(ctx, node.shape, path, depth)

    case 'array':
      return Array.from({ length: ctx.arrayLength(path) }, () =>
        walk(ctx, node.element, elementPath(path), depth + 1),
      )

    case 'union':
      // Resolve the branch before any rule runs, so a name rule is matched
      // against the concrete leaf kind it will have to satisfy. This is what
      // keeps `uprn: union([number, string])` type-safe.
      return walk(
        ctx,
        pickOne(ctx.faker, node.options, 'union(no options)', path),
        path,
        depth + 1,
      )

    default:
      return leafValue(ctx, node, path)
  }
}

function walkObject(
  ctx: WalkContext,
  shape: Record<string, AnySchema>,
  path: string,
  depth: number,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, child] of Object.entries(shape)) {
    const value = walk(ctx, child, childPath(path, key), depth + 1)
    // `undefined` models an omitted key, which is materially different from
    // `null` once the payload is serialised. Both occur in real upstream
    // responses, so both must be reachable here.
    if (value !== undefined) result[key] = value
  }

  return result
}

/** A scalar leaf's value. */
function leafValue(ctx: WalkContext, node: LeafNode, path: string): unknown {
  switch (node.kind) {
    case 'literal':
      return pickOne(ctx.faker, node.values, 'literal(no values)', path)

    case 'enum':
      return pickOne(ctx.faker, node.values, 'enum(no values)', path)

    case 'string':
      return generateString(
        node.format,
        node.bounds,
        path,
        ctx.faker,
        ctx.rules,
      )

    case 'number':
      return generateNumber(node.bounds, path, ctx.faker, ctx.rules)

    case 'boolean':
      return ctx.faker.datatype.boolean()

    case 'unknown':
      // Nothing can be inferred, and inventing a shape would be a lie. `null`
      // is the one value every `z.unknown()` accepts.
      return null

    case 'unsupported':
      throw new UnsupportedSchemaError(node.type, path)
  }
}

/**
 * A uniformly chosen member of a closed set.
 *
 * @throws {UnsupportedSchemaError} when the set is empty — a union, literal or
 * enum with nothing in it has no value this walker could invent.
 */
function pickOne<T>(
  faker: Faker,
  values: readonly T[],
  label: string,
  path: string,
): T {
  if (values.length === 0) throw new UnsupportedSchemaError(label, path)
  // Non-null: the empty case throws above, and the index is drawn from inside
  // that non-empty range.
  return values[faker.number.int({ min: 0, max: values.length - 1 })]!
}

/** Whether this roll drops a droppable field's value. */
function isAbsent(ctx: WalkContext, node: WrapperNode): boolean {
  // `.default()` means the value may legitimately be omitted, but a response
  // that carries it is always valid and always more useful.
  if (node.hasDefault || !(node.optional || node.nullable)) return false
  return ctx.faker.number.float() < ctx.nullishRate
}

/** A field's absence, as either an omitted key or an explicit null. */
function absentValue(
  optional: boolean,
  nullable: boolean,
  faker: Faker,
): undefined | null {
  if (optional && nullable) {
    // `.nullish()` permits both, and real payloads contain both, so neither
    // form should be the only one a consumer ever sees.
    return faker.datatype.boolean() ? undefined : null
  }
  return optional ? undefined : null
}

/**
 * Reject override paths that address nothing.
 *
 * Without this an override is silently inert — the field falls through to the
 * name rules, produces a plausible value, and the output still parses. A
 * mistyped path would only ever be noticed by someone squinting at a column.
 */
function assertOverridePathsExist(
  schema: AnySchema,
  overrides: ReadonlyMap<string, Generator>,
): void {
  const known = collectPaths(schema)
  const knownSet = new Set(known)

  for (const path of overrides.keys()) {
    if (!knownSet.has(path)) {
      throw new UnknownOverridePathError(path, known)
    }
  }
}
