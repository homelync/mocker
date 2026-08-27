import { findMatch, parseKey } from '@homelync/mocker'
import { describe, expect, it } from 'vitest'
import { bindingValue, declaredRequest, describeRequest } from './requests'

/**
 * The invariant worth asserting hardest is the round trip: a request derived
 * from a key must match *that key*. Everything downstream assumes it — the
 * fixture is written under the name `serveFromRegistry` would look for — and a
 * binding filled with a value that breaks a constraint (an empty string, a value
 * a literal condition disagrees with) would produce a file nothing ever reads.
 */

const KEYS = [
  'GET /api/devices',
  'GET /api/property/[reference]',
  'GET /api/property/[reference]/devices/[deviceId]',
  'GET /api/devices?propertyReference=[reference]',
  'GET /api/devices?mode=summary',
  'GET /api/devices?propertyReference=[reference]&mode=summary',
  'GET /api/devices?propertyReference',
  'POST /api/property/[reference]/notes',
]

describe('declaredRequest', () => {
  it.each(KEYS)('derives a request that matches %s', (key) => {
    const request = declaredRequest(key)
    const url = new URL(request.url)

    expect(
      findMatch([key], request.method, url.pathname, url.searchParams),
    ).not.toBeNull()
  })

  it('leaves a static path alone', () => {
    expect(describeRequest(declaredRequest('GET /api/devices'))).toBe(
      'GET /api/devices',
    )
  })

  it('keeps a literal query condition verbatim', () => {
    const request = declaredRequest('GET /api/devices?mode=summary')
    expect(new URL(request.url).searchParams.get('mode')).toBe('summary')
  })

  it('carries the method and the control headers through', () => {
    const request = declaredRequest('POST /api/notes', {
      'x-mock-seed': 'abc',
    })

    expect(request.method).toBe('POST')
    expect(request.headers.get('x-mock-seed')).toBe('abc')
  })

  it('is the same request on every run', () => {
    const once = declaredRequest('GET /api/property/[reference]')
    const twice = declaredRequest('GET /api/property/[reference]')

    expect(twice.url).toBe(once.url)
  })

  /**
   * The seed is the endpoint's identity — method and path — not the whole key.
   * Adding a query constraint to an entry must not rename the file its path
   * fixture already lives in, or every such edit churns the fixture tree.
   */
  it('does not move a path binding when a query constraint is added', () => {
    const bare = new URL(declaredRequest('GET /api/property/[reference]').url)
    const constrained = new URL(
      declaredRequest('GET /api/property/[reference]?mode=summary').url,
    )

    expect(constrained.pathname).toBe(bare.pathname)
  })

  it('gives two bindings on one path different values', () => {
    const url = new URL(
      declaredRequest('GET /api/property/[reference]/devices/[deviceId]').url,
    )
    const [, , , reference, , deviceId] = url.pathname.split('/')

    expect(reference).not.toBe(deviceId)
  })

  it('refuses a key that does not parse', () => {
    expect(() => declaredRequest('GET api/devices')).toThrow(
      /must start with "\/"/,
    )
  })
})

describe('bindingValue', () => {
  it('takes a reference from the name rule that claims references', () => {
    expect(bindingValue('reference', 'GET /api/property/[reference]')).toMatch(
      /^[A-Z0-9]{8}$/,
    )
  })

  it('takes an identifier from the rule that claims ids', () => {
    expect(bindingValue('deviceId', 'GET /api/devices/[deviceId]')).toMatch(
      /^[0-9a-fA-F]{8}$/,
    )
  })

  /**
   * `[ownerName]` matches the person-name rule, which produces "Ada Lovelace" —
   * a space in a path segment. The fallback is what keeps a filename readable.
   */
  it('falls back when a rule produces something a path cannot carry', () => {
    expect(bindingValue('fullName', 'GET /api/people/[fullName]')).toMatch(
      /^[A-Z0-9]{8}$/,
    )
  })

  it('never produces an empty value', () => {
    for (const name of ['a', 'reference', 'id', 'page', 'url', 'email']) {
      expect(bindingValue(name, 'GET /x/[y]').length).toBeGreaterThan(0)
    }
  })

  it('is stable across calls', () => {
    const identity = 'GET /api/property/[reference]'
    expect(bindingValue('reference', identity)).toBe(
      bindingValue('reference', identity),
    )
  })

  it('differs between endpoints', () => {
    expect(bindingValue('reference', 'GET /api/property/[reference]')).not.toBe(
      bindingValue('reference', 'GET /api/site/[reference]'),
    )
  })
})

