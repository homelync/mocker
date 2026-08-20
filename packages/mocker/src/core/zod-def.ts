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

/** {@link Bounds} while it is still being filled in. */
type MutableBounds = {
  min?: number
  max?: number
  exact?: number
  int?: boolean
}

/**
 * What each zod check contributes to a node's bounds, keyed by `check.check`.
 *
 * A table rather than a switch so a new check is one entry, and so an
 * unrecognised one needs no branch at all.
 */
const BOUNDS_WRITERS: Readonly<
  Record<string, (check: RawCheck, bounds: MutableBounds) => void>
> = {
  greater_than: (check, bounds) => {
    // `.positive()` is exclusive; nudge so the generated value satisfies it.
    bounds.min = check.inclusive ? check.value : (check.value ?? 0) + 1
  },
  less_than: (check, bounds) => {
    bounds.max = check.inclusive ? check.value : (check.value ?? 0) - 1
  },
  min_length: (check, bounds) => {
    bounds.min = check.minimum
  },
  max_length: (check, bounds) => {
    bounds.max = check.maximum
  },
  length_equals: (check, bounds) => {
    bounds.exact = check.length
  },
  number_format: (check, bounds) => {
    bounds.int = check.format?.includes('int') ?? false
  },
}

function boundsOf(def: RawDef): Bounds {
  const bounds: MutableBounds = {}

  for (const wrapper of def.checks ?? []) {
    const check = wrapper._zod.def
    // An unrecognised check only risks a value that fails validation, which the
    // caller's output parse catches loudly. Better than refusing to generate at
    // all for a check that may not constrain the value.
    BOUNDS_WRITERS[check.check]?.(check, bounds)
  }

  return bounds
}

/** The wrapper flag each wrapping `def.type` sets. */
const WRAPPER_FLAGS: Readonly<
  Record<string, 'optional' | 'nullable' | 'hasDefault'>
> = {
  optional: 'optional',
  nullable: 'nullable',
  default: 'hasDefault',
}

/**
 * Collapse an optional/nullable/default chain, however it was composed.
 *
 * `.nullish()` is `optional(nullable(x))`, and `.default()` may wrap either, so
 * the whole chain is flattened in one pass. Rolling absence once against the
 * collapsed flags is what keeps `nullishRate` meaning what it says — rolling at
 * each layer would compound two 30% chances into 51%.
 */
function unwrap(schema: AnySchema): {
  inner: AnySchema
  wrapped: boolean
  optional: boolean
  nullable: boolean
  hasDefault: boolean
} {
  const flags = { optional: false, nullable: false, hasDefault: false }
  let inner = schema
  let wrapped = false

  for (;;) {
    const def = rawDef(inner)
    const flag = WRAPPER_FLAGS[def.type]
    if (flag === undefined || !def.innerType) break
    flags[flag] = true
    wrapped = true
    inner = def.innerType
  }

  return { inner, wrapped, ...flags }
}

/**
 * How each supported zod type becomes a {@link SchemaNode}, keyed by `def.type`.
 *
 * A table rather than a switch: an unlisted type falls through to `unsupported`
 * without a branch, which is exactly the intent.
 */
const NODE_BUILDERS: Readonly<Record<string, (def: RawDef) => SchemaNode>> = {
  string: (def) => ({
    kind: 'string',
    format: def.format ?? undefined,
    bounds: boundsOf(def),
  }),
  number: (def) => ({ kind: 'number', bounds: boundsOf(def) }),
  boolean: () => ({ kind: 'boolean' }),
  unknown: () => ({ kind: 'unknown' }),
  any: () => ({ kind: 'unknown' }),
  literal: (def) => ({ kind: 'literal', values: def.values ?? [] }),
  enum: (def) => ({ kind: 'enum', values: Object.values(def.entries ?? {}) }),
  // An array without an element schema cannot be walked; treat as unsupported
  // rather than silently emitting [].
  array: (def) =>
    def.element
      ? { kind: 'array', element: def.element }
      : { kind: 'unsupported', type: 'array(no element)' },
  object: (def) => ({ kind: 'object', shape: def.shape ?? {} }),
  union: (def) => ({ kind: 'union', options: def.options ?? [] }),
}

/** Classify a zod schema into the tagged node the walker understands. */
export function classify(schema: AnySchema): SchemaNode {
  const { inner, wrapped, ...flags } = unwrap(schema)
  if (wrapped) return { kind: 'wrapper', inner, ...flags }

  const def = rawDef(inner)
  return (
    NODE_BUILDERS[def.type]?.(def) ?? { kind: 'unsupported', type: def.type }
  )
}
