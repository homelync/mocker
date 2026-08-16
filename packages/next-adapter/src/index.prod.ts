import { NextResponse, type NextRequest } from "next/server";

/**
 * The production stand-in for `@mock/adapters/next`.
 *
 * `next.config.ts` points `turbopack.resolveAlias` at this file when
 * `NODE_ENV === "production"`, so every route file that imports the adapter
 * resolves *here* instead. Turbopack never reads the real adapter, so neither
 * the generator nor faker can be emitted into a chunk — the mock is absent from
 * the build by resolution, not by a flag check the bundler has to be clever
 * enough to eliminate.
 *
 * Route sources are untouched by this. `withMock(schema, handler)` still reads
 * exactly as it did; it just resolves to a function that hands the handler back.
 *
 * Every export of `index.ts` must have a stub here, and the signatures must stay
 * assignment-compatible with the real ones, or `tsc` under a production-shaped
 * build would disagree with the dev one.
 */

/** A Next route handler, with its arity preserved. */
export type NextRouteHandler<TArgs extends unknown[] = []> = (
  request: NextRequest,
  ...args: TArgs
) => Promise<NextResponse>;

/**
 * Per-endpoint options, structurally rather than by importing the real type.
 *
 * A route that pins generation options annotates them with this. Even an
 * `import type` from `core` would be a reference to the module this stub exists
 * to keep unresolved, and the only consumer is a value handed straight to a
 * parameter typed `unknown`.
 */
export interface MockEndpointOptions {
  readonly status?: number;
  readonly options?: unknown;
}

/**
 * Returns the handler unchanged. Always.
 *
 * `schema` and `options` are accepted and discarded: the call sites pass them,
 * and the schema is a value the route's own `types.ts` already exports, so
 * evaluating the argument costs nothing.
 */
export function withMock<TArgs extends unknown[]>(
  _output: unknown,
  handler: NextRouteHandler<TArgs>,
  // Kept so the stub's arity matches the real `withMock`: routes that pin
  // generation options pass a third argument, and a two-parameter stub would
  // make those call sites a type error under a production-shaped typecheck.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options?: unknown
): NextRouteHandler<TArgs> {
  return handler;
}

/**
 * Answers 404. Always.
 *
 * The mock endpoint at `src/app/api/mock/[...path]/route.ts` ships as a route
 * that can only ever 404 — it holds no generator and reaches no schema. It is
 * doubly unreachable in production: `mockRewrites()` emits nothing, so nothing
 * is ever rewritten there in the first place. This stub answers the case of
 * someone requesting `/api/mock/...` directly.
 */
export function serveRegistryRoute(
  // Named for documentation: the stub must read like the function it replaces,
  // and there is nothing here that could use them.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _segments: readonly string[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _registry?: unknown
): Promise<NextResponse> {
  return Promise.resolve(
    NextResponse.json({ error: "Not found" }, { status: 404 })
  );
}
