/**
 * The endpoint registry: serving a request from a table of declarations, with
 * no wrapper in the route file.
 *
 * Runtime-agnostic and host-agnostic. `types.ts` is the vocabulary a host
 * declares in, `match.ts` the (pure) key algebra, and `serve.ts` the
 * `Request` → `Response` seam every adapter reuses. The table itself is **not
 * here**: it is host data, passed in as an argument, so this folder can be
 * lifted into a package without dragging an application's endpoints with it.
 *
 * `mock/core` is forbidden from importing any of this by an eslint zone — the
 * registry knows what an HTTP route is, and the generator must not.
 */
export {
  describeConstraint,
  findMatch,
  InvalidRegistryKeyError,
  isPathRegistered,
  matchPattern,
  matchQuery,
  parseKey,
  DYNAMIC_SEGMENT,
} from "./match";
export { isRegistryMiss, serveFromRegistry } from "./serve";
export type { QueryConstraint, RegistryKey, RegistryMatch } from "./match";
export type { RegistryMiss } from "./serve";
export type {
  CheckedMockRegistry,
  MockRegistry,
  MockRegistryDraft,
  MockRegistryDraftEntry,
  MockRegistryEntry,
} from "./types";
// Re-exported so a host's table needs one import, not two: `MockOptions` is
// what an entry's `options` literal is annotated with, and annotating it is the
// only way an editor can complete a canonical path.
export type { MockOptions } from "../core";
