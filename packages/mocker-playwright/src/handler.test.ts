import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import type {
  CheckedMockRegistry,
  MockRegistry,
  MockRegistryDraft,
} from '@homelync/mocker'
import { handleRoute } from './handler'
import type { HandlerState, InterceptedRoute } from './handler'
import type { MockerMiss } from './miss'
import type { ResolvedOptions } from './options'
import type { MockerOverride } from './overrides'
import { resolveScope } from './scope'
import { fixtureStore } from './store'

/**
 * The pipeline, driven through a stub route.
 *
 * Playwright is type-only here (`package-boundary.test.ts` says so), and the
 * surface the handler touches is five methods — so a stub covers scope, resource
 * types, override precedence, the fixture store and the miss ledger, in plain
 * Vitest with no browser. What a stub cannot tell you is whether real
 * request/response plumbing behaves as assumed; that is what `apps/e2e` is for,
 * and it is a much smaller question than this file answers.
 */

const propertySchema = z.object({
  reference: z.string(),
  postcode: z.string(),
})

const deviceListSchema = z.object({
  results: z.array(z.object({ id: z.string(), statusId: z.string() })),
  count: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
})

const registry = {
  'GET /api/property/[reference]': {
    schema: () => Promise.resolve(propertySchema),
  },
  'GET /api/devices': {
    schema: () => Promise.resolve(deviceListSchema),
  },
} as const satisfies MockRegistryDraft

const mockRegistry = registry satisfies CheckedMockRegistry<typeof registry>

/** A registry whose schema thunk throws, to reach the handler's own catch. */
const brokenRegistry = {
  'GET /api/devices': {
    schema: (): Promise<never> => {
      throw new Error('the schema module is broken')
    },
  },
} as const satisfies MockRegistryDraft

interface Fulfilled {
  status: number
  headers: Record<string, string>
  body: string
}

interface Stub {
  readonly route: InterceptedRoute
  readonly fulfilled: () => Fulfilled
  readonly fellBack: () => boolean
}

/** What `context.route` hands a handler, minus everything unused. */
function stubRoute(input: {
  url: string
  method?: string
  headers?: Record<string, string>
  resourceType?: string
  /** `null` for a request Playwright cannot name a frame for — a worker's. */
  frame?: string | null
}): Stub {
  let fulfilled: Fulfilled | null = null
  let fellBack = false

  const route: InterceptedRoute = {
    request: () => ({
      url: () => input.url,
      method: () => input.method ?? 'GET',
      headers: () => input.headers ?? {},
      resourceType: () => input.resourceType ?? 'fetch',
      frame: () => {
        if (input.frame === null) {
          throw new Error('Service Worker requests have no frame')
        }
        return { url: () => input.frame ?? 'http://localhost:3000/' }
      },
    }),
    fulfill: (options) => {
      fulfilled = options
      return Promise.resolve()
    },
    fallback: () => {
      fellBack = true
      return Promise.resolve()
    },
  }

  return {
    route,
    fulfilled: () => {
      if (fulfilled === null) throw new Error('the route was never fulfilled')
      return fulfilled
    },
    fellBack: () => fellBack,
  }
}

let store: ReturnType<typeof fixtureStore>
let misses: MockerMiss[]
let overrides: MockerOverride[]

beforeEach(async () => {
  store = fixtureStore(await mkdtemp(path.join(tmpdir(), 'mocker-')))
  misses = []
  overrides = []
})

function stateWith(
  options: Partial<ResolvedOptions> = {},
  table: MockRegistry = mockRegistry,
): HandlerState {
  const resolved: ResolvedOptions = {
    fixed: false,
    unmatched: 'error',
    write: 'missing',
    dir: store.root,
    ...options,
  }

  return {
    registry: table,
    options: resolved,
    scope: resolveScope(resolved),
    overrides,
    misses,
    store,
  }
}

/** Run one request through the pipeline and hand back what the route saw. */
async function run(
  request: Parameters<typeof stubRoute>[0],
  options: Partial<ResolvedOptions> = {},
  table: MockRegistry = mockRegistry,
): Promise<Stub> {
  const stub = stubRoute(request)
  await handleRoute(stub.route, stateWith(options, table))
  return stub
}

describe('what the route answers', () => {
  it('serves a declared endpoint from the registry', async () => {
    const stub = await run({ url: 'http://localhost:3000/api/devices' })

    expect(stub.fulfilled().status).toBe(200)
    expect(
      deviceListSchema.safeParse(JSON.parse(stub.fulfilled().body)).success,
    ).toBe(true)
  })

  it('marks the response so a trace shows it was fabricated', async () => {
    const stub = await run({ url: 'http://localhost:3000/api/devices' })

    // Kept whole rather than rebuilt, which is what makes `x-mock-fixture`
    // visible in the trace viewer without any further work.
    expect(stub.fulfilled().headers['x-mock']).toBe('1')
  })

  it('answers a dynamic segment with the value that was asked for', async () => {
    const stub = await run({
      url: 'http://localhost:3000/api/property/ABC123',
    })

    expect(JSON.parse(stub.fulfilled().body)).toMatchObject({
      reference: 'ABC123',
    })
  })
})

