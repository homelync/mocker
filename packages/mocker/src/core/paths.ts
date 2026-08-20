import type { LeafKind } from './types'
import { classify } from './zod-def'
import type { AnySchema, SchemaNode } from './zod-def'

/**
 * Canonical paths address a *position* in a schema, not a position in the
 * generated value: array indices collapse to `[]`, so one override covers every
 * element of a collection.
 *
 *   ""                              the root
 *   "results"                       a field of a root object
 *   "results[]"                     any element of that array
 *   "results[].address.postcode"    a field of any element
 *
 * The empty root is why paths are built with a helper rather than by string
 * concatenation at the call site.
 */

/** Path of an object field within `parent`. */
export function childPath(parent: string, key: string): string {
  return parent === '' ? key : `${parent}.${key}`
}

/** Path of any element of the array at `parent`. */
export function elementPath(parent: string): string {
  return `${parent}[]`
}

/** The final segment of a path — the field name a {@link NameRule} matches on. */
export function pathKey(path: string): string {
  const lastDot = path.lastIndexOf('.')
  const segment = lastDot === -1 ? path : path.slice(lastDot + 1)
  // An element path (`results[]`) has no name of its own; a rule should see the
  // collection's name rather than an empty string.
  return segment.endsWith('[]') ? segment.slice(0, -2) : segment
}

/**
 * Recursion limit. Bounded purely as a guard against a self-referential schema
 * reaching here: recursive types are unsupported and throw during generation,
 * but these walks run first and must not hang.
 */
const MAX_DEPTH = 20

/** One node of a schema walk, with the path that addresses it. */
interface Visited {
  readonly node: SchemaNode
  readonly path: string
  /**
   * Nesting depth in object fields and array elements. Wrappers and union
   * branches do not deepen a path, so they do not deepen this either.
   */
  readonly depth: number
}

/**
 * Walk every node of a schema in declaration order, calling `visit` on each.
 *
 * The one traversal behind all three collectors below — they differ only in
 * what they record. Unions descend into every branch, since any of them may be
 * chosen; wrappers descend into their inner type at the same path.
 */
function walkSchema(
  schema: AnySchema,
  visit: (visited: Visited) => void,
): void {
  // `guard` counts every recursion, `depth` only the structural ones, so a
  // wrapper or union cycle still terminates.
  const step = (
    schema: AnySchema,
    path: string,
    depth: number,
    guard: number,
  ): void => {
    if (guard > MAX_DEPTH) return

    const node = classify(schema)
    visit({ node, path, depth })

    switch (node.kind) {
      case 'wrapper':
        step(node.inner, path, depth, guard + 1)
        return
      case 'object':
        for (const [key, child] of Object.entries(node.shape)) {
          step(child, childPath(path, key), depth + 1, guard + 1)
        }
        return
      case 'array':
        step(node.element, elementPath(path), depth + 1, guard + 1)
        return
      case 'union':
        for (const option of node.options) {
          step(option, path, depth, guard + 1)
        }
        return
      default:
        return
    }
  }

  step(schema, '', 0, 0)
}

/**
 * Every canonical path the generator could visit.
 *
 * Used to reject override paths that match nothing. This is a separate walk
 * from generation on purpose: marking overrides "used" during generation would
 * wrongly report a typo whenever the real cause was an array that happened to
 * generate zero elements, or an optional branch that happened to be dropped.
 */
export function collectPaths(schema: AnySchema): string[] {
  const paths: string[] = []
  const seen = new Set<string>()

  walkSchema(schema, ({ path }) => {
    if (seen.has(path)) return
    seen.add(path)
    paths.push(path)
  })

  return paths
}

/**
 * Canonical paths of every scalar leaf in the schema, mapped to its kind.
 *
 * This is what lets a caller decide whether a value may be pinned at a path
 * *before* generation, which is the difference between an override that works
 * and one that produces a type the output parse then rejects. Both request
 * shaping jobs need it: pinning `count` only if `count` is a number, and
 * echoing `?reference=X` only into a string field of that name.
 *
 * Where a union offers several kinds at one path the first is recorded, since a
 * pinned value has to commit to one of them.
 */
export function collectLeafKinds(schema: AnySchema): Map<string, LeafKind> {
  const kinds = new Map<string, LeafKind>()

  walkSchema(schema, ({ node, path }) => {
    if (!isLeafKind(node.kind) || kinds.has(path)) return
    kinds.set(path, node.kind)
  })

  return kinds
}

/** Narrows a node's kind to the scalar kinds a value may be pinned at. */
function isLeafKind(kind: SchemaNode['kind']): kind is LeafKind {
  return kind === 'string' || kind === 'number' || kind === 'boolean'
}

/**
 * Canonical paths of every array in the schema, shallowest first.
 *
 * The first entry is the "primary collection" that {@link GenerateOptions.count}
 * sizes — `results` in a `{ results, count, totalPages }` envelope, or `""`
 * when the schema is itself an array. Ties at the same depth are broken by
 * declaration order, which keeps the choice stable across runs.
 */
export function findArrayPaths(schema: AnySchema): string[] {
  const found: { path: string; depth: number; order: number }[] = []

  walkSchema(schema, ({ node, path, depth }) => {
    if (node.kind !== 'array') return
    found.push({ path, depth, order: found.length })
  })

  return found
    .sort((a, b) => a.depth - b.depth || a.order - b.order)
    .map((entry) => entry.path)
}
