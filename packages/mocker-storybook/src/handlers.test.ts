import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { CheckedMockRegistry, MockRegistryDraft } from '@homelync/mocker'
import { mockerHandler, mockerHandlers } from './handlers'

/**
 * The handlers, exercised through MSW itself rather than by calling a resolver.
 *
 * `setupServer` is the same interception machinery `setupWorker` runs in a
 * Storybook preview, minus the browser — so what these assert is what a story
 * gets: the matching, the fall-through, and the request the registry is
 * eventually handed.
 */

const propertySchema = z.object({
  reference: z.string(),
  postcode: z.string(),
})

const deviceListSchema = z.object({
  propertyReference: z.string(),
  results: z.array(z.object({ id: z.string(), statusId: z.string() })),
  count: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
})

const noteSchema = z.object({ id: z.string(), body: z.string() })

const registry = {
  'GET /api/property/[reference]': {
    schema: () => Promise.resolve(propertySchema),
  },
  'GET /api/devices?propertyReference=[reference]': {
    schema: () => Promise.resolve(deviceListSchema),
  },
  'POST /api/property/[reference]/notes': {
    schema: () => Promise.resolve(noteSchema),
    status: 201,
  },
} as const satisfies MockRegistryDraft

const mockRegistry = registry satisfies CheckedMockRegistry<typeof registry>

/** Answers anything the registry did not, so a fall-through is observable. */
const fallback = http.all('*', () => HttpResponse.json({ fallback: true }))

const server = setupServer(...mockerHandlers(mockRegistry), fallback)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => {
  server.resetHandlers()
})
afterAll(() => {
  server.close()
})

const get = (path: string): Promise<Response> =>
  fetch(`http://localhost${path}`)

describe('mockerHandlers', () => {
  it('serves a registered endpoint from its schema', async () => {
    const response = await get('/api/property/ABC123')

    expect(response.status).toBe(200)
    expect(response.headers.get('x-mock')).toBe('1')
    expect(propertySchema.parse(await response.json())).toBeDefined()
  })

  it('echoes the dynamic segment into the response', async () => {
    const response = await get('/api/property/ABC123')

    expect((await response.json()).reference).toBe('ABC123')
  })

  it('answers the same request with the same data', async () => {
    const first = await (await get('/api/property/ABC123')).text()
    const second = await (await get('/api/property/ABC123')).text()

    expect(first).toBe(second)
  })

  it('collapses two keys on one path into one handler', () => {
    const shared = {
      'GET /api/reports?mode=summary': {
        schema: () => Promise.resolve(propertySchema),
      },
      'GET /api/reports?mode=full': {
        schema: () => Promise.resolve(propertySchema),
      },
    } as const satisfies MockRegistryDraft

    expect(mockerHandlers(shared)).toHaveLength(1)
  })

  it('honours the status a key declares', async () => {
    const response = await fetch('http://localhost/api/property/A1/notes', {
      method: 'POST',
    })

    expect(response.status).toBe(201)
  })

  it('builds a handler for every method a key may name', () => {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

    for (const method of methods) {
      const single = {
        [`${method} /api/thing`]: { schema: () => Promise.resolve(noteSchema) },
      } as const satisfies MockRegistryDraft

      expect(mockerHandlers(single)).toHaveLength(1)
    }
  })
})

describe('a request the registry does not declare', () => {
  it('falls through to the next handler', async () => {
    const response = await get('/api/unknown')

    expect(await response.json()).toEqual({ fallback: true })
  })

  it('falls through when the path matches but the query does not', async () => {
    // The path is declared; `?propertyReference` is not carried. A 404 here
    // would shadow whatever else the preview registered for this path.
    const response = await get('/api/devices')

    expect(await response.json()).toEqual({ fallback: true })
  })
})

