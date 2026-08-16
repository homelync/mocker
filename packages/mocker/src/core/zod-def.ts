import type { z } from 'zod'

/**
 * The single place that knows about zod's internal `_zod.def` representation.
 *
 * Zod 4 exposes no public introspection API rich enough to walk a schema, so
 * every generator library reaches into internals. Quarantining that here means
 * a zod upgrade breaks exactly one file, and everything downstream works
 * against the tagged {@link SchemaNode} union instead.
 *
 * Shapes verified against zod 4.4 at runtime, not read off the types.
 */

/** Any zod schema, in the loosest form the walker needs. */
export type AnySchema = z.ZodType

interface RawDef {
  readonly type: string
  readonly shape?: Record<string, AnySchema>
  readonly element?: AnySchema
  readonly innerType?: AnySchema
  readonly options?: readonly AnySchema[]
  readonly values?: readonly unknown[]
  readonly entries?: Readonly<Record<string, string | number>>
  readonly defaultValue?: unknown
  readonly format?: string | null
  readonly checks?: readonly { readonly _zod: { readonly def: RawCheck } }[]
}

interface RawCheck {
  readonly check: string
  readonly value?: number
  readonly inclusive?: boolean
  readonly minimum?: number
  readonly maximum?: number
  readonly length?: number
  readonly format?: string
}

/** Numeric bounds distilled from a node's checks. */
export interface Bounds {
  readonly min?: number
  readonly max?: number
  /** True when `.int()` / `.length()` forces a whole number or exact length. */
  readonly exact?: number
  readonly int?: boolean
}

/**
 * A zod node in the form the walker consumes: a discriminated union covering
 * exactly what this library supports. Anything else surfaces as `unsupported`
 * so the caller can throw with a path rather than silently emitting rubbish.
 */
export type SchemaNode =
  | {
      readonly kind: 'string'
      readonly format?: string
      readonly bounds: Bounds
    }
  | { readonly kind: 'number'; readonly bounds: Bounds }
  | { readonly kind: 'boolean' }
  | { readonly kind: 'unknown' }
  | { readonly kind: 'literal'; readonly values: readonly unknown[] }
  | { readonly kind: 'enum'; readonly values: readonly (string | number)[] }
  | { readonly kind: 'array'; readonly element: AnySchema }
  | { readonly kind: 'object'; readonly shape: Record<string, AnySchema> }
  | { readonly kind: 'union'; readonly options: readonly AnySchema[] }
  | {
      readonly kind: 'wrapper'
      readonly inner: AnySchema
      /** `.optional()` — absence is expressed by omitting the key. */
      readonly optional: boolean
      /** `.nullable()` — absence is expressed as `null`. */
      readonly nullable: boolean
      /** `.default()` — the field always carries a value, so never dropped. */
      readonly hasDefault: boolean
    }
  | { readonly kind: 'unsupported'; readonly type: string }

function rawDef(schema: AnySchema): RawDef {
  return (schema as unknown as { _zod: { def: RawDef } })._zod.def
}

function boundsOf(def: RawDef): Bounds {
  const bounds: {
    min?: number
    max?: number
    exact?: number
    int?: boolean
  } = {}

  for (const wrapper of def.checks ?? []) {
    const check = wrapper._zod.def
    switch (check.check) {
      case 'greater_than':
        // `.positive()` is exclusive; nudge so the generated value satisfies it.
        bounds.min = check.inclusive ? check.value : (check.value ?? 0) + 1
        break
      case 'less_than':
        bounds.max = check.inclusive ? check.value : (check.value ?? 0) - 1
        break
      case 'min_length':
        bounds.min = check.minimum
        break
      case 'max_length':
        bounds.max = check.maximum
        break
      case 'length_equals':
        bounds.exact = check.length
        break
      case 'number_format':
        bounds.int = check.format?.includes('int') ?? false
        break
      default:
        // An unrecognised check only risks a value that fails validation, which
        // the caller's output parse catches loudly. Better than refusing to
        // generate at all for a check that may not constrain the value.
        break
    }
  }

  return bounds
}

/**
 * Classify a zod schema into the tagged node the walker understands.
 *
 * `.nullish()` is `optional(nullable(x))`, and `.default()` may wrap either, so
 * wrapper chains are collapsed in one pass. Rolling absence once against the
 * collapsed flags is what keeps `nullishRate` meaning what it says — rolling at
 * each layer would compound two 30% chances into 51%.
 */
export function classify(schema: AnySchema): SchemaNode {
  let current = schema
  let optional = false
  let nullable = false
  let hasDefault = false
  let wrapped = false

  // Collapse optional/nullable/default chains, however they were composed.
  for (;;) {
    const def = rawDef(current)
    if (def.type === 'optional' && def.innerType) {
      optional = true
      wrapped = true
      current = def.innerType
      continue
    }
    if (def.type === 'nullable' && def.innerType) {
      nullable = true
      wrapped = true
      current = def.innerType
      continue
    }
    if (def.type === 'default' && def.innerType) {
      hasDefault = true
      wrapped = true
      current = def.innerType
      continue
    }
    break
  }

  if (wrapped) {
    return { kind: 'wrapper', inner: current, optional, nullable, hasDefault }
  }

  const def = rawDef(current)

  switch (def.type) {
    case 'string':
      return {
        kind: 'string',
        format: def.format ?? undefined,
        bounds: boundsOf(def),
      }
    case 'number':
      return { kind: 'number', bounds: boundsOf(def) }
    case 'boolean':
      return { kind: 'boolean' }
    case 'unknown':
    case 'any':
      return { kind: 'unknown' }
    case 'literal':
      return { kind: 'literal', values: def.values ?? [] }
    case 'enum':
      return { kind: 'enum', values: Object.values(def.entries ?? {}) }
    case 'array':
      // An array without an element schema cannot be walked; treat as
      // unsupported rather than silently emitting [].
      return def.element
        ? { kind: 'array', element: def.element }
        : { kind: 'unsupported', type: 'array(no element)' }
    case 'object':
      return { kind: 'object', shape: def.shape ?? {} }
    case 'union':
      return { kind: 'union', options: def.options ?? [] }
    default:
      return { kind: 'unsupported', type: def.type }
  }
}
