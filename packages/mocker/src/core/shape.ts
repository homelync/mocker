import type { MockControls } from './controls'
import { hashSeed } from './hash'
import { collectLeafKinds, findArrayPaths } from './paths'
import type { GenerateOptions, Generator, LeafKind } from './types'
import type { AnySchema } from './zod-def'

/**
 * Turning a request into generation options.
 *
 * The generator is a pure function of a schema and a seed; this is what decides
 * *which* seed and *which* options a given request deserves. Three jobs:
 *
 *   1. **Seed** — a hash of the request signature, so output is a function of
 *      what was asked for rather than of when it was asked. That is what
 *      survives Playwright's parallel projects and what makes a CI failure
 *      reproduce locally.
 *   2. **Pagination** — `page`/`limit` size the collection, and `count` /
 *      `totalPages` are made to agree with it. Without this a 20-row page can
 *      report a total of 3, and every paging control in the UI misbehaves.
 *   3. **Echo** — an input that names a field of the response is reflected into
 *      it, so `/property/ABC123` returns the property you asked for.
 */

/** Page size assumed when a request names none. */
const DEFAULT_PAGE_SIZE = 20

/** Smallest and largest total row count a path's pool may hold. */
const MIN_POOL_ROWS = 40
const MAX_POOL_ROWS = 500

/**
 * Query parameters left out of the *pool* signature.
 *
 * The total number of rows behind an endpoint is a property of the data, not of
 * how it is being paged through, so page 1 and page 2 of the same filter must
 * agree on it. Every other parameter — filters, sorts, search terms — does
 * legitimately change the total, and stays in.
 */
const POOL_SIGNATURE_OMITS = ['page', 'limit'] as const

/**
 * A root-level field of the response object, e.g. `results` but not
 * `results[].tags`. A collection here is a page of an envelope; one nested
 * deeper, or at the root itself, is a whole list (a lookup, a search result)
 * that its endpoint returns unpaged.
 */
const ROOT_FIELD = /^[A-Za-z_$][A-Za-z0-9_$]*$/

/** Everything about a request that can influence what is generated. */
export interface MockRequestInput {
  readonly method: string
  readonly pathname: string
  readonly query: URLSearchParams
  /** Dynamic route segments, e.g. `{ reference: "ABC123" }`. */
  readonly params: Readonly<Record<string, string>>
  readonly controls: MockControls
}

/**
 * The request as a stable string: `GET /api/x?a=1&b=2`, query sorted.
 *
 * Sorted because `?page=1&limit=20` and `?limit=20&page=1` are the same request
 * and must produce the same data — otherwise a UI that happens to build its
 * query in a different order than a test does gets different rows.
 */
export function requestSignature(
  method: string,
  pathname: string,
  query: URLSearchParams,
  omit: readonly string[] = [],
): string {
  const search = [...query.entries()]
    .filter(([key]) => !omit.includes(key))
    // Code-unit comparison, not localeCompare: locale-sensitive ordering would
    // make the seed depend on the machine's locale.
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  return search === ''
    ? `${method} ${pathname}`
    : `${method} ${pathname}?${search}`
}

/** Rows behind this path in total, stable across its pages. */
function poolSize(input: MockRequestInput): number {
  const hash = hashSeed(
    requestSignature(
      input.method,
      input.pathname,
      input.query,
      POOL_SIGNATURE_OMITS,
    ),
  )
  return MIN_POOL_ROWS + (hash % (MAX_POOL_ROWS - MIN_POOL_ROWS + 1))
}

function positiveInt(raw: string | null): number | undefined {
  if (raw === null) return undefined
  const value = Number(raw)
  return Number.isInteger(value) && value > 0 ? value : undefined
}

interface CollectionShape {
  readonly counts: Record<string, number>
  readonly overrides: Record<string, Generator>
}

const EMPTY_SHAPE: CollectionShape = { counts: {}, overrides: {} }

/**
 * Pin the envelope's tally fields to the page actually generated.
 *
 * Only fields the schema declares as numbers are pinned — `readingsResponse`
 * carries `results` alone, `timelineDetailResponse` carries `page` and
 * `totalPages` but no `count`. Writing to a field that is not there would throw
 * {@link UnknownOverridePathError}, which is right for a caller's typo and
 * wrong for a schema that simply does not report totals.
 */
