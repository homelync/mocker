import type { z } from 'zod'
import { InvalidControlError, readControls } from './controls'
import { generate } from './generate'
import { shapeRequest } from './shape'
import type { MockRequestInput } from './shape'
import type { GenerateOptions } from './types'

/**
 * The platform-agnostic seam: a web `Request` in, a web `Response` out.
 *
 * Everything runtime-specific — Next route handlers, Playwright's `route.fulfil`,
 * a node:http server, MSW — is a thin adapter over this function, because
 * `Request`/`Response` are the one interface all four already speak. Nothing
 * here touches node, next, or the host application.
 */

/** Marks a response as fabricated, so a devtools panel makes it obvious. */
export const MOCK_MARKER_HEADER = 'x-mock'

/** Echoes the seed the response was generated from, so it can be reproduced. */
export const MOCK_SEED_RESPONSE_HEADER = 'x-mock-seed'

/** Statuses that must carry no body, per fetch semantics. */
const BODILESS_STATUSES: readonly number[] = [204, 205, 304]

/** What the mock knows about one endpoint. */
export interface MockEndpoint<T extends z.ZodType = z.ZodType> {
  /** The schema the endpoint responds with. Generated from, then parsed back. */
  readonly output: T
  /** Success status, for the endpoints that do not answer 200 (`POST` → 201). */
  readonly status?: number
  /**
   * Generation options for every request to this endpoint — a pinned status
   * set, a default page size, a locale. Request-derived options (seed,
   * pagination, echo) are merged underneath, so anything stated here wins.
   *
   * Bound to `output`, so an override here is checked against the very schema
   * the response is generated from and parsed back against.
   */
  readonly options?: GenerateOptions<z.infer<T>>
}

/** Route-level facts the adapter knows and the request does not carry. */
export interface HandleContext {
  /** Dynamic path segments, e.g. `{ reference: "ABC123" }`. */
  readonly params?: Readonly<Record<string, string>>
}

function mockResponse(body: unknown, status: number, seed: string): Response {
  const headers = {
    [MOCK_MARKER_HEADER]: '1',
    [MOCK_SEED_RESPONSE_HEADER]: seed,
  }

  return BODILESS_STATUSES.includes(status)
    ? new Response(null, { status, headers })
    : Response.json(body, { status, headers })
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Serve one request from a schema.
 *
 * Stateless by construction: the response is a pure function of the request
 * signature and the endpoint definition, so two processes serving the same
 * request agree without sharing anything.
 *
 * @param request the incoming request, read for its URL, method and controls
 * @param endpoint the schema to generate from, plus any per-endpoint options
 * @param context route-level facts the adapter supplies, chiefly path params
 */
export async function handle<T extends z.ZodType>(
  request: Request,
  endpoint: MockEndpoint<T>,
  context: HandleContext = {},
): Promise<Response> {
  // try/catch rather than es-toolkit's `attempt`: `mock/core` promises to
  // import nothing but zod and faker, which is what keeps extracting it to its
  // own package a `git mv`.
  let controls
  try {
    controls = readControls(request.headers)
  } catch (error) {
    if (error instanceof InvalidControlError) {
      return mockResponse({ error: error.message }, 400, '')
    }
    throw error
  }

  if (controls.delayMs !== undefined && controls.delayMs > 0) {
    await sleep(controls.delayMs)
  }

  const status = controls.status ?? endpoint.status ?? 200

  // A requested failure needs no data, and generating some would only invite
  // the question of why a 500 carries a valid payload.
  if (status >= 400) {
    return mockResponse(
      { error: `Mocked ${String(status)} response` },
      status,
      '',
    )
  }

  const url = new URL(request.url)
  const input: MockRequestInput = {
    method: request.method,
    pathname: url.pathname,
    query: url.searchParams,
    params: context.params ?? {},
    controls,
  }

  // Both casts widen the endpoint's schema-bound options to the untyped form.
  // `shapeRequest` adds paths it derives from the *request* — `results`, `count`,
  // an echoed `reference` — which exist in the schema but cannot be named as
  // literals here, since `T` is only known to be some `z.ZodType`. The paths a
  // developer writes are checked where they are written, in the registry entry.
  const options = shapeRequest(
    endpoint.output,
    input,
    endpoint.options as GenerateOptions,
  )
  const seed = String(options.seed ?? '')

  let generated: unknown
  try {
    generated = generate(
      endpoint.output,
      options as GenerateOptions<z.infer<T>>,
    )
  } catch (error) {
    // An unsupported zod node or a typo'd override. A 500 naming the path beats
    // a crashed dev server, and the message is the same one the error carries.
    return mockResponse(
      { error: `Mock generation failed: ${messageOf(error)}` },
      500,
      seed,
    )
  }

  // The generated value is checked against the schema it came from before it
  // leaves. A mismatch means the generator and the schema disagree, which is a
  // bug in this library — and one that is otherwise found much later, as a
  // client-side parse failure with no obvious cause.
  const parsed = endpoint.output.safeParse(generated)
  if (!parsed.success) {
    return mockResponse(
      {
        error: 'Mock output failed its own schema',
        issues: parsed.error.issues,
      },
      500,
      seed,
    )
  }

  // The generated value, not `parsed.data`: a mock stands in for the wire, and
  // the wire carries a schema's *input*. Returning the parsed form would apply
  // any transform a second time when the client parses the response.
  return mockResponse(generated, status, seed)
}
