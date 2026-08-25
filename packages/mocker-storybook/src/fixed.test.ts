import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { z } from 'zod'
import type { CheckedMockRegistry, MockRegistryDraft } from '@homelync/mocker'
import { mockerHandlers } from './handlers'

/**
 * Fixed responses, with the disk replaced by a Map.
 *
 * The store is stubbed rather than served from a temp directory because the seam
 * between the two halves is deliberately two functions wide — `vite.test.ts`
 * proves the real filesystem end, and there is nothing in between for an
 * integration test to catch. What is worth asserting here is the *policy*: when
 * a file is written, when it is replayed, and what happens once someone has
 * edited it into something the schema no longer accepts.
 */

const store = vi.hoisted(() => new Map<string, string>())
const unavailable = vi.hoisted(() => ({ value: false }))

vi.mock('./fixtures', () => ({
  readFixture: (name: string) => {
    if (unavailable.value) return Promise.resolve({ kind: 'unavailable' })
    const body = store.get(name)

    return Promise.resolve(
      body === undefined ? { kind: 'miss' } : { kind: 'hit', body },
    )
  },
  writeFixture: (name: string, body: string) => {
    store.set(name, body)
    return Promise.resolve()
  },
}))

const deviceListSchema = z.object({
  results: z.array(z.object({ id: z.string(), statusId: z.string() })),
  count: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
})

const noteSchema = z.object({ id: z.string(), body: z.string() })

const registry = {
  'GET /api/devices': { schema: () => Promise.resolve(deviceListSchema) },
  'POST /api/notes': {
    schema: () => Promise.resolve(noteSchema),
    status: 201,
  },
} as const satisfies MockRegistryDraft

const mockRegistry = registry satisfies CheckedMockRegistry<typeof registry>

/** Answers anything the registry did not, so a fall-through is observable. */
const fallback = http.all('*', () => HttpResponse.json({ fallback: true }))

const server = setupServer(
  ...mockerHandlers(mockRegistry, { fixed: true }),
  fallback,
)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => {
  store.clear()
  unavailable.value = false
})
afterAll(() => {
  server.close()
})

const get = (path: string, headers: HeadersInit = {}): Promise<Response> =>
  fetch(`http://localhost${path}`, { headers })

/** The one entry the store holds, as `[name, contents]`. */
const only = (): [string, string] => {
  expect(store.size).toBe(1)
  // Non-null: asserted non-empty a line above.
  return [...store.entries()][0]!
}

describe('the first request for an endpoint', () => {
  it('writes a fixture from the generated data', async () => {
    const response = await get('/api/devices')
    const body = (await response.json()) as unknown

    const [name, contents] = only()
    expect(name).toMatch(/^GET\/api\/devices\/[0-9a-f]{8}\.json$/)
    expect(JSON.parse(contents)).toEqual(body)
  })

  it('writes it indented, because these files are edited by hand', () => {
    return get('/api/devices').then(() => {
      const [, contents] = only()

      expect(contents).toContain('\n  "results"')
      expect(contents.endsWith('\n')).toBe(true)
    })
  })

  it('still answers normally', async () => {
    const response = await get('/api/devices')

    expect(response.status).toBe(200)
    expect(response.headers.get('x-mock')).toBe('1')
  })
})

describe('once a fixture exists', () => {
  it('answers from it rather than generating', async () => {
    await get('/api/devices')
    const [name] = only()

    store.set(
      name,
      JSON.stringify({
        results: [{ id: 'EDITED', statusId: 'ok' }],
        count: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      }),
    )

    const body = (await (await get('/api/devices')).json()) as {
      results: { id: string }[]
    }
    expect(body.results[0]?.id).toBe('EDITED')
  })

  it('says which file the response came from', async () => {
    await get('/api/devices')
    const response = await get('/api/devices')

    expect(response.headers.get('x-mock-fixture')).toBe(only()[0])
  })

  it('does not rewrite it', async () => {
    await get('/api/devices')
    const [name, first] = only()

    await get('/api/devices')

    expect(store.get(name)).toBe(first)
  })

  it('honours the status the key declares', async () => {
    const response = await fetch('http://localhost/api/notes', {
      method: 'POST',
    })
    expect(response.status).toBe(201)

    const replayed = await fetch('http://localhost/api/notes', {
      method: 'POST',
    })
    expect(replayed.status).toBe(201)
  })

  it('still delays when a story asks it to', async () => {
    await get('/api/devices')

    const started = Date.now()
    await get('/api/devices', { 'x-mock-delay': '60' })

    expect(Date.now() - started).toBeGreaterThanOrEqual(50)
  })
})

describe('a fixture that no longer matches its schema', () => {
  it('fails with a 500 naming the file', async () => {
    await get('/api/devices')
    const [name] = only()
    // The shape of an edit that has gone stale: a field renamed in the schema,
    // or a typo made while fixing a specific value.
    store.set(name, JSON.stringify({ results: 'not an array' }))

    const response = await get('/api/devices')
    const body = (await response.json()) as {
      error: string
      issues: unknown[]
    }

    expect(response.status).toBe(500)
    expect(body.error).toContain(name)
    expect(body.issues.length).toBeGreaterThan(0)
  })

  it('does not quietly regenerate over the edit', async () => {
    await get('/api/devices')
    const [name] = only()
    const edited = JSON.stringify({ results: 'not an array' })
    store.set(name, edited)

    await get('/api/devices')

    expect(store.get(name)).toBe(edited)
  })

  it('fails the same way when the file is not JSON at all', async () => {
    await get('/api/devices')
    store.set(only()[0], '{ half an edit')

    expect((await get('/api/devices')).status).toBe(500)
  })
})

describe('requests that must not be stored', () => {
  it('leaves an endpoint the registry does not declare to the next handler', async () => {
    const body = (await (await get('/api/unknown')).json()) as {
      fallback?: boolean
    }

    expect(body.fallback).toBe(true)
    expect(store.size).toBe(0)
  })

  it('does not write a requested failure to disk', async () => {
    // Otherwise the story that wanted one 500 makes 500 the endpoint's permanent
    // answer, including for every story that did not.
    const response = await get('/api/devices', { 'x-mock-status': '500' })

    expect(response.status).toBe(500)
    expect(store.size).toBe(0)
  })

  it('gives a story that changes the data its own file', async () => {
    await get('/api/devices')
    await get('/api/devices', { 'x-mock-count': '1' })

    expect(store.size).toBe(2)
  })

  it('still reports a malformed control header as a 400', async () => {
    const response = await get('/api/devices', { 'x-mock-count': 'twenty' })

    expect(response.status).toBe(400)
    expect(store.size).toBe(0)
  })
})

describe('when the store is not there', () => {
  it('generates as usual rather than failing the story', async () => {
    unavailable.value = true

    const response = await get('/api/devices')

    expect(response.status).toBe(200)
    expect(store.size).toBe(0)
  })
})
