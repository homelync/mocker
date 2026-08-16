import { Faker, en } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { requestSignature, shapeRequest } from './shape'
import type { MockRequestInput } from './shape'
import type { GenContext, GenerateOptions } from './types'

/**
 * `shapeRequest` is what turns a request into generation options. It is tested
 * here at the seam rather than only through `handle`, because the interesting
 * decisions — which seed, which tally fields exist, which input is echoed —
 * are all visible in the options object and invisible in a response body.
 */

const CONTEXT: GenContext = {
  path: '',
  key: '',
  faker: new Faker({ locale: [en] }),
}

/** A pinned override's value; every one of them ignores its context. */
function pinned(options: GenerateOptions, path: string): unknown {
  return options.overrides?.[path]?.(CONTEXT)
}

function request(
  pathname: string,
  query = '',
  extra: Partial<MockRequestInput> = {},
): MockRequestInput {
  return {
    method: 'GET',
    pathname,
    query: new URLSearchParams(query),
    params: {},
    controls: {},
    ...extra,
  }
}

const envelope = z.object({
  results: z.array(z.object({ id: z.string(), reference: z.string() })),
  count: z.number(),
  page: z.number(),
  totalPages: z.number(),
  limit: z.number(),
})

describe('requestSignature', () => {
  it('omits the question mark when there is no query', () => {
    expect(requestSignature('GET', '/api/devices', new URLSearchParams())).toBe(
      'GET /api/devices',
    )
  })

  it('sorts the query so parameter order cannot change the data', () => {
    const a = requestSignature(
      'GET',
      '/api/devices',
      new URLSearchParams('page=1&limit=20'),
    )
    const b = requestSignature(
      'GET',
      '/api/devices',
      new URLSearchParams('limit=20&page=1'),
    )

    expect(a).toBe(b)
    expect(a).toBe('GET /api/devices?limit=20&page=1')
  })

  it('sorts by code unit, not by locale', () => {
    // A locale-sensitive sort would make the seed depend on the machine.
    expect(requestSignature('GET', '/x', new URLSearchParams('a=1&B=2'))).toBe(
      'GET /x?B=2&a=1',
    )
  })

  it('distinguishes the method', () => {
    expect(requestSignature('POST', '/x', new URLSearchParams())).not.toBe(
      requestSignature('GET', '/x', new URLSearchParams()),
    )
  })

  it('drops the parameters it is told to omit', () => {
    expect(
      requestSignature(
        'GET',
        '/x',
        new URLSearchParams('page=2&limit=10&status=OK'),
        ['page', 'limit'],
      ),
    ).toBe('GET /x?status=OK')
  })
})

describe('seed', () => {
  it('derives the seed from the request signature', () => {
    expect(shapeRequest(envelope, request('/api/devices', 'page=1')).seed).toBe(
      'GET /api/devices?page=1',
    )
  })

  it('lets x-mock-seed replace it, so the same request yields new data', () => {
    const options = shapeRequest(
      envelope,
      request('/api/devices', 'page=1', { controls: { seed: 'alternate' } }),
    )

    expect(options.seed).toBe('alternate')
  })
})

describe('pagination', () => {
  it('sizes the collection and pins the tallies to the page it produced', () => {
    const options = shapeRequest(
      envelope,
      request('/api/devices', 'page=2&limit=10'),
    )

    const total = pinned(options, 'count') as number
    expect(total).toBeGreaterThanOrEqual(40)
    expect(total).toBeLessThanOrEqual(500)
    expect(options.counts?.['results']).toBe(10)
    expect(pinned(options, 'page')).toBe(2)
    expect(pinned(options, 'limit')).toBe(10)
    expect(pinned(options, 'totalPages')).toBe(Math.ceil(total / 10))
  })

  it('assumes a page size when the request names none', () => {
    expect(
      pinned(shapeRequest(envelope, request('/api/devices')), 'limit'),
    ).toBe(20)
  })

  it("lets the endpoint's own count stand in for a missing limit", () => {
    const options = shapeRequest(envelope, request('/api/devices'), {
      count: 5,
    })

    expect(options.counts?.['results']).toBe(5)
    expect(pinned(options, 'limit')).toBe(5)
  })

  it('reports the same total on every page of the same filter', () => {
    // The number of rows behind an endpoint is a property of the data, not of
    // how it is being paged through.
    const first = shapeRequest(
      envelope,
      request('/api/devices', 'page=1&limit=10&status=OK'),
    )
    const third = shapeRequest(
      envelope,
      request('/api/devices', 'page=3&limit=25&status=OK'),
    )

    expect(pinned(first, 'count')).toBe(pinned(third, 'count'))
  })

  it('lets a filter change the total', () => {
    const a = shapeRequest(envelope, request('/api/devices', 'status=OK'))
    const b = shapeRequest(envelope, request('/api/devices', 'status=FAULT'))

    expect(pinned(a, 'count')).not.toBe(pinned(b, 'count'))
  })

  it('returns an empty page past the end rather than clamping', () => {
    // What the real service does, and the case a paging bug lands on.
    const options = shapeRequest(
      envelope,
      request('/api/devices', 'page=999&limit=20'),
    )

    expect(options.counts?.['results']).toBe(0)
  })

  it('ignores a limit that is not a positive integer', () => {
    for (const limit of ['0', '-5', 'many', '2.5']) {
      const options = shapeRequest(
        envelope,
        request('/api/devices', `limit=${limit}`),
      )
      expect(pinned(options, 'limit')).toBe(20)
    }
  })

  it('pins only the tally fields the schema actually declares', () => {
    // Writing to a field that is not there would throw, which is right for a
    // typo and wrong for a schema that simply does not report totals.
    const sparse = z.object({ results: z.array(z.string()) })
    const options = shapeRequest(sparse, request('/api/readings'))

    expect(options.counts?.['results']).toBe(20)
    expect(Object.keys(options.overrides ?? {})).toEqual([])
  })

  it('does not pin a tally field the schema declares as a string', () => {
    const stringy = z.object({
      results: z.array(z.string()),
      count: z.string(),
    })

    expect(
      pinned(shapeRequest(stringy, request('/api/x')), 'count'),
    ).toBeUndefined()
  })
})

