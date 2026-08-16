import type { Generator } from './types'

/**
 * Canonical paths in the *type* system — the compile-time twin of `paths.ts`.
 *
 * `collectPaths` walks a zod schema at runtime and rejects an override whose
 * path addresses nothing; everything here does the same walk over the schema's
 * inferred output type, so the same mistake is a red squiggle rather than a 500
 * from a dev server. The two must agree on spelling — `results[].address.line1`,
 * array indices collapsed to `[]`, the root written `""` — because a developer
 * reads one error and fixes the other.
 *
 * Type-only, and deliberately so: nothing here emits a byte, which is what lets
 * a build-time config keep importing the host's registry without pulling zod,
 * faker or an application module into config evaluation.
 */

/**
 * How many levels the walk descends before it stops checking.
 *
 * Past this, paths are *accepted unchecked* rather than rejected (see
 * {@link Unchecked}): a schema deeper than the budget is unusual, but a false
 * "no such path" on a path that really exists would be far worse than a missed
 * typo. Raising it costs compile time on every entry, not just the deep ones.
 */
type MaxDepth = 8

/** Countdown for the depth budget; `Prev[D]` is one level deeper. */
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8]

/** Path of an object field within `Parent` — the root has no leading dot. */
type Join<Parent extends string, Key extends string> = Parent extends ''
  ? Key
  : `${Parent}.${Key}`

/**
 * Types the walk must not descend into.
 *
 * `Date` is an object to TypeScript, so without this a `z.date()` field would
 * contribute `toISOString`, `getTime` and forty more "paths" that no generator
 * could ever be asked for.
 */
type Opaque = Date | RegExp | ((...args: never[]) => unknown)

/** One position the generator could visit: its canonical path, and what sits there. */
export interface SchemaPosition<Path extends string = string, Value = unknown> {
  readonly path: Path
  readonly value: Value
}

/**
 * Everything below the depth budget, accepted with no claim about its type.
 *
 * Both suffix forms are needed because the walk could have been cut off just
 * above a field (`.name`) or just above an array (`[]`).
 */
type Unchecked<Path extends string> = SchemaPosition<
  `${Path}.${string}` | `${Path}[]${string}`
>

/** Every position reachable from `T`, itself included. */
type Positions<T, Path extends string, Depth extends number> =
  | SchemaPosition<Path, T>
  | (Depth extends 0 ? Unchecked<Path> : Descend<NonNullable<T>, Path, Depth>)

/**
 * The positions *inside* a value.
 *
 * `T` is naked in the conditional on purpose: a union distributes, so every
 * branch contributes its own paths — matching `collectPaths`, which visits all
 * options of a `z.union()` because any of them may be the one generated.
 */
type Descend<T, Path extends string, Depth extends number> = T extends Opaque
  ? never
  : T extends readonly (infer Element)[]
    ? Positions<Element, `${Path}[]`, Prev[Depth]>
    : T extends object
      ? {
          [Key in Extract<keyof T, string>]: Positions<
            T[Key],
            Join<Path, Key>,
            Prev[Depth]
          >
        }[Extract<keyof T, string>]
      : never

/** True when `T` carries no information — e.g. an unparameterised `z.ZodType`. */
type Untyped<T> = unknown extends T ? true : false

/** Every position in a schema's output type. */
type SchemaPositions<T> = Positions<T, '', MaxDepth>

/** Every canonical path a schema's output type offers. */
export type SchemaPath<T> = SchemaPositions<T>['path']

/** The type sitting at `Path`, or `never` if the schema has no such position. */
export type ValueAtPath<T, Path extends string> = Extract<
  SchemaPositions<T>,
  SchemaPosition<Path>
>['value']

/**
 * Every canonical path of an *array* — the paths `counts` may size.
 *
 * A position past the depth budget carries `unknown` and is accepted, on the
 * same grounds as {@link Unchecked}: nothing is known about it either way, and
 * rejecting a real array would be the worse error.
 */
export type ArrayPath<T> =
  SchemaPositions<T> extends infer Position
    ? Position extends SchemaPosition
      ? NonNullable<Position['value']> extends readonly unknown[]
        ? Position['path']
        : unknown extends Position['value']
          ? Position['path']
          : never
      : never
    : never

/**
 * Overrides for a schema whose output type is `Output`, keyed by canonical path.
 *
 * A generator's return type is checked against the field it pins, which is the
 * half of the contract the runtime cannot check cheaply: a string pinned into a
 * numeric field only surfaces as `Mock output failed its own schema` once the
 * response has been generated and re-parsed.
 *
 * Falls back to the untyped record when `Output` is `unknown`, so a caller
 * holding a bare `z.ZodType` — the mock's own internals, mostly — is not forced
 * to prove anything it cannot know.
 */
export type PathOverrides<Output> =
  Untyped<Output> extends true
    ? Readonly<Record<string, Generator>>
    : {
        readonly [Path in SchemaPath<Output>]?: Generator<
          ValueAtPath<Output, Path>
        >
      }

/**
 * Exact array lengths by canonical path, for a schema whose output is `Output`.
 *
 * Restricted to array positions, since sizing anything else is meaningless —
 * and `{ readings: 365 }` against a schema whose collection is called `results`
 * is otherwise silently inert.
 */
export type PathCounts<Output> =
  Untyped<Output> extends true
    ? Readonly<Record<string, number>>
    : { readonly [Path in ArrayPath<Output>]?: number }

/**
 * What an unknown override path collapses to.
 *
 * A string literal rather than `never` because the compiler prints the expected
 * type verbatim, and `... is not assignable to type 'never'` says nothing about
 * what went wrong. This spells the diagnosis out in the error itself.
 */
export type UnknownSchemaPath<Path extends string> =
  `override path not found in this schema: ${Path}`

/** The `counts` counterpart of {@link UnknownSchemaPath}. */
export type UnknownArrayPath<Path extends string> =
  `no array at this path in the schema: ${Path}`

/**
 * `Declared` overrides, checked key by key against `Output`.
 *
 * Distinct from {@link PathOverrides} because it maps over the keys the caller
 * *wrote* rather than the keys the schema offers. Both directions are needed:
 * mapping over the schema catches a wrong value type, but its properties are
 * optional, so an unknown key is only caught by an excess-property check — which
 * TypeScript performs on fresh object literals and nowhere else. The registry is
 * checked one statement after it is declared, by which point the literal is no
 * longer fresh, so its typos have to be caught here instead.
 */
export type CheckedOverrides<Output, Declared> =
  Untyped<Output> extends true
    ? Declared
    : {
        readonly [Path in keyof Declared]: Path extends SchemaPath<Output>
          ? Generator<ValueAtPath<Output, Path>>
          : UnknownSchemaPath<Path & string>
      }

/** {@link CheckedOverrides}, for `counts`. */
export type CheckedCounts<Output, Declared> =
  Untyped<Output> extends true
    ? Declared
    : {
        readonly [Path in keyof Declared]: Path extends ArrayPath<Output>
          ? number
          : UnknownArrayPath<Path & string>
      }
