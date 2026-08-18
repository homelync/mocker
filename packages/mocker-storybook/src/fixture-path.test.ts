import { describe, expect, it } from 'vitest'
import type { MockControls } from '@magicspon/mocker'
import { fixturePath } from './fixture-path'

/**
 * The one property a fixture store has no way to recover from getting wrong.
 *
 * A name that drifts orphans a committed file, and a name that collides serves
 * one endpoint's data for another — both silently, both looking like a bug in
 * the story. Everything below is either "the same request gives the same name"
 * or "these two requests must not share one".
 */

const none: MockControls = {}

const path = (url: string, controls: MockControls = none): string =>
  fixturePath(new Request(`http://localhost${url}`), controls)

const post = (url: string): string =>
  fixturePath(new Request(`http://localhost${url}`, { method: 'POST' }), none)

describe('a fixture path', () => {
  it('mirrors the request as a directory tree', () => {
    expect(path('/api/devices')).toMatch(
      /^GET\/api\/devices\/[0-9a-f]{8}\.json$/,
    )
  })

  it('puts the method at the root', () => {
    expect(post('/api/devices').startsWith('POST/api/devices/')).toBe(true)
    expect(path('/api/devices')).not.toBe(post('/api/devices'))
  })

  it('carries a dynamic segment through as a directory', () => {
    expect(path('/api/property/ABC123')).toMatch(
      /^GET\/api\/property\/ABC123\/[0-9a-f]{8}\.json$/,
    )
  })

  it('gives the same request the same name every time', () => {
    expect(path('/api/devices?page=2')).toBe(path('/api/devices?page=2'))
  })

  it('ignores the order the query was written in', () => {
    // The same request, so the same data — and therefore the same file, not two
    // that have to be kept in step by hand.
    expect(path('/api/devices?limit=20&page=2')).toBe(
      path('/api/devices?page=2&limit=20'),
    )
  })

  it('separates two pages of one collection', () => {
    expect(path('/api/devices?page=1')).not.toBe(path('/api/devices?page=2'))
  })
})

describe('the controls a story sets', () => {
  it('give a seeded story its own fixture', () => {
    expect(path('/api/devices', { seed: 'busy' })).not.toBe(
      path('/api/devices'),
    )
  })

  it('give a sized collection its own fixture', () => {
    // Otherwise a story about an empty table and a story about a full one pin to
    // one file, and whichever ran first decides what both of them show.
    expect(path('/api/devices', { count: 0 })).not.toBe(path('/api/devices'))
  })

  it('leave the delay out', () => {
    // A delay changes when the response arrives, not what it says. Folding it
    // would give a loading-state story a redundant copy of the same data.
    expect(path('/api/devices', { delayMs: 2000 })).toBe(path('/api/devices'))
  })
})

describe('a path segment that is not a filename', () => {
  it('percent-encodes anything unsafe', () => {
    expect(path('/api/search/a b')).toContain('/a%20b/')
  })

  it('keeps two different segments apart once encoded', () => {
    expect(path('/api/search/a b')).not.toBe(path('/api/search/a-b'))
  })

  it('gives one endpoint one name however the client spelled it', () => {
    // `/a b` and `/a%20b` are the same endpoint. Two files for it would be two
    // files somebody has to remember to edit together.
    expect(path('/api/search/a b')).toBe(path('/api/search/a%20b'))
  })

  it('cannot express a traversal', () => {
    // `URL` resolves dot segments away before this ever sees them — encoded ones
    // too — so the guarantee holds twice over. Asserted on the name rather than
    // on the store, because the name is what gets committed and passed around.
    expect(path('/api/../../etc/passwd')).not.toContain('..')
    expect(path('/api/%2E%2E/%2E%2E/etc/passwd')).not.toContain('..')
  })

  it('leaves an ordinary dot alone', () => {
    expect(path('/api/v1.2/devices')).toContain('/v1.2/')
  })
})
