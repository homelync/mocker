/**
 * The `next.config.ts` surface — the only part of this adapter a Next config
 * may import.
 *
 * Next evaluates its config with its own loader, unbundled, before any build
 * graph exists. Importing the adapter root here would pull `withMock` and, with
 * it, the generator and `@faker-js/faker` into config evaluation on every
 * `next dev` — and into a production build that must not contain them.
 *
 * So this module reaches only `@magicspon/mocker/config`, which carries the same
 * guarantee one level down, and `./rewrites`, which is pure apart from the flag.
 * `package-boundary.test.ts` walks the real import graph and fails if anything
 * here acquires a runtime path to `zod` or `@faker-js/faker`.
 *
 * ```ts
 * // next.config.ts
 * import { withMocker } from "@magicspon/mocker-next/config";
 * import { registry } from "./src/mocks/registry";
 *
 * export default withMocker({ registry }, {
 *   // ...the rest of your Next config
 * });
 * ```
 *
 * {@link mockRewrites} stays exported for a config that would rather assemble
 * its own `rewrites` — `withMocker` is the same rules plus the production
 * alias, which is the half nobody should have to write out.
 */
export {
  mockRewrites,
  MOCK_ENDPOINT_PREFIX,
  toRouteDirectory,
} from './rewrites'
export type { Rewrite, RewriteHas } from './rewrites'
export { withMocker } from './with-mocker'
export type { WithMockerOptions } from './with-mocker'
