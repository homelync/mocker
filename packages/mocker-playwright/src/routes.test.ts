import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { CheckedMockRegistry, MockRegistryDraft } from '@homelync/mocker'
import type { BrowserContext } from 'playwright-core'
import { mockerRoutes, resolveOptions } from './routes'

/**
 * Installation: what gets registered on the context, and what a test may say to
 * the controller.
 *
 * The context is a stub of one method, which is all `mockerRoutes` uses. What
 * happens *inside* the registered handler is `handler.test.ts`'s subject.
 */

const deviceListSchema = z.object({
  results: z.array(z.object({ id: z.string() })),
  count: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
})

const registry = {
  'GET /api/devices': { schema: () => Promise.resolve(deviceListSchema) },
} as const satisfies MockRegistryDraft

const mockRegistry = registry satisfies CheckedMockRegistry<typeof registry>

interface Registered {
  readonly matcher: string | RegExp | ((url: URL) => boolean)
  readonly handler: unknown
}

/** A context that records what was registered on it. */
function stubContext(): {
  context: BrowserContext
  routes: Registered[]
} {
  const routes: Registered[] = []
  const context = {
    route: (matcher: Registered['matcher'], handler: unknown) => {
      routes.push({ matcher, handler })
      return Promise.resolve()
    },
  } as unknown as BrowserContext

  return { context, routes }
}

describe('the defaults', () => {
  it('serve from files, refuse the undeclared, and write what is missing', () => {
    // All three are inverted from the Storybook adapter's, deliberately: a story
    // is looked at, a test asserts. See the README.
    expect(resolveOptions({})).toMatchObject({
      fixed: true,
      unmatched: 'error',
      write: 'missing',
    })
  })

  it('anchor a relative store to the working directory', () => {
    expect(resolveOptions({}).dir).toBe(path.resolve('mocks'))
    expect(resolveOptions({ dir: '/tmp/fixtures' }).dir).toBe('/tmp/fixtures')
  })

  it('leave what was said alone', () => {
    expect(resolveOptions({ fixed: false, write: 'none' })).toMatchObject({
      fixed: false,
      write: 'none',
    })
  })
})

describe('installing the route', () => {
  it('registers exactly one', async () => {
    // The decision the whole package rests on: one route, and precedence is a
    // list we own rather than an ordering Playwright happens to apply.
    const { context, routes } = stubContext()
    await mockerRoutes(context, mockRegistry)

    expect(routes).toHaveLength(1)
  })

  it('pre-filters by URL when the scope is knowable', async () => {
    const { context, routes } = stubContext()
    await mockerRoutes(context, mockRegistry, {
      baseUrl: 'https://api.acme.com',
    })

    const matcher = routes[0]?.matcher
    expect(typeof matcher).toBe('function')
    if (typeof matcher !== 'function') return

    expect(matcher(new URL('https://api.acme.com/api/devices'))).toBe(true)
    expect(matcher(new URL('https://fonts.example.com/x.woff2'))).toBe(false)
  })

  it('intercepts everything when it is not', async () => {
    // "The page's own origin" cannot be known before a page exists, so the
    // handler decides per request. The predicate is only ever an optimisation,
    // and must never be narrower than the rule it stands in for.
    const { context, routes } = stubContext()
    await mockerRoutes(context, mockRegistry)

    const matcher = routes[0]?.matcher
    expect(typeof matcher).toBe('function')
    if (typeof matcher !== 'function') return

    expect(matcher(new URL('https://fonts.example.com/x.woff2'))).toBe(true)
  })
})

describe('the controller', () => {
  it('starts with nothing to report', async () => {
    const { context } = stubContext()
    const mocker = await mockerRoutes(context, mockRegistry)

    expect(mocker.misses).toEqual([])
  })

  it('refuses a key the registry does not have', async () => {
    // Thrown at the `use()` call, so the error points at the test line that
    // wrote the typo rather than at a request that quietly served global data.
    const { context } = stubContext()
    const mocker = await mockerRoutes(context, mockRegistry)

    expect(() => {
      // @ts-expect-error the key is not in the registry, which is the point
      mocker.use('GET /api/orders')
    }).toThrow(/No mock registered/)
  })

  it('accepts a key that is', async () => {
    const { context } = stubContext()
    const mocker = await mockerRoutes(context, mockRegistry)

    expect(() => {
      mocker.use('GET /api/devices', { count: 0 })
    }).not.toThrow()
  })
})