describe('what the route leaves alone', () => {
  it.each(['document', 'stylesheet', 'image', 'font', 'script', 'media'])(
    'passes a %s request straight on',
    async (resourceType) => {
      // Being strict about everything would break every test that loads a font.
      const stub = await run({
        url: 'http://localhost:3000/api/devices',
        resourceType,
      })

      expect(stub.fellBack()).toBe(true)
      expect(misses).toEqual([])
    },
  )

  it('ignores another origin when no scope was given', async () => {
    const stub = await run({
      url: 'https://analytics.example.com/collect',
      frame: 'http://localhost:3000/',
    })

    expect(stub.fellBack()).toBe(true)
  })

  it('ignores a request with no frame to compare against', async () => {
    // A service worker's request: Playwright throws rather than inventing a
    // frame, so there is nothing to judge the origin against and nothing claimed.
    const stub = await run({
      url: 'http://localhost:3000/api/devices',
      frame: null,
    })

    expect(stub.fellBack()).toBe(true)
  })
})

describe('a cross-origin API', () => {
  it('is in scope when baseUrl names it', async () => {
    const stub = await run(
      {
        url: 'https://api.acme.com/api/devices',
        frame: 'http://localhost:3000/',
      },
      { baseUrl: 'https://api.acme.com' },
    )

    expect(stub.fellBack()).toBe(false)
    expect(stub.fulfilled().status).toBe(200)
  })

  it('has its prefix stripped before the registry sees the path', async () => {
    // Load-bearing: `handle()` seeds from the path, so `/v1/api/devices` would
    // generate different data than the same endpoint served without a prefix.
    const prefixed = await run(
      {
        url: 'https://api.acme.com/v1/api/devices',
        frame: 'http://localhost:3000/',
      },
      { baseUrl: 'https://api.acme.com/v1' },
    )
    const plain = await run({ url: 'http://localhost:3000/api/devices' })

    expect(prefixed.fulfilled().body).toBe(plain.fulfilled().body)
  })
})

describe('a request the registry does not declare', () => {
  it('is answered 404 with the reason, and recorded', async () => {
    const stub = await run({ url: 'http://localhost:3000/api/orders' })

    expect(stub.fulfilled().status).toBe(404)
    expect(JSON.parse(stub.fulfilled().body).error).toContain('/api/orders')
    expect(misses).toEqual([
      {
        kind: 'unmatched',
        method: 'GET',
        url: 'http://localhost:3000/api/orders',
        reason: expect.stringContaining('/api/orders'),
      },
    ])
  })

  it('reaches the network when passthrough was asked for', async () => {
    const stub = await run(
      { url: 'http://localhost:3000/api/orders' },
      { unmatched: 'passthrough' },
    )

    expect(stub.fellBack()).toBe(true)
    expect(misses).toEqual([])
  })
})

describe('an adapter that throws', () => {
  it('answers 500 and records it, rather than hanging the request', async () => {
    // A throw inside a route handler rejects a floating promise: the request
    // hangs and the test dies of a timeout naming a locator, not a cause.
    const stub = await run(
      { url: 'http://localhost:3000/api/devices' },
      {},
      brokenRegistry,
    )

    expect(stub.fulfilled().status).toBe(500)
    expect(misses[0]?.kind).toBe('error')
    expect(misses[0]?.reason).toContain('the schema module is broken')
  })
})

