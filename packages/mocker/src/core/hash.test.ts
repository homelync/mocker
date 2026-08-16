import { describe, expect, it } from 'vitest'
import { hashSeed } from './hash'

/**
 * The seed hash is shared between the generator and the request handler, so its
 * contract is narrower than "any stable hash": it must be a non-negative 32-bit
 * integer for `faker.seed`, and it must scatter adjacent requests.
 */

describe('numeric seeds', () => {
  it('passes a non-negative integer through unchanged', () => {
    expect(hashSeed(0)).toBe(0)
    expect(hashSeed(42)).toBe(42)
    expect(hashSeed(4_294_967_295)).toBe(4_294_967_295)
  })

  it('folds a negative number into the unsigned range', () => {
    // faker.seed() wants a non-negative integer; `>>> 0` is what guarantees one.
    expect(hashSeed(-1)).toBe(4_294_967_295)
    expect(hashSeed(-42)).toBeGreaterThanOrEqual(0)
  })

  it('truncates a fractional seed', () => {
    // Numeric seeds are effectively uint32, so 1.5 and 1.9 are the same seed.
    expect(hashSeed(1.5)).toBe(1)
    expect(hashSeed(1.9)).toBe(1)
  })
})

describe('string seeds', () => {
  it('is stable for the same string', () => {
    expect(hashSeed('GET /devices?page=1')).toBe(
      hashSeed('GET /devices?page=1'),
    )
  })

  it('is the FNV-1a offset basis for the empty string', () => {
    expect(hashSeed('')).toBe(0x811c9dc5)
  })

  it('stays a non-negative 32-bit integer', () => {
    for (const seed of ['', 'a', 'GET /x?y=1', '\u{1f3e0}'.repeat(50)]) {
      const hash = hashSeed(seed)
      expect(Number.isInteger(hash)).toBe(true)
      expect(hash).toBeGreaterThanOrEqual(0)
      expect(hash).toBeLessThanOrEqual(0xffff_ffff)
    }
  })

  it('does not collide across adjacent pages', () => {
    // The property the generator depends on: `?page=1` and `?page=2` must land
    // in unrelated places, or consecutive pages would carry similar rows.
    const hashes = Array.from({ length: 100 }, (_unused, page) =>
      hashSeed(`GET /devices?page=${String(page + 1)}`),
    )

    expect(new Set(hashes).size).toBe(100)
  })

  it('changes the high bits for a one-character change', () => {
    // A hash that only moved its low bits would leave `hash % poolRange`
    // clustered, and every page would report a near-identical total.
    const a = hashSeed('GET /devices?page=1')
    const b = hashSeed('GET /devices?page=2')

    expect(a >>> 24).not.toBe(b >>> 24)
  })

  it('treats a numeric string and the number as different seeds', () => {
    expect(hashSeed('1')).not.toBe(hashSeed(1))
  })
})
