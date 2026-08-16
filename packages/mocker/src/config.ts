/**
 * The build-time surface: everything safe to import from a bundler config.
 *
 * This entry exists because of one hard constraint. A framework's config file —
 * `next.config.ts` above all — is evaluated by the framework's own loader,
 * unbundled, before any build graph exists. Tree-shaking cannot protect it, so
 * importing the package root there would execute `zod` and `@faker-js/faker` at
 * config-load time on every `next dev`, and would emit the generator into a
 * production build that must not contain it.
 *
 * So the rule this module encodes: **nothing reachable from here may import
 * `zod` or `@faker-js/faker` at runtime.** Type-only imports are fine — they are
 * erased — which is what lets the registry vocabulary appear here at all.
 *
 * `package-boundary.test.ts` asserts the rule by walking the real import graph.
 * It is not a convention; it is the thing that makes {@link mockRewrites}-style
 * config helpers possible in the first place.
 */

// The flag: a host convention, and deliberately free of every dependency so a
// config, a browser and a Node runtime can all ask the same question.
export { isMockConfigured, isMockEnabledFor } from './flag'

// The key algebra. `match.ts` imports nothing at all — it is pure string work
// over `"METHOD /api/path?name=[param]"` keys — which is precisely why a config
// can derive interception rules from a host's registry without loading it.
export {
  describeConstraint,
  DYNAMIC_SEGMENT,
  findMatch,
  InvalidRegistryKeyError,
  isPathRegistered,
  matchPattern,
  matchQuery,
  parseKey,
} from './registry/match'
export type {
  QueryConstraint,
  RegistryKey,
  RegistryMatch,
} from './registry/match'

// The registry vocabulary, type-only. A host's table declares schemas as
// *thunks*, never values, so a config can import the table for its shape without
// pulling a single application module — or zod, or faker — into evaluation.
export type {
  CheckedMockRegistry,
  MockRegistry,
  MockRegistryDraft,
  MockRegistryDraftEntry,
  MockRegistryEntry,
} from './registry/types'