describe('story controls', () => {
  it('sizes the collection', async () => {
    server.use(...mockerHandlers(mockRegistry, { count: 3 }))
    const response = await get('/api/devices?propertyReference=P1')
    const body = await response.json()

    expect(body.results).toHaveLength(3)
    expect(body.count).toBe(3)
  })

  it('shows an empty collection', async () => {
    server.use(...mockerHandlers(mockRegistry, { count: 0 }))
    const body = await (await get('/api/devices?propertyReference=P1')).json()

    expect(body.results).toEqual([])
  })

  it('changes the data with the seed and nothing else', async () => {
    const unseeded = await (await get('/api/property/ABC123')).text()

    server.use(...mockerHandlers(mockRegistry, { seed: 'second-story' }))
    const seeded = await (await get('/api/property/ABC123')).text()

    expect(seeded).not.toBe(unseeded)
    // The echo survives: a seed changes what was generated, not what was asked
    // for.
    expect(JSON.parse(seeded).reference).toBe('ABC123')
  })

  it('forces an error status', async () => {
    server.use(...mockerHandlers(mockRegistry, { status: 500 }))
    const response = await get('/api/property/ABC123')

    expect(response.status).toBe(500)
  })

  it('delays the response', async () => {
    server.use(...mockerHandlers(mockRegistry, { delayMs: 40 }))
    const started = Date.now()
    await get('/api/property/ABC123')

    expect(Date.now() - started).toBeGreaterThanOrEqual(35)
  })

  it('wins over a control the component set for itself', async () => {
    server.use(...mockerHandlers(mockRegistry, { count: 2 }))
    const response = await fetch(
      'http://localhost/api/devices?propertyReference=P1',
      { headers: { 'x-mock-count': '7' } },
    )

    expect((await response.json()).results).toHaveLength(2)
  })
})

describe('a mock mounted somewhere other than the preview origin', () => {
  it('serves an absolute base URL', async () => {
    server.use(
      ...mockerHandlers(mockRegistry, { baseUrl: 'https://api.acme.com/v1' }),
    )
    const response = await fetch('https://api.acme.com/v1/api/property/ABC123')

    expect(response.headers.get('x-mock')).toBe('1')
  })

  it('generates the data the unprefixed path would', async () => {
    const direct = await (await get('/api/property/ABC123')).text()

    server.use(
      ...mockerHandlers(mockRegistry, { baseUrl: 'https://api.acme.com/v1' }),
    )
    const prefixed = await (
      await fetch('https://api.acme.com/v1/api/property/ABC123')
    ).text()

    // The seed is a hash of the path, so a prefix that reached generation would
    // silently make a story's data depend on where the component points.
    expect(prefixed).toBe(direct)
  })
})

describe('mockerHandler', () => {
  it('overrides one endpoint and leaves the rest alone', async () => {
    server.use(
      mockerHandler(
        mockRegistry,
        'GET /api/devices?propertyReference=[reference]',
        {
          count: 1,
        },
      ),
    )

    const devices = await (
      await get('/api/devices?propertyReference=P1')
    ).json()
    expect(devices.results).toHaveLength(1)

    // Still served by the preview's handlers, not by the fallback.
    const property = await get('/api/property/ABC123')
    expect(property.headers.get('x-mock')).toBe('1')
  })

  it('applies generation options checked against the entry schema', async () => {
    server.use(
      mockerHandler(
        mockRegistry,
        'GET /api/devices?propertyReference=[reference]',
        {
          count: 2,
          generate: { overrides: { 'results[].statusId': () => 'OFFLINE' } },
        },
      ),
    )

    const body = await (await get('/api/devices?propertyReference=P1')).json()

    expect(
      body.results.map((row: { statusId: string }) => row.statusId),
    ).toEqual(['OFFLINE', 'OFFLINE'])
  })

  it('leaves a request its key does not match to the handlers underneath', async () => {
    server.use(
      mockerHandler(
        mockRegistry,
        'GET /api/devices?propertyReference=[reference]',
        { count: 1 },
      ),
    )

    // No `propertyReference`, so the override's own key does not match either —
    // and nothing else declares this path, so it reaches the fallback.
    expect(await (await get('/api/devices')).json()).toEqual({
      fallback: true,
    })
  })

  it('refuses a key the registry does not carry', () => {
    expect(() =>
      // @ts-expect-error — the key is checked against the table's own keys.
      mockerHandler(mockRegistry, 'GET /api/nothing'),
    ).toThrow('No mock registered for "GET /api/nothing"')
  })
})
