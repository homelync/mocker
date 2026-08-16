import type { LeafKind } from "./types";
import { classify, type AnySchema } from "./zod-def";

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
  return parent === "" ? key : `${parent}.${key}`;
}

/** Path of any element of the array at `parent`. */
export function elementPath(parent: string): string {
  return `${parent}[]`;
}

/** The final segment of a path — the field name a {@link NameRule} matches on. */
export function pathKey(path: string): string {
  const lastDot = path.lastIndexOf(".");
  const segment = lastDot === -1 ? path : path.slice(lastDot + 1);
  // An element path (`results[]`) has no name of its own; a rule should see the
  // collection's name rather than an empty string.
  return segment.endsWith("[]") ? segment.slice(0, -2) : segment;
}

/**
 * Every canonical path the generator could visit.
 *
 * Used to reject override paths that match nothing. This is a separate walk
 * from generation on purpose: marking overrides "used" during generation would
 * wrongly report a typo whenever the real cause was an array that happened to
 * generate zero elements, or an optional branch that happened to be dropped.
 *
 * Unions contribute the paths of every branch, since any of them may be chosen.
 */
export function collectPaths(schema: AnySchema): string[] {
  const paths: string[] = [];
  const seen = new Set<string>();

  const visit = (node: AnySchema, path: string, depth: number): void => {
    // Depth is bounded purely as a guard against a self-referential schema
    // reaching here; recursive types are unsupported and throw during
    // generation, but collectPaths runs first and must not hang.
    if (depth > 20) return;

    if (!seen.has(path)) {
      seen.add(path);
      paths.push(path);
    }

    const classified = classify(node);
    switch (classified.kind) {
      case "wrapper":
        visit(classified.inner, path, depth + 1);
        return;
      case "object":
        for (const [key, child] of Object.entries(classified.shape)) {
          visit(child, childPath(path, key), depth + 1);
        }
        return;
      case "array":
        visit(classified.element, elementPath(path), depth + 1);
        return;
      case "union":
        for (const option of classified.options) {
          visit(option, path, depth + 1);
        }
        return;
      default:
        return;
    }
  };

  visit(schema, "", 0);
  return paths;
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
  const kinds = new Map<string, LeafKind>();

  const visit = (node: AnySchema, path: string, depth: number): void => {
    if (depth > 20) return;

    const classified = classify(node);
    switch (classified.kind) {
      case "wrapper":
        visit(classified.inner, path, depth + 1);
        return;
      case "object":
        for (const [key, child] of Object.entries(classified.shape)) {
          visit(child, childPath(path, key), depth + 1);
        }
        return;
      case "array":
        visit(classified.element, elementPath(path), depth + 1);
        return;
      case "union":
        for (const option of classified.options) {
          visit(option, path, depth + 1);
        }
        return;
      case "string":
      case "number":
      case "boolean":
        if (!kinds.has(path)) kinds.set(path, classified.kind);
        return;
      default:
        return;
    }
  };

  visit(schema, "", 0);
  return kinds;
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
  const found: { path: string; depth: number; order: number }[] = [];
  let order = 0;

  const visit = (node: AnySchema, path: string, depth: number): void => {
    if (depth > 20) return;

    const classified = classify(node);
    switch (classified.kind) {
      case "wrapper":
        visit(classified.inner, path, depth);
        return;
      case "array":
        found.push({ path, depth, order: order++ });
        visit(classified.element, elementPath(path), depth + 1);
        return;
      case "object":
        for (const [key, child] of Object.entries(classified.shape)) {
          visit(child, childPath(path, key), depth + 1);
        }
        return;
      case "union":
        for (const option of classified.options) {
          visit(option, path, depth);
        }
        return;
      default:
        return;
    }
  };

  visit(schema, "", 0);

  return found
    .sort((a, b) => a.depth - b.depth || a.order - b.order)
    .map((entry) => entry.path);
}
