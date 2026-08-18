import { http } from 'msw'
import type { HttpHandler, HttpResponseResolver } from 'msw'
import type { z } from 'zod'
// One import source rather than two. `@magicspon/mocker/core` would give the
// generator alone, but the root re-exports it and this module needs
// `serveFromRegistry` from the root regardless — importing both would ship two
// copies of the matcher and the generator into the preview bundle.
import {
  isRegistryMiss,
  MOCK_COUNT_HEADER,
  MOCK_DELAY_HEADER,
  MOCK_SEED_HEADER,
  MOCK_STATUS_HEADER,
  parseKey,
  serveFromRegistry,
} from '@magicspon/mocker'
import type {
  GenerateOptions,
  MockRegistry,
  MockRegistryEntry,
} from '@magicspon/mocker'
import { toHandlerPath, toRegistryPath } from './pattern'

/**
 * The Storybook adapter: a registry in, MSW handlers out.
 *
 * Thin by construction, exactly as the Next adapter is. Matching, the 404
 * cases, the schema thunk and the generation itself all live in
 * `serveFromRegistry`, which speaks `Request`/`Response`; what is left here is
 * the three things only this runtime knows — that MSW writes dynamic segments
 * as `:reference`, that a story wants per-request controls without editing the
 * table, and that a component may be calling an origin the registry says
 * nothing about.
 *
 * Deliberately free of any Storybook import. These are plain MSW handlers, so
 * the same call works in a Vitest browser test or a bare `setupWorker`, and
 * this package cannot break when Storybook's addon API moves.
 */

/** How a story bends the mock, without touching the registry. */
export interface MockerHandlerOptions {
  /**
   * Where the mocked API is mounted, when it is not the preview's own origin —
   * `"https://api.acme.com"`, or a path prefix like `"/v1"`.
   *
   * Registry keys stay written as the API declares them; this is prepended to
   * the MSW pattern and stripped again before the key is matched, so the data a
   * story sees does not depend on where the component points.
   */
  readonly baseUrl?: string
  /**
   * Replace the request-derived seed, so the same request yields different
   * data. The one knob that makes two stories of the same endpoint show
   * different rows.
   */
  readonly seed?: string
  /** Size the primary collection — a one-row table, an empty state. */
  readonly count?: number
  /** Wait this long before responding, so a loading state can be looked at. */
  readonly delayMs?: number
  /** Respond with this status instead of the endpoint's own, for error states. */
  readonly status?: number
}

/** {@link MockerHandlerOptions}, plus what only a single endpoint can be told. */
export interface MockerEndpointOptions<
  Output = unknown,
> extends MockerHandlerOptions {
  /**
   * Generation options merged over the registry entry's own — an override
   * pinning a field, a nested array length, a locale.
   *
   * Checked against *this entry's* schema, so `"results[].statusId"` is a
   * completion rather than a guess, and a path the schema does not declare is a
   * compile error on the line that carries it.
   *
   * `seed` and `count` are ignored here: both are decided per request, from the
   * request signature and the controls above. Set them on the options object
   * itself.
   */
  readonly generate?: GenerateOptions<Output>
}

/** What an entry's schema thunk resolves to, or `unknown` if it cannot be read. */
type EntryOutput<Entry> = Entry extends {
  readonly schema: () => Promise<infer Schema extends z.ZodType>
}
  ? z.infer<Schema>
  : unknown

/**
 * The story's controls, as the headers `handle()` reads them from.
 *
 * Headers rather than a second options path because `shapeRequest` decides the
 * seed from the request signature and lets only `x-mock-seed` displace it — an
 * entry's `options.seed` is overwritten every time. Going through the controls
 * means a story and a devtools request produce identical bytes, and the
 * validation is the library's rather than a copy of it.
 *
 * A story's controls win over any the component set for itself: the story is
 * the more specific statement of intent, and the alternative is a story that
 * quietly does nothing.
 */
function applyControls(
  headers: Headers,
  options: MockerHandlerOptions,
): Headers {
  if (options.seed !== undefined) headers.set(MOCK_SEED_HEADER, options.seed)
  if (options.count !== undefined) {
    headers.set(MOCK_COUNT_HEADER, String(options.count))
  }
  if (options.delayMs !== undefined) {
    headers.set(MOCK_DELAY_HEADER, String(options.delayMs))
  }
  if (options.status !== undefined) {
    headers.set(MOCK_STATUS_HEADER, String(options.status))
  }
  return headers
}

/**
 * Rebuild the request as the registry declares it.
 *
 * Deliberately carries no body, for the same reason the Next registry route
 * does not: `handle()` never reads one, and cloning a request body means
 * dealing with `duplex` streaming for no benefit.
 */
