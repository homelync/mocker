import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { z } from 'zod'
import {
  handle,
  isMockConfigured,
  isMockEnabledFor,
  logMock,
} from '@magicspon/mocker'
import type { MockEndpoint } from '@magicspon/mocker'

/**
 * The Next.js adapter: wrap a route handler so it answers from its own schema.
 *
 * ```ts
 * export const GET = withMock(
 *   devicesResponseSchema,
 *   withAuth(async (request, context) => { ... })
 * );
 * ```
 *
 * Opt-in per route, and inert unless `MOCK_API` is set — with the flag unset
 * `withMock` returns the handler it was given, so a production route is the
 * exact function it was before. The declaration sits next to the handler it
 * replaces, which is its whole advantage over a central table: it moves with the
 * file, so it cannot go stale when a route moves.
 *
 * Because it wraps the *outside* of the auth middleware, a mocked route needs no
 * session and reaches no backend — which is the point: the app runs against
 * nothing.
 *
 * In a production build this module is never read at all: `withMocker()` points
 * `turbopack.resolveAlias` at `@magicspon/mocker-next/production`, a stub that
 * returns the handler. The route sources are identical either way.
 *
 * The endpoint registry is the second way to declare a mock, for a route that
 * would rather carry no mock import — see `registry-route.ts`. It is
 * substitutable with this one (same `handle()`, same bytes out), and a route
 * declared in both is a test failure, because the registry's rewrite intercepts
 * before this wrapper is reached and its options would be silently ignored.
 */

/**
 * A Next route handler, with its arity preserved.
 *
 * The rest-parameter generic matters: Next's generated route types accept a
 * handler taking *fewer* arguments than it supplies, never more, so a wrapper
 * that always took `(request, context)` would fail the build's route type check
 * on every static route.
 */
export type NextRouteHandler<TArgs extends unknown[] = []> = (
  request: NextRequest,
  ...args: TArgs
) => Promise<NextResponse>

/** Per-endpoint mock configuration, minus the schema itself. */
export type MockEndpointOptions = Omit<MockEndpoint, 'output'>

/**
 * Dynamic segments off the route context, e.g. `{ reference: "ABC123" }`.
 *
 * Read structurally rather than by type, because the context's shape differs
 * per route (and is absent entirely for a static one). `params` is a promise in
 * the App Router, so it is awaited either way.
 */
async function routeParams(
  args: readonly unknown[],
): Promise<Record<string, string>> {
  const [context] = args
  if (typeof context !== 'object' || context === null) return {}

  const resolved: unknown = await Promise.resolve(
    Reflect.get(context, 'params'),
  )
  if (typeof resolved !== 'object' || resolved === null) return {}

  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === 'string') params[key] = value
  }
  return params
}

/**
 * Serve a route from its response schema when `MOCK_API` is on.
 *
 * @param output the schema the route responds with — the same one its handler
 *   satisfies, so the mock cannot drift from the real shape
 * @param handler the real handler, returned untouched when mocking is off and
 *   called as a fallback when the flag names other routes
 * @param options per-endpoint generation options and success status
 */
export function withMock<TArgs extends unknown[]>(
  output: z.ZodType,
  handler: NextRouteHandler<TArgs>,
  options: MockEndpointOptions = {},
): NextRouteHandler<TArgs> {
  if (!isMockConfigured()) return handler

  const endpoint: MockEndpoint = { output, ...options }

  return async (request, ...args) => {
    // Not logged: the request was not mocked, so the real handler's own logging
    // (and Next's request log) is the truthful account of what happened.
    if (!isMockEnabledFor(request.nextUrl.pathname)) {
      return handler(request, ...args)
    }

    const started = Date.now()
    const params = await routeParams(args)
    const response = await handle(request, endpoint, { params })

    logMock({
      method: request.method,
      target: `${request.nextUrl.pathname}${request.nextUrl.search}`,
      status: response.status,
      durationMs: Date.now() - started,
    })

    // Rebuilt rather than returned directly: Next narrows route return types to
    // NextResponse, and a plain Response fails the generated route check.
    return new NextResponse(response.body, {
      status: response.status,
      headers: response.headers,
    })
  }
}
