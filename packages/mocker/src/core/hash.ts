/**
 * FNV-1a. Any stable string→int hash would do; this one is short, dependency
 * free, and spreads similar inputs (`?page=1` vs `?page=2`) into unrelated
 * results, which matters because adjacent pages must not look alike.
 *
 * Shared rather than private to the generator because the request handler hashes
 * too — it sizes a row pool from the request's path — and the two must agree on
 * what "the same input" means or a page's rows and its `count` would drift
 * apart.
 */
export function hashSeed(seed: number | string): number {
  if (typeof seed === 'number') return seed >>> 0

  let hash = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}
