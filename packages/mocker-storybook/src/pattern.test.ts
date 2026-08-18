import { describe, expect, it } from 'vitest'
import { toHandlerPath, toPrefixPath, toRegistryPath } from './pattern'

describe('toHandlerPath', () => {
  it('rewrites dynamic segments in MSW dialect', () => {
    expect(toHandlerPath('/api/property/[reference]')).toBe(
      '/api/property/:reference',
    )
  })

  it('rewrites every dynamic segment, not just the first', () => {
    expect(toHandlerPath('/api/property/[reference]/notes/[noteId]')).toBe(
      '/api/property/:reference/notes/:noteId',
    )
  })

  it('leaves a static path alone', () => {
    expect(toHandlerPath('/api/devices')).toBe('/api/devices')
  })

  it('mounts the path under an absolute base URL', () => {
    expect(toHandlerPath('/api/devices', 'https://api.acme.com')).toBe(
      'https://api.acme.com/api/devices',
    )
  })

  it('does not double a slash on a base URL that ends in one', () => {
    expect(toHandlerPath('/api/devices', 'https://api.acme.com/')).toBe(
      'https://api.acme.com/api/devices',
    )
  })

  it('mounts the path under a bare path prefix', () => {
    expect(toHandlerPath('/api/devices', '/v1')).toBe('/v1/api/devices')
  })
})

describe('toPrefixPath', () => {
  it('reads the path out of an absolute base URL', () => {
    expect(toPrefixPath('https://api.acme.com/v1')).toBe('/v1')
  })

  it('is empty for an origin with no path of its own', () => {
    // `new URL(...).pathname` is "/" here, which would strip a leading slash
    // off every request path if it were taken literally.
    expect(toPrefixPath('https://api.acme.com')).toBe('')
  })

  it('takes a bare prefix as itself', () => {
    expect(toPrefixPath('/v1')).toBe('/v1')
  })

  it('is empty when nothing was mounted', () => {
    expect(toPrefixPath(undefined)).toBe('')
  })
})

describe('toRegistryPath', () => {
  it('strips the path an absolute base URL contributed', () => {
    expect(toRegistryPath('/v1/api/devices', 'https://api.acme.com/v1')).toBe(
      '/api/devices',
    )
  })

  it('strips a bare prefix', () => {
    expect(toRegistryPath('/v1/api/devices', '/v1')).toBe('/api/devices')
  })

  it('leaves the path alone when nothing was mounted', () => {
    expect(toRegistryPath('/api/devices')).toBe('/api/devices')
  })

  it('leaves a path the prefix does not cover alone', () => {
    // Not this handler's request. Trimming here would invent a path.
    expect(toRegistryPath('/other/api/devices', '/v1')).toBe(
      '/other/api/devices',
    )
  })

  it('answers the root when the prefix consumed the whole path', () => {
    expect(toRegistryPath('/v1', '/v1')).toBe('/')
  })

  it('undoes what toHandlerPath did', () => {
    const mounted = toHandlerPath('/api/devices', 'https://api.acme.com/v1')

    expect(
      toRegistryPath(new URL(mounted).pathname, 'https://api.acme.com/v1'),
    ).toBe('/api/devices')
  })
})
