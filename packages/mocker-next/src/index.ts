/**
 * The Next.js adapter — everything this mock knows about the App Router.
 *
 * Two runtime entry points, both of which end up in the same `handle()`:
 *
 * - {@link withMock}, wrapped around a route handler (`with-mock.ts`)
 * - {@link serveRegistryRoute}, behind a rewrite (`registry-route.ts`)
 *
 * Build-time helpers are **not** re-exported here. `next.config.ts` imports
 * `./rewrites` directly by relative path for two reasons: Next's config loader
 * does not resolve tsconfig path aliases, and this module reaches the generator
 * (and faker) — which config evaluation must not.
 *
 * This file is the alias target that disappears in production. `next.config.ts`
 * points `turbopack.resolveAlias` at `index.prod.ts` when
 * `NODE_ENV === "production"`, so keep the two exporting the same names.
 */
export { withMock } from "./with-mock";
export { serveRegistryRoute } from "./registry-route";
export type { MockEndpointOptions, NextRouteHandler } from "./with-mock";