/**
 * A named value is a fact about the host's data; a generated one is a guess. So
 * the value wins outright — including over the segment-safety rule, which exists
 * to keep a guess readable and has no business overruling somebody's own
 * reference.
 */
describe('configured params', () => {
  it('uses the value given for a binding', () => {
    expect(
      bindingValue('reference', 'GET /api/property/[reference]', {
        reference: 'lorem999',
      }),
    ).toBe('lorem999')
  })

  it('still generates a binding the params do not name', () => {
    expect(
      bindingValue('deviceId', 'GET /api/devices/[deviceId]', {
        reference: 'lorem999',
      }),
    ).toMatch(/^[0-9a-fA-F]{8}$/)
  })

  it('puts the value in the path', () => {
    const request = declaredRequest(
      'GET /api/property/[reference]',
      {},
      { reference: 'lorem999' },
    )

    expect(describeRequest(request)).toBe('GET /api/property/lorem999')
  })

  it('puts the value in a query binding', () => {
    const request = declaredRequest(
      'GET /api/devices?propertyReference=[reference]',
      {},
      { reference: 'lorem999' },
    )

    expect(new URL(request.url).searchParams.get('propertyReference')).toBe(
      'lorem999',
    )
  })

  /** A bare condition names no binding, so the parameter's own name is the hint. */
  it('uses the value for a bare query condition of that name', () => {
    const request = declaredRequest(
      'GET /api/devices?propertyReference',
      {},
      { propertyReference: 'lorem999' },
    )

    expect(new URL(request.url).searchParams.get('propertyReference')).toBe(
      'lorem999',
    )
  })

  /** The key states the value; a config that disagreed would break the match. */
  it('leaves a literal query condition alone', () => {
    const request = declaredRequest(
      'GET /api/devices?mode=summary',
      {},
      { mode: 'lorem999' },
    )

    expect(new URL(request.url).searchParams.get('mode')).toBe('summary')
  })

  it('keeps the request matching its key', () => {
    const key = 'GET /api/property/[reference]/devices/[deviceId]'
    const request = declaredRequest(key, {}, { reference: 'lorem 999/x' })
    const url = new URL(request.url)

    expect(
      findMatch([key], request.method, url.pathname, url.searchParams),
    ).not.toBeNull()
  })

  it('ignores an empty value rather than writing an empty segment', () => {
    expect(
      bindingValue('reference', 'GET /api/property/[reference]', {
        reference: '',
      }),
    ).toMatch(/^[A-Z0-9]{8}$/)
  })
})

describe('key coverage', () => {
  /** Every binding a key declares must appear in the request it produces. */
  it.each(KEYS)('binds every parameter in %s', (key) => {
    const { pattern, query } = parseKey(key)
    const url = new URL(declaredRequest(key).url)

    expect(url.pathname.split('/')).toHaveLength(pattern.split('/').length)
    for (const constraint of query) {
      expect(url.searchParams.get(constraint.name)).toBeTruthy()
    }
  })
})

/**
 * A binding value ends up in the *filename* of a body generated in the same
 * run, so it follows the same locale. Only the bindings whose rule reads
 * locale data change — `street` does, `reference` is alphanumeric either way —
 * and a value that is not a safe path segment falls back regardless, which is
 * why a Swiss `city` is as likely to come out as a code as a city name.
 */
describe('a locale', () => {
  const identity = 'GET /api/property/[street]'

  it('fills a locale-sensitive binding in that language', () => {
    expect(bindingValue('street', identity, {}, ['de_CH'])).not.toBe(
      bindingValue('street', identity),
    )
  })

  it('leaves a binding whose rule reads no locale data alone', () => {
    const reference = 'GET /api/property/[reference]'

    expect(bindingValue('reference', reference, {}, ['de_CH'])).toBe(
      bindingValue('reference', reference),
    )
  })

  it('never overrules a configured param', () => {
    expect(
      bindingValue('street', identity, { street: 'lorem999' }, ['de_CH']),
    ).toBe('lorem999')
  })

  it('stays deterministic', () => {
    expect(bindingValue('street', identity, {}, ['de_CH'])).toBe(
      bindingValue('street', identity, {}, ['de_CH']),
    )
  })

  it('reaches the bindings in a whole request', () => {
    const swiss = new URL(declaredRequest(identity, {}, {}, ['de_CH']).url)
    const british = new URL(declaredRequest(identity).url)

    expect(swiss.pathname).not.toBe(british.pathname)
  })
})
