import { describe, expect, it } from 'vitest'
import { matchesScope, resolveScope, sameOrigin, toRegistryPath } from './scope'

/**
 * Scope decides which requests can fail a test, so both mistakes are expensive
 * and neither announces itself: too wide and a test dies over a font, too narrow
 * and an undeclared endpoint reaches a real backend with nothing said.
 */

describe('the scope a set of options implies', () => {
  it('is an explicit scope when there is one', () => {
    expect(resolveScope({ scope: '/api' })).toBe('/api')
  })

  it('is the origin of an absolute baseUrl', () => {
    expect(resolveScope({ baseUrl: 'https://api.acme.com/v1/' })).toBe(
      'https://api.acme.com/v1',
    )
  })

  it('is deferred for a path-only baseUrl', () => {
    // `/v1` says where the API sits on an origin, not which origin — so it
    // narrows nothing the same-origin rule does not already.
    expect(resolveScope({ baseUrl: '/v1' })).toBeNull()
  })

  it('is deferred when nothing was said', () => {
    // Not a missing answer: "the page's own origin" does not exist until a page
    // does, so the handler resolves it per request from the requesting frame.
    expect(resolveScope({})).toBeNull()
  })

  it('prefers an explicit scope over a baseUrl', () => {
    expect(
      resolveScope({ scope: /acme/, baseUrl: 'https://api.acme.com' }),
    ).toEqual(/acme/)
  })
})

describe('matching a scope', () => {
  it('narrows by path when it starts with a slash', () => {
    expect(matchesScope('/api', 'http://localhost:3000/api/devices')).toBe(true)
    expect(matchesScope('/api', 'http://localhost:3000/health')).toBe(false)
  })

  it('narrows by URL prefix otherwise', () => {
    expect(matchesScope('https://api.acme.com', 'https://api.acme.com/x')).toBe(
      true,
    )
    expect(matchesScope('https://api.acme.com', 'https://acme.com/x')).toBe(
      false,
    )
  })

  it('takes a pattern for anything else', () => {
    expect(matchesScope(/\/api\//, 'http://localhost:3000/api/devices')).toBe(
      true,
    )
  })
})

describe('the default, same-origin scope', () => {
  it('holds for the app the page came from', () => {
    expect(
      sameOrigin('http://localhost:3000/api/devices', 'http://localhost:3000/'),
    ).toBe(true)
  })

  it('does not hold for a third party', () => {
    expect(
      sameOrigin('https://fonts.gstatic.com/x.woff2', 'http://localhost:3000/'),
    ).toBe(false)
  })

  it('claims nothing about a frame with no navigable URL', () => {
    expect(sameOrigin('http://localhost:3000/api/devices', 'about:blank')).toBe(
      false,
    )
  })
})

describe('a matched path, as the registry declares it', () => {
  it('drops the prefix an absolute baseUrl carries', () => {
    expect(toRegistryPath('/v1/api/devices', 'https://api.acme.com/v1')).toBe(
      '/api/devices',
    )
  })

  it('drops a bare path prefix', () => {
    expect(toRegistryPath('/v1/api/devices', '/v1')).toBe('/api/devices')
  })

  it('leaves a path alone when the origin carries no prefix', () => {
    expect(toRegistryPath('/api/devices', 'https://api.acme.com')).toBe(
      '/api/devices',
    )
  })

  it('leaves the root behind when the prefix consumed everything', () => {
    // `new URL("", origin)` is the origin's own path and would match no key.
    expect(toRegistryPath('/v1', '/v1')).toBe('/')
  })

  it('leaves a path that does not carry the prefix untouched', () => {
    expect(toRegistryPath('/api/devices', '/v1')).toBe('/api/devices')
  })
})