describe('collections that are not pages', () => {
  const lookup = z.object({
    data: z.object({ items: z.array(z.string()) }),
    count: z.number(),
  })

  it('leaves a nested collection unsized and untallied', () => {
    // A lookup or a search result comes back whole; sizing it to 20 and
    // reporting a total of 300 would invent a pagination that does not exist.
    const options = shapeRequest(lookup, request('/api/lookup'))

    expect(options.counts).toEqual({})
    expect(options.overrides).toEqual({})
  })

  it('sizes it when the request asks', () => {
    expect(
      shapeRequest(lookup, request('/api/lookup', 'limit=7')).counts?.[
        'data.items'
      ],
    ).toBe(7)
  })

  it('treats a root array the same way', () => {
    const list = z.array(z.object({ id: z.string() }))

    expect(shapeRequest(list, request('/api/all')).counts).toEqual({})
    expect(
      shapeRequest(list, request('/api/all', 'limit=3')).counts?.[''],
    ).toBe(3)
  })
})

describe('x-mock-count', () => {
  it('collapses the response to a single page of the requested size', () => {
    // A row count that contradicted the reported total would be a worse lie
    // than the one being asked for.
    const options = shapeRequest(
      envelope,
      request('/api/devices', 'page=4&limit=10', { controls: { count: 3 } }),
    )

    expect(options.counts?.['results']).toBe(3)
    expect(pinned(options, 'count')).toBe(3)
    expect(pinned(options, 'totalPages')).toBe(1)
    expect(pinned(options, 'page')).toBe(1)
    expect(pinned(options, 'limit')).toBe(3)
  })

  it('serves an empty collection for a count of zero', () => {
    const options = shapeRequest(
      envelope,
      request('/api/devices', '', { controls: { count: 0 } }),
    )

    expect(options.counts?.['results']).toBe(0)
    expect(pinned(options, 'count')).toBe(0)
  })
})

describe('echoing inputs', () => {
  const detail = z.object({
    reference: z.string(),
    active: z.boolean(),
    score: z.number(),
    results: z.array(z.object({ id: z.string() })),
  })

  it('reflects a path parameter into a root field of the same name', () => {
    const options = shapeRequest(
      detail,
      request('/api/property/ABC123', '', { params: { reference: 'ABC123' } }),
    )

    expect(pinned(options, 'reference')).toBe('ABC123')
  })

  it('coerces a query parameter to the declared kind', () => {
    const options = shapeRequest(
      detail,
      request('/api/property', 'score=42&active=false'),
    )

    expect(pinned(options, 'score')).toBe(42)
    expect(pinned(options, 'active')).toBe(false)
  })

  it('ignores a value that cannot be the declared kind', () => {
    // Echoing `score=high` as NaN would fail the output parse; leaving it
    // generated is the only option that still produces a valid response.
    const options = shapeRequest(
      detail,
      request('/api/property', 'score=high&active=maybe'),
    )

    expect(options.overrides?.['score']).toBeUndefined()
    expect(options.overrides?.['active']).toBeUndefined()
  })

  it('ignores an input that names no field', () => {
    expect(
      shapeRequest(detail, request('/api/property', 'sort=asc')).overrides?.[
        'sort'
      ],
    ).toBeUndefined()
  })

  it('does not reach inside the collection', () => {
    // An input describes the response as a whole, not an arbitrary row in it.
    const options = shapeRequest(
      detail,
      request('/api/property', '', { params: { id: 'ABC123' } }),
    )

    expect(options.overrides?.['results[].id']).toBeUndefined()
    expect(options.overrides?.['id']).toBeUndefined()
  })
})

describe('precedence', () => {
  it("lets the endpoint's own options outrank an echo and the tallies", () => {
    // The endpoint is the only layer stating intent rather than inferring it.
    const options = shapeRequest(
      envelope,
      request('/api/devices', 'count=5', { params: { reference: 'ABC' } }),
      {
        counts: { results: 2 },
        overrides: { count: () => 999 },
      },
    )

    expect(options.counts?.['results']).toBe(2)
    expect(pinned(options, 'count')).toBe(999)
  })

  it('carries the rest of the base options through untouched', () => {
    const options = shapeRequest(envelope, request('/api/devices'), {
      nullishRate: 0,
      nestedArrayLength: [1, 1],
    })

    expect(options.nullishRate).toBe(0)
    expect(options.nestedArrayLength).toEqual([1, 1])
  })
})
