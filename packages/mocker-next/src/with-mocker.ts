// The `/config` entry's own rule applies here: this module is evaluated by
// Next's config loader, unbundled, so it may reach `./rewrites` and type-only
// imports and nothing else. `package-boundary.test.ts` walks the graph and
// fails if that stops being true.
import type { NextConfig } from 'next'
import type { MockRegistry } from '@homelync/mocker/config'
import { mockRewrites } from './rewrites'

/**
 * The Next config wrapper: one call that installs both halves of the mock.
 *
 * The two halves are unrelated mechanically and always wanted together, which is
 * the whole argument for a wrapper rather than two setup lines:
 *
 * - **Rewrites.** `mockRewrites(registry)` is merged into `beforeFiles`, so a
 *   registered route is intercepted before its `route.ts` is matched.
 * - **Resolution.** In a production build, `turbopack.resolveAlias` points
 *   `@homelync/mocker-next` at `@homelync/mocker-next/production`, so every
 *   route file that imports the adapter resolves to the stub instead. The
 *   generator — and `@faker-js/faker` behind it — cannot be emitted into a
 *   chunk, because the bundler never reads the module that imports it.
 *
 * The alias targets a package specifier rather than a path into `node_modules`:
 * the `./production` export exists for exactly this, so the path that has to
 * stay correct lives in this repo instead of in every consumer's config.
 */

/** The specifier a route file imports, and the one it resolves to instead. */
const ADAPTER_PACKAGE = '@homelync/mocker-next'
const PRODUCTION_ENTRY = '@homelync/mocker-next/production'

/** Options for {@link withMocker}. */
export interface WithMockerOptions {
  /**
   * The host's endpoint table, passed in rather than imported — the library has
   * no opinion about which endpoints exist.
   */
  readonly registry: MockRegistry
}

/** The `rewrites` value a Next config may carry, in any of its accepted forms. */
type RewritesOption = NonNullable<NextConfig['rewrites']>

/**
 * A function form resolved to the value it produces; a literal form unchanged.
 *
 * Written as a generic so the conditional distributes: Next's *type* admits
 * only the function form, but its loader accepts an array or a groups object
 * too, and a JavaScript config is not bound by the type.
 */
type Resolve<T> = T extends (...args: never[]) => infer R ? Awaited<R> : T

/** Next's own rewrite record, read off the config type rather than redeclared. */
type NextRewrite = Extract<Resolve<RewritesOption>, readonly unknown[]>[number]

/** The three lists Next actually consumes, all present. */
interface RewriteGroups {
  beforeFiles: NextRewrite[]
  afterFiles: NextRewrite[]
  fallback: NextRewrite[]
}

/**
 * A caller's `rewrites`, whatever form it took, as the three groups.
 *
 * A bare array is `afterFiles` — that is what Next's own `load-custom-routes`
 * does with it, and guessing differently here would quietly move a consumer's
 * rules ahead of their filesystem routes.
 *
 * The non-function branch is unreachable through Next's own types and reachable
 * from a JavaScript config, which its loader still accepts.
 */
async function resolveGroups(
  rewrites: RewritesOption | undefined,
): Promise<RewriteGroups> {
  const empty: RewriteGroups = {
    beforeFiles: [],
    afterFiles: [],
    fallback: [],
  }
  if (rewrites === undefined) return empty

  const value = typeof rewrites === 'function' ? await rewrites() : rewrites
  if (Array.isArray(value)) return { ...empty, afterFiles: value }

  return {
    beforeFiles: value.beforeFiles ?? [],
    afterFiles: value.afterFiles ?? [],
    fallback: value.fallback ?? [],
  }
}

/**
 * The config with the production alias applied, or untouched outside a
 * production build.
 *
 * `next build` sets `NODE_ENV=production`, so this is read once, at config
 * evaluation, and the decision is baked into resolution rather than left to a
 * runtime check the bundler would have to be clever enough to eliminate.
 *
 * Existing `turbopack` options and aliases are preserved: a consumer aliasing
 * something of their own must not lose it by adopting this wrapper.
 */
function withProductionAlias(config: NextConfig): NextConfig {
  if (process.env.NODE_ENV !== 'production') return config

  return {
    ...config,
    turbopack: {
      ...config.turbopack,
      resolveAlias: {
        ...config.turbopack?.resolveAlias,
        [ADAPTER_PACKAGE]: PRODUCTION_ENTRY,
      },
    },
  }
}

/**
 * Wrap a Next config so registered routes are mocked in development and the
 * adapter is absent from production builds.
 *
 * ```ts
 * // next.config.ts
 * import { withMocker } from "@homelync/mocker-next/config";
 * import { registry } from "./src/mocks/registry";
 *
 * export default withMocker({ registry }, {
 *   // ...the rest of your Next config
 * });
 * ```
 *
 * Merges rather than replaces. A consumer's own `rewrites` — array, object or
 * function, sync or async — survives intact; the mock's rules are prepended to
 * `beforeFiles` so an interception cannot be shadowed by a rule that was
 * already there. With `MOCK_API` unset, `mockRewrites` returns nothing and the
 * merge is the identity.
 *
 * Turbopack only: the alias is written to `turbopack.resolveAlias`, which needs
 * Next 15.3 or later and is not read by a webpack build. A webpack build still
 * serves no mock — `mockRewrites` is empty and `withMock` returns its handler —
 * but the adapter's code is bundled rather than resolved away.
 *
 * @param options the registry to derive interception rules from
 * @param config the config to wrap; omit it to start from an empty one
 */
export function withMocker(
  options: WithMockerOptions,
  config: NextConfig = {},
): NextConfig {
  return {
    ...withProductionAlias(config),
    // Deliberately a function, even when the caller gave a literal: the mock's
    // rules read `MOCK_API` through `mockRewrites`, and Next calls this once at
    // config load, which is where the flag is meant to be read.
    rewrites: async (): Promise<RewriteGroups> => {
      const existing = await resolveGroups(config.rewrites)

      return {
        ...existing,
        beforeFiles: [
          ...mockRewrites(options.registry),
          ...existing.beforeFiles,
        ],
      }
    },
  }
}