function asDeclared(request: Request, options: MockerHandlerOptions): Request {
  const url = new URL(request.url)
  const pathname = toRegistryPath(url.pathname, options.baseUrl)

  return new Request(new URL(`${pathname}${url.search}`, url.origin), {
    method: request.method,
    headers: applyControls(new Headers(request.headers), options),
  })
}

/**
 * The resolver every handler shares.
 *
 * It is handed the *whole* registry rather than the one key its path came from,
 * which is what makes handler order irrelevant: MSW matches on path alone, so
 * `/api/property/:reference` will happily match `/api/property/search`, and
 * `findMatch` then picks the more specific key regardless of which handler was
 * reached first.
 *
 * A miss returns nothing rather than a 404. MSW reads that as "this handler did
 * not answer" and carries on down the list, so a request whose query failed one
 * key's constraints can still be served by another, and a consumer's own
 * handler for the same path is not shadowed by ours.
 */
function resolver(
  registry: MockRegistry,
  options: MockerHandlerOptions,
): HttpResponseResolver {
  return async ({ request }) => {
    const result = await serveFromRegistry(
      asDeclared(request, options),
      registry,
    )
    if (isRegistryMiss(result)) return undefined

    return result
  }
}

/**
 * The MSW factory for a verb.
 *
 * A switch rather than an index, so a method the registry starts accepting and
 * this package does not is a build error here instead of a `TypeError` inside a
 * story. `parseKey` has already rejected anything that is not one of these.
 */
function handlerFor(
  method: string,
  path: string,
  resolve: HttpResponseResolver,
): HttpHandler {
  switch (method) {
    case 'GET':
      return http.get(path, resolve)
    case 'POST':
      return http.post(path, resolve)
    case 'PUT':
      return http.put(path, resolve)
    case 'PATCH':
      return http.patch(path, resolve)
    case 'DELETE':
      return http.delete(path, resolve)
    case 'HEAD':
      return http.head(path, resolve)
    case 'OPTIONS':
      return http.options(path, resolve)
    default:
      throw new Error(
        `Mock registry key uses "${method}", which this Storybook adapter has no MSW handler for.`,
      )
  }
}

/**
 * MSW handlers for every endpoint a registry declares.
 *
 * ```ts
 * // .storybook/preview.ts
 * beforeEach({ msw }) {
 *   msw.use(...mockerHandlers(registry));
 * }
 * ```
 *
 * One handler per distinct method and path, not per key: two keys differing
 * only by their query conditions — `?mode=summary` and `?mode=full` — are the
 * same MSW route, and the resolver picks between them per request.
 *
 * @param registry the endpoint declarations, passed in rather than imported
 * @param options story-level controls; see {@link MockerHandlerOptions}
 */
export function mockerHandlers(
  registry: MockRegistry,
  options: MockerHandlerOptions = {},
): HttpHandler[] {
  const resolve = resolver(registry, options)
  const seen = new Set<string>()

  return Object.keys(registry).flatMap((key) => {
    const { method, pattern } = parseKey(key)
    const path = toHandlerPath(pattern, options.baseUrl)

    const route = `${method} ${path}`
    if (seen.has(route)) return []
    seen.add(route)

    return [handlerFor(method, path, resolve)]
  })
}

/**
 * One endpoint's handler, for a story that wants this endpoint to behave
 * differently.
 *
 * ```ts
 * export const Empty = meta.story({
 *   beforeEach({ msw }) {
 *     msw.use(mockerHandler(registry, "GET /api/devices", { count: 0 }));
 *   },
 * });
 * ```
 *
 * Handlers passed to `msw.use()` take precedence over the preview's, so this
 * shadows the same endpoint's global handler for the length of one story. It
 * shadows *only* that endpoint: everything else still answers from the registry,
 * which is what stops a story about an empty table from also having to describe
 * every other request the page makes.
 *
 * A request that matches the path but not this key's query conditions falls
 * through to the handlers underneath, so overriding one of two keys on a shared
 * path leaves the other one working.
 *
 * @param registry the same table the preview registered
 * @param key the entry to override, as written in the table
 * @param options controls, plus generation options checked against this entry's
 *   own schema
 */
export function mockerHandler<
  Registry extends MockRegistry,
  Key extends keyof Registry & string,
>(
  registry: Registry,
  key: Key,
  options: MockerEndpointOptions<EntryOutput<Registry[Key]>> = {},
): HttpHandler {
  const entry = registry[key]
  if (entry === undefined) {
    throw new Error(`No mock registered for "${key}".`)
  }

  const endpoint: MockRegistryEntry = {
    ...entry,
    // The same widening `handle()` performs, and for the same reason: the
    // options were checked against this entry's schema in the signature above,
    // where the caller wrote them, and a single-entry registry is typed for any
    // schema at all.
    options: {
      ...entry.options,
      ...(options.generate as GenerateOptions | undefined),
    },
  }

  // Non-null: a one-key registry yields exactly one handler.
  return mockerHandlers({ [key]: endpoint }, options)[0]!
}
