/**
 * Errors the generator throws. Both carry the canonical path of the offending
 * node so a failure names the exact field rather than the whole schema — the
 * difference between "unsupported zod type" and
 * "unsupported zod type `map` at `results[].readings`".
 *
 * These are classes rather than `invariant` guards because callers (the future
 * registration-time validator) need the structured `path` field, not just a
 * message.
 */

/** Thrown when the walker meets a zod node it has no generator for. */
export class UnsupportedSchemaError extends Error {
  readonly path: string
  readonly zodType: string

  constructor(zodType: string, path: string) {
    super(
      `Unsupported zod type "${zodType}" at ${path === '' ? '<root>' : path}. ` +
        `Add a generator for it, or pin the field with an override.`,
    )
    this.name = 'UnsupportedSchemaError'
    this.zodType = zodType
    this.path = path
  }
}

/**
 * Thrown when an override key matches no path in the schema.
 *
 * This exists because a typo'd override is otherwise completely silent: the
 * field falls through to the name rules, produces a plausible value, and the
 * output still validates. The only way to catch `results[].statusID` (wrong
 * case) is to reject it up front.
 */
export class UnknownOverridePathError extends Error {
  readonly path: string
  readonly knownPaths: readonly string[]

  constructor(path: string, knownPaths: readonly string[]) {
    super(
      `Override path "${path}" does not exist in the schema.` +
        suggest(path, knownPaths),
    )
    this.name = 'UnknownOverridePathError'
    this.path = path
    this.knownPaths = knownPaths
  }
}

/**
 * Offer the closest known path when one is obviously similar. Case-insensitive
 * equality catches the overwhelmingly common failure (`statusID` for
 * `statusId`); anything subtler is left to the caller to spot from the list.
 */
function suggest(path: string, knownPaths: readonly string[]): string {
  const match = knownPaths.find(
    (known) => known.toLowerCase() === path.toLowerCase(),
  )
  if (match) return ` Did you mean "${match}"?`

  const sample = knownPaths.slice(0, 8).join(', ')
  return knownPaths.length > 8
    ? ` Known paths include: ${sample}, ...`
    : ` Known paths: ${sample}`
}