function envelope(
  primary: string,
  leafKinds: ReadonlyMap<string, LeafKind>,
  tallies: {
    rows: number
    total: number
    page: number
    totalPages: number
    limit: number
  },
): CollectionShape {
  const overrides: Record<string, Generator> = {}

  const pin = (field: string, value: number): void => {
    if (leafKinds.get(field) === 'number')
      overrides[field] = (): number => value
  }

  pin('count', tallies.total)
  pin('totalPages', tallies.totalPages)
  pin('page', tallies.page)
  pin('limit', tallies.limit)

  return { counts: { [primary]: tallies.rows }, overrides }
}

function shapeCollection(
  schema: AnySchema,
  input: MockRequestInput,
  base: GenerateOptions,
  leafKinds: ReadonlyMap<string, LeafKind>,
): CollectionShape {
  const primary = findArrayPaths(schema)[0]
  if (primary === undefined) return EMPTY_SHAPE

  const requestedLimit = positiveInt(input.query.get('limit'))
  const page = positiveInt(input.query.get('page')) ?? 1

  // `x-mock-count` is a direct instruction about the collection, so it wins and
  // collapses the response to a single page — a row count that contradicted the
  // reported total would be a worse lie than the one being asked for.
  if (input.controls.count !== undefined) {
    const rows = input.controls.count
    return ROOT_FIELD.test(primary)
      ? envelope(primary, leafKinds, {
          rows,
          total: rows,
          page: 1,
          totalPages: 1,
          limit: rows,
        })
      : { counts: { [primary]: rows }, overrides: {} }
  }

  // A collection that is not a root-level field is not a page: lookups and
  // search results come back whole. Size it only if the request asked.
  if (!ROOT_FIELD.test(primary)) {
    const rows = requestedLimit ?? base.count
    return rows === undefined
      ? EMPTY_SHAPE
      : { counts: { [primary]: rows }, overrides: {} }
  }

  const limit = requestedLimit ?? base.count ?? DEFAULT_PAGE_SIZE
  const total = poolSize(input)
  const totalPages = Math.max(1, Math.ceil(total / limit))
  // A page past the end is empty rather than clamped, because that is what the
  // real service does and it is the case a paging bug lands on.
  const rows = Math.min(limit, Math.max(0, total - (page - 1) * limit))

  return envelope(primary, leafKinds, { rows, total, page, totalPages, limit })
}

function coerce(value: string, kind: LeafKind): unknown {
  if (kind === 'string') return value
  if (kind === 'boolean') {
    if (value === 'true') return true
    if (value === 'false') return false
    return undefined
  }
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

/**
 * Reflect request inputs into response fields of the same name.
 *
 * `/api/property/ABC123` returning a property referenced `4F2A9C01` is not
 * wrong by the schema, but it breaks the one invariant a reader checks without
 * thinking — that the page is about the thing they asked for. Restricted to
 * root-level fields, since an input describes the response as a whole and not
 * an arbitrary row inside it.
 */
function echoInputs(
  input: MockRequestInput,
  leafKinds: ReadonlyMap<string, LeafKind>,
): Record<string, Generator> {
  const overrides: Record<string, Generator> = {}

  for (const [name, value] of [
    ...Object.entries(input.params),
    ...input.query.entries(),
  ]) {
    const kind = leafKinds.get(name)
    if (kind === undefined) continue

    const coerced = coerce(value, kind)
    if (coerced === undefined) continue

    overrides[name] = (): unknown => coerced
  }

  return overrides
}

/**
 * Generation options for one request.
 *
 * Precedence runs echo → pagination → the endpoint's own options, so an
 * endpoint that pins a field always wins: it is the only layer stating intent
 * rather than inferring it.
 */
export function shapeRequest(
  schema: AnySchema,
  input: MockRequestInput,
  base: GenerateOptions = {},
): GenerateOptions {
  const leafKinds = collectLeafKinds(schema)
  const collection = shapeCollection(schema, input, base, leafKinds)

  return {
    ...base,
    seed:
      input.controls.seed ??
      requestSignature(input.method, input.pathname, input.query),
    counts: { ...collection.counts, ...base.counts },
    overrides: {
      ...echoInputs(input, leafKinds),
      ...collection.overrides,
      ...base.overrides,
    },
  }
}
