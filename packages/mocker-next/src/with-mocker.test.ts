import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import type { MockRegistry } from '@homelync/mocker/config'
import type { NextConfig } from 'next'
import { withMocker } from './with-mocker'

/**
 * What a consumer's `next.config.ts` becomes.
 *
 * Two failures are worth a test here and neither is visible to a type. The
 * first is a merge that clobbers: a consumer adopts the wrapper and their own
 * rewrites quietly stop being applied, which looks like a routing bug anywhere
 * but here. The second is the production alias going missing — that one fails
 * in the single direction this package exists to prevent, by shipping faker.
 */

const registry: MockRegistry = {
  'GET /api/property/[reference]': {
    schema: (): Promise<z.ZodType> =>
      Promise.resolve(z.object({ reference: z.string() })),
  },
}

/** The mock's own rule, for comparison against a merged list. */
const mockRule = {
  source: '/api/property/:reference',
  destination: '/api/mock/property/:reference',
}

const ownRule = { source: '/api/legacy', destination: '/api/v2' }

/**
 * The rewrites a wrapped config produces.
 *
 * `withMocker` always installs the function form, so anything else means the
 * merge never ran — worth failing loudly rather than typing around.
 */
async function groupsOf(config: NextConfig): Promise<{
  beforeFiles?: unknown[]
  afterFiles?: unknown[]
  fallback?: unknown[]
}> {
  const { rewrites } = config
  if (typeof rewrites !== 'function') {
    throw new TypeError('withMocker did not install a rewrites function')
  }

  const resolved = await rewrites()
  if (Array.isArray(resolved)) {
    throw new TypeError('withMocker returned an array rather than groups')
  }
  return resolved
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('the rewrites a wrapped config serves', () => {
  it('needs nothing but a registry', async () => {
    vi.stubEnv('MOCK_API', '1')

    expect(await groupsOf(withMocker({ registry }))).toEqual({
      beforeFiles: [mockRule],
      afterFiles: [],
      fallback: [],
    })
  })

  it("puts its own rules ahead of the consumer's", async () => {
    vi.stubEnv('MOCK_API', '1')

    const config = withMocker(
      { registry },
      { rewrites: () => ({ beforeFiles: [ownRule], fallback: [ownRule] }) },
    )

    // Ahead, not appended: Next takes the first rewrite that matches, so a rule
    // the consumer already had on the same source would otherwise swallow the
    // interception and the route would never be mocked.
    expect(await groupsOf(config)).toEqual({
      beforeFiles: [mockRule, ownRule],
      afterFiles: [],
      fallback: [ownRule],
    })
  })

  it('leaves a bare array where Next would have read it', async () => {
    vi.stubEnv('MOCK_API', '1')

    // Next's own `load-custom-routes` treats an array as `afterFiles`. Moving
    // it to `beforeFiles` would put a consumer's rules ahead of their
    // filesystem routes — a behaviour change from adopting the wrapper.
    const config = withMocker({ registry }, { rewrites: () => [ownRule] })

    expect(await groupsOf(config)).toEqual({
      beforeFiles: [mockRule],
      afterFiles: [ownRule],
      fallback: [],
    })
  })

  it('awaits an async rewrites function', async () => {
    vi.stubEnv('MOCK_API', '1')

    const config = withMocker(
      { registry },
      { rewrites: () => Promise.resolve([ownRule]) },
    )

    expect(await groupsOf(config)).toEqual({
      beforeFiles: [mockRule],
      afterFiles: [ownRule],
      fallback: [],
    })
  })

  it('is the identity merge with the flag unset', async () => {
    // The wrapper stays in `next.config.ts` permanently, so with `MOCK_API`
    // unset it must leave the config exactly as capable as it was.
    const config = withMocker(
      { registry },
      { rewrites: () => ({ beforeFiles: [ownRule] }) },
    )

    expect(await groupsOf(config)).toEqual({
      beforeFiles: [ownRule],
      afterFiles: [],
      fallback: [],
    })
  })
})

describe('the rest of the config', () => {
  it('passes through untouched', () => {
    const config = withMocker(
      { registry },
      { basePath: '/app', poweredByHeader: false },
    )

    expect(config).toMatchObject({ basePath: '/app', poweredByHeader: false })
  })

  it('carries no turbopack alias outside a production build', () => {
    // Aliasing in development is the one thing that would break the feature
    // outright: every route would resolve to the stub and nothing would mock.
    expect(withMocker({ registry }).turbopack).toBeUndefined()
    expect(
      withMocker({ registry }, { turbopack: { resolveAlias: { foo: 'bar' } } })
        .turbopack,
    ).toEqual({ resolveAlias: { foo: 'bar' } })
  })

  it('resolves the adapter to its stub in a production build', () => {
    vi.stubEnv('NODE_ENV', 'production')

    const config = withMocker(
      { registry },
      {
        turbopack: {
          resolveExtensions: ['.ts'],
          resolveAlias: { foo: 'bar' },
        },
      },
    )

    // The consumer's own turbopack options and aliases survive: adopting this
    // wrapper must not cost them a resolution rule of their own.
    expect(config.turbopack).toEqual({
      resolveExtensions: ['.ts'],
      resolveAlias: {
        foo: 'bar',
        '@homelync/mocker-next': '@homelync/mocker-next/production',
      },
    })
  })

  it('emits no interception rules in a production build', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    // Set, and ignored. A production build has no path to the mock endpoint
    // whatever the flag says — the alias is the second lock, not the only one.
    vi.stubEnv('MOCK_API', '1')

    expect(await groupsOf(withMocker({ registry }))).toEqual({
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    })
  })
})
