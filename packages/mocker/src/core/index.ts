/**
 * Schema-driven fake data generation and request handling.
 *
 * Platform agnostic by construction: this folder imports nothing but `zod` and
 * `@faker-js/faker`, and an eslint zone forbids it from reaching into the host
 * application. Adapters (Next, Playwright, Nest) live outside it, and are thin
 * because {@link handle} already speaks `Request`/`Response`.
 */
export { generate, localeChain } from './generate'
export { handle, MOCK_MARKER_HEADER, MOCK_SEED_RESPONSE_HEADER } from './handle'
export { DEFAULT_RULES } from './rules'
export { UnknownOverridePathError, UnsupportedSchemaError } from './errors'
export { InvalidControlError, readControls } from './controls'
export {
  MOCK_COUNT_HEADER,
  MOCK_DELAY_HEADER,
  MOCK_LOCALE_HEADER,
  MOCK_SEED_HEADER,
  MOCK_STATUS_HEADER,
} from './controls'
export { isLocaleName, LOCALE_NAMES, resolveLocales } from './locales'
export { collectLeafKinds, collectPaths, findArrayPaths } from './paths'
export { requestSignature, shapeRequest } from './shape'
export { hashSeed } from './hash'
// Where a fixed response lives on disk, and how it is written. Here rather than
// in an adapter because both adapters that have a filesystem must agree on the
// answer — see `fixture.ts`.
export { fixturePath, serializeFixture } from './fixture'
export { LEAF_KINDS } from './types'
export type { HandleContext, MockEndpoint } from './handle'
export type { MockControls } from './controls'
export type { MockRequestInput } from './shape'
export type {
  GenContext,
  GenerateOptions,
  Generator,
  LeafKind,
  MockOptions,
  NameRule,
} from './types'
export type {
  ArrayPath,
  CheckedCounts,
  CheckedOverrides,
  PathCounts,
  PathOverrides,
  SchemaPath,
  SchemaPosition,
  UnknownArrayPath,
  UnknownSchemaPath,
  ValueAtPath,
} from './path-types'
