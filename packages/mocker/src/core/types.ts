import type { Faker, LocaleDefinition } from '@faker-js/faker'
import type { z } from 'zod'
import type { PathCounts, PathOverrides } from './path-types'

/**
 * The kinds of leaf a name rule can claim.
 *
 * A rule must declare these because field names are not unique across types:
 * `deviceRow.id` is `z.string()` while `address.id` is `z.number().nullish()`.
 * A rule matching `/Id$/` and emitting a string would put a string into a
 * number field, which the output schema then rejects. Matching on name *and*
 * type is what makes name-based generation safe.
 */
export const LEAF_KINDS = ['string', 'number', 'boolean'] as const

export type LeafKind = (typeof LEAF_KINDS)[number]

/** Where a value is being generated, handed to every generator function. */
export interface GenContext {
  /**
   * Canonical path to this value, with array indices collapsed to `[]` so one
   * override covers every element: `results[].address.postcode`.
   */
  readonly path: string
  /** The final path segment — the field name a rule matched against. */
  readonly key: string
  /** The seeded faker instance for this generate() call. */
  readonly faker: Faker
}

/**
 * Produces a value for one field.
 *
 * `Value` is what the field is allowed to hold. It defaults to `unknown` — a
 * name rule claims fields by name across every schema and cannot know their
 * types — but an override pins one *known* field, so there the parameter is
 * filled in from the schema and a mistyped return is a compile error rather
 * than a `Mock output failed its own schema` at request time.
 */
export type Generator<Value = unknown> = (context: GenContext) => Value

/**
 * Maps a field *name* to a generator, for the very common case where the schema
 * says `z.string()` but the domain means an ISO date, a postcode or an email.
 * Zod carries the shape; it does not carry that intent.
 */
export interface NameRule {
  /** Identifies the rule in errors and lets a consumer replace one by name. */
  readonly name: string
  /** Tested against the field name (the last path segment), not the full path. */
  readonly match: RegExp
  /** Leaf kinds this rule may claim. See {@link LEAF_KINDS}. */
  readonly types: readonly LeafKind[]
  readonly gen: Generator
}

/**
 * Options for a single {@link generate} call.
 *
 * `Output` is the schema's inferred output type, which is what makes
 * {@link GenerateOptions.overrides} path- and type-checked. It defaults to
 * `unknown` for the layers that handle *any* schema — `shapeRequest`, the
 * adapters — where the paths are computed at runtime and nothing could be
 * proven statically anyway.
 */
export interface GenerateOptions<Output = unknown> {
  /**
   * Anything hashable. The same seed and schema always produce byte-identical
   * output, which is what lets a mock be asserted against.
   */
  readonly seed?: number | string
  /**
   * Length of the *primary* collection — the shallowest array in the schema
   * (`results` in a `{ results, count, totalPages }` envelope, or the root
   * itself when the schema is an array). Deeper arrays use
   * {@link nestedArrayLength}. Use {@link counts} to size a specific array.
   */
  readonly count?: number
  /** Length of any array that is not the primary collection. Default `[0, 3]`. */
  readonly nestedArrayLength?: readonly [min: number, max: number]
  /**
   * Exact lengths by canonical array path, e.g. `{ "results[].tags": 2 }`.
   *
   * Only paths the schema declares as arrays; sizing anything else does nothing
   * at all, and unlike an override it does not even fail loudly.
   */
  readonly counts?: PathCounts<Output>
  /**
   * Probability that an `.optional()` / `.nullable()` / `.nullish()` field is
   * absent. Defaults to 0.3, roughly matching how sparse real API payloads
   * are. Set to 0 for a fully populated response.
   */
  readonly nullishRate?: number
  /**
   * Name rules, highest precedence first. Defaults to {@link DEFAULT_RULES}.
   * Pass `[...myRules, ...DEFAULT_RULES]` to extend rather than replace.
   */
  readonly rules?: readonly NameRule[]
  /**
   * Pins specific fields by canonical path. Highest precedence of all.
   *
   * An override whose path does not exist in the schema is an error, not a
   * no-op — at compile time where `Output` is known, and at request time
   * ({@link UnknownOverridePathError}) where it is not.
   */
  readonly overrides?: PathOverrides<Output>
  /**
   * Faker locale, or a fallback chain highest priority first. Defaults to
   * `en_GB`, this domain being UK housing stock — postcodes and counties have
   * to look British.
   *
   * `en` is appended to whatever is given unless it is already in the chain.
   * Most locales are partial, and faker throws rather than inventing a value
   * for a category its locale does not define, so a bare `de_CH` would fail on
   * the first field it has no data for.
   */
  readonly locale?: LocaleDefinition | readonly LocaleDefinition[]
}

/**
 * {@link GenerateOptions} for a schema *value*, for annotating an options
 * literal where it is written:
 *
 * ```ts
 * options: {
 *   overrides: { "results[].statusId": () => "GOOD" },
 * } satisfies MockOptions<typeof devicesResponseSchema>,
 * ```
 *
 * This is what an editor needs to offer completions. A type only reaches a
 * literal *while it is being typed* if it is contextual there, and a check
 * applied afterwards — however thorough — arrives too late to suggest anything.
 * It also restores excess-property checking, so a mistyped path is flagged on
 * the line that carries it rather than on the whole table.
 *
 * Annotating `options` and not the whole entry is deliberate: the entry's
 * `schema` thunk must keep the type it infers, or the checks that read it back
 * would be verifying the annotation against itself. Because the thunk is
 * untouched, a `satisfies` naming the *wrong* schema here is still caught.
 */
export type MockOptions<Schema extends z.ZodType> = GenerateOptions<
  z.infer<Schema>
>
