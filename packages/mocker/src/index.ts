/**
 * `@magicspon/mocker` — schema-driven fake data, and the HTTP seam that serves
 * it.
 *
 * Two halves, both re-exported here: a **generator** that turns a zod schema
 * into plausible data, and a **handler** that turns a `Request` into a
 * `Response`. Adapters are thin because {@link handle} already speaks the
 * platform-neutral pair.
 *
 * Three entry points, and the split is load-bearing rather than cosmetic:
 *
 * - `@magicspon/mocker` — this module. Everything a *runtime* needs.
 * - `@magicspon/mocker/core` — the generator alone, depending on nothing but
 *   `zod` and `@faker-js/faker`. For a Storybook decorator, an MSW worker or a
 *   test's fixture factory: no `process.env`, no HTTP, no registry.
 * - `@magicspon/mocker/config` — the faker-free surface, for a bundler config
 *   that must not load the generator. See `config.ts` for why that matters.
 *
 * Importing the root from a `next.config.ts` is the one mistake this layout
 * exists to prevent; reach for `/config` there.
 */

// The generator and the request handler. Re-exported whole: a runtime that has
// this module has already paid for faker, so there is nothing to protect here.
export * from './core'

// Serving a request from a table of declarations, with no wrapper in the route
// file. The table itself is host data, passed in as an argument.
export * from './registry'

// Host conventions, kept out of `core/` on purpose: `core` must stay usable in a
// runtime that has no `process` and no console worth writing to.
export { isMockConfigured, isMockEnabledFor } from './flag'
export { formatMockLog, isMockLogEnabled, logMock } from './log'
export type { MockLogEntry } from './log'
