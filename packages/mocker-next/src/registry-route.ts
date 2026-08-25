import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  isMockConfigured,
  isRegistryMiss,
  logMock,
  serveFromRegistry,
} from '@homelync/mocker'
import type { MockRegistry } from '@homelync/mocker'
import { originalPathname } from './rewrites'

/**
 * The registry adapter: one endpoint that serves every registered route.
 *
 * Where `withMock` is reached by being wrapped around a handler, this is reached
 * by a `beforeFiles` rewrite declared in `next.config.ts` — so the route file it
 * stands in for is never loaded, and needs no mock import of its own.
 *
 * Thin by construction. Matching, the 404 cases and the schema thunk all live in
 * `mock/registry/serve.ts`, which speaks `Request`/`Response`; what is left here
 * is the two things only Next knows — how to recover the original URL from a
 * rewrite, and that a route must return a `NextResponse`.
 */

/** Statuses this adapter returns itself, rather than generating a body. */
const NOT_FOUND = 404

/**
 * Rebuild the request as the caller originally made it.
 *
 * This is the load-bearing line of the whole adapter. `handle()` seeds from
 * `hash(method + path + sorted query)`, and after a rewrite this route is
 * invoked at `/api/mock/...` — so passing the incoming request straight
 * through would hash a path the caller never asked for and return *different
 * data than `withMock` returns for the same request*, silently, on migration.
 *
 * The catch-all segments are trustworthy where `request.url` is not: the rewrite
 * put the original path there.
 *
 * Deliberately carries no body. `handle()` never reads one today, and cloning a
 * request body means dealing with `duplex` streaming for no benefit.
 * TODO(WP-412): thread the body through if per-endpoint input parsing is ever
 * built, or this path will diverge from the wrapper for POSTs.
 */
function reconstruct(
  request: NextRequest,
  segments: readonly string[],
): Request {
  const url = new URL(
    `${originalPathname(segments)}${request.nextUrl.search}`,
    request.nextUrl.origin,
  )

  return new Request(url, {
    method: request.method,
    headers: request.headers,
  })
}

function problem(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Serve a rewritten request from the registry.
 *
 * @param request the request as Next delivered it, at the rewritten path
 * @param segments the catch-all segments — the original path minus `/api`
 * @param registry the host's declarations; passed in by the route file, because
 *   the endpoint table is application data and this module is not
 */
export async function serveRegistryRoute(
  request: NextRequest,
  segments: readonly string[],
  registry: MockRegistry,
): Promise<NextResponse> {
  const started = Date.now()
  // The path the caller asked for, not the `/api/mock/...` one Next invoked this
  // route at — logging the rewritten path would name a URL nobody requested and
  // that no other tool (devtools, the access log) agrees with.
  const original = reconstruct(request, segments)
  const { pathname, search } = new URL(original.url)
  const target = `${pathname}${search}`

  const log = (status: number, note?: string): void => {
    logMock({
      method: request.method,
      target,
      status,
      durationMs: Date.now() - started,
      note,
    })
  }

  // Defence in depth. A production build emits no rewrite to this endpoint, so
  // reaching it at all means someone requested `/api/mock/...` by hand.
  if (!isMockConfigured()) {
    log(NOT_FOUND, 'mocking is not enabled')
    return problem('Mocking is not enabled', NOT_FOUND)
  }

  const result = await serveFromRegistry(original, registry)

  if (isRegistryMiss(result)) {
    log(result.status, result.error)
    return problem(result.error, result.status)
  }

  log(result.status)

  // Rebuilt rather than returned directly: Next narrows route return types to
  // NextResponse, and a plain Response fails the generated route check.
  return new NextResponse(result.body, {
    status: result.status,
    headers: result.headers,
  })
}