describe('fixed responses', () => {
  const fixed = { fixed: true }

  it('writes the fixture it had to generate, and fails the test over it', async () => {
    const stub = await run({ url: 'http://localhost:3000/api/devices' }, fixed)

    expect(misses).toHaveLength(1)
    expect(misses[0]?.kind).toBe('fixture-written')

    const file = misses[0]?.file ?? ''
    expect(file.endsWith('.json')).toBe(true)
    expect(await readFile(file, 'utf8')).toBe(
      `${JSON.stringify(JSON.parse(stub.fulfilled().body), null, 2)}\n`,
    )
  })

  it('replays the file on the next request, silently', async () => {
    const first = await run({ url: 'http://localhost:3000/api/devices' }, fixed)
    misses.length = 0

    const second = await run(
      { url: 'http://localhost:3000/api/devices' },
      fixed,
    )

    expect(misses).toEqual([])
    expect(JSON.parse(second.fulfilled().body)).toEqual(
      JSON.parse(first.fulfilled().body),
    )
    expect(second.fulfilled().headers['x-mock-fixture']).toBeDefined()
  })

  it('serves an edit rather than the data it generated', async () => {
    // The whole point of the feature: the file says the thing the test is about.
    await run({ url: 'http://localhost:3000/api/devices' }, fixed)
    const file = misses[0]?.file ?? ''
    misses.length = 0

    const edited = JSON.parse(await readFile(file, 'utf8'))
    edited.results = [{ id: 'boiler-1', statusId: 'FAULT' }]
    await writeFile(file, `${JSON.stringify(edited, null, 2)}\n`, 'utf8')

    const stub = await run({ url: 'http://localhost:3000/api/devices' }, fixed)

    expect(JSON.parse(stub.fulfilled().body).results).toEqual([
      { id: 'boiler-1', statusId: 'FAULT' },
    ])
  })

  it('refuses a fixture that no longer matches its schema', async () => {
    await run({ url: 'http://localhost:3000/api/devices' }, fixed)
    const file = misses[0]?.file ?? ''
    misses.length = 0

    await writeFile(file, '{"results":"not an array"}\n', 'utf8')
    const stub = await run({ url: 'http://localhost:3000/api/devices' }, fixed)

    // Not a regeneration: that would destroy the edit that was the point. Not a
    // silent pass either: that moves the failure into the component.
    expect(stub.fulfilled().status).toBe(500)
    expect(JSON.parse(stub.fulfilled().body).error).toContain('.json')
  })

  it('gives two sets of controls two files', async () => {
    await run({ url: 'http://localhost:3000/api/devices' }, fixed)
    await run(
      { url: 'http://localhost:3000/api/devices' },
      {
        ...fixed,
        count: 0,
      },
    )

    // Otherwise a test about an empty table and a test about a full one pin to
    // one file, and whichever ran first decides what both of them see.
    expect(new Set(misses.map((miss) => miss.file)).size).toBe(2)
  })

  it('writes nothing when write is none, and still fails', async () => {
    const stub = await run(
      { url: 'http://localhost:3000/api/devices' },
      {
        ...fixed,
        write: 'none',
      },
    )

    expect(stub.fulfilled().status).toBe(200)
    expect(misses[0]?.kind).toBe('fixture-missing')
    await expect(readFile(misses[0]?.file ?? '', 'utf8')).rejects.toThrow()
  })

  it('stores nothing for a requested failure', async () => {
    // A 500 written to disk would become the endpoint's permanent answer,
    // including for the test that did not ask for one.
    const stub = await run(
      { url: 'http://localhost:3000/api/devices' },
      {
        ...fixed,
        status: 503,
      },
    )

    expect(stub.fulfilled().status).toBe(503)
    expect(misses).toEqual([])
  })
})

describe('overrides', () => {
  it('bend one endpoint and leave the rest of the table alone', async () => {
    overrides.push({ key: 'GET /api/devices', options: { count: 0 } })

    const devices = await run({ url: 'http://localhost:3000/api/devices' })
    const property = await run({
      url: 'http://localhost:3000/api/property/ABC123',
    })

    expect(JSON.parse(devices.fulfilled().body).results).toEqual([])
    expect(JSON.parse(property.fulfilled().body).reference).toBe('ABC123')
  })

  it('let the last one win', async () => {
    overrides.push({ key: 'GET /api/devices', options: { count: 5 } })
    overrides.push({ key: 'GET /api/devices', options: { count: 1 } })

    const stub = await run({ url: 'http://localhost:3000/api/devices' })

    expect(JSON.parse(stub.fulfilled().body).results).toHaveLength(1)
  })

  it('apply generation options to that entry only', async () => {
    overrides.push({
      key: 'GET /api/devices',
      options: {
        count: 1,
        generate: {
          overrides: { 'results[].statusId': (): string => 'FAULT' },
        },
      },
    })

    const stub = await run({ url: 'http://localhost:3000/api/devices' })

    expect(JSON.parse(stub.fulfilled().body).results[0].statusId).toBe('FAULT')
  })
})

describe('route-level controls', () => {
  it('change the data without touching the registry', async () => {
    const seeded = await run(
      { url: 'http://localhost:3000/api/devices' },
      {
        seed: 'busy',
      },
    )
    const plain = await run({ url: 'http://localhost:3000/api/devices' })

    expect(seeded.fulfilled().body).not.toBe(plain.fulfilled().body)
  })

  it('win over a header the app set for itself', async () => {
    // The test is the more specific statement of intent, and the alternative is
    // a `test.use()` that quietly does nothing.
    const stub = await run(
      {
        url: 'http://localhost:3000/api/devices',
        headers: { 'x-mock-count': '9' },
      },
      { count: 2 },
    )

    expect(JSON.parse(stub.fulfilled().body).results).toHaveLength(2)
  })
})
