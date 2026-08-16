/**
 * `@magicspon/mocker-next` — everything this mock knows about the App Router.
 *
 * Two runtime entry points, both of which end up in the same `handle()`:
 *
 * - {@link withMock}, wrapped around a route handler (`with-mock.ts`)
 * - {@link serveRegistryRoute}, behind a rewrite (`registry-route.ts`)
 *
 * Build-time helpers are **not** re-exported here, and importing this module
 * from a `next.config.ts` is the one mistake the package layout exists to
 * prevent: this file reaches the generator, and through it `@faker-js/faker`,
 * which config evaluation must not load. A config imports
 * `@magicspon/mocker-next/config` instead.
 *
 * This file is the alias target that disappears in production.
 * `withMocker()` points Turbopack's `resolveAlias` at
 * `@magicspon/mocker-next/production` when `NODE_ENV === "production"`, so the
 * two must keep exporting the same names — `package-boundary.test.ts` asserts
 * it, because a stub that silently drifts fails in exactly one direction:
 * faker in a production bundle.
 */
export { withMock } from './with-mock'
export { serveRegistryRoute } from './registry-route'
export type { MockEndpointOptions, NextRouteHandler } from './with-mock'
