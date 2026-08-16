/**
 * Per-request `x-mock-*` overrides.
 *
 * These exist so a state can be reproduced without editing code: a 500 to check
 * an error boundary, a three-second delay to see the loading skeleton, a
 * different seed to pull a different dataset out of the same request. Anything
 * a developer would otherwise fake by temporarily breaking a route.
 *
 * Headers rather than query parameters, because a query parameter changes the
 * request signature and therefore the data — you would be looking at a
 * *different* response, not the same one delayed.
 */

/** Header names, exported so callers and tests share one spelling. */
export const MOCK_STATUS_HEADER = 'x-mock-status'
export const MOCK_DELAY_HEADER = 'x-mock-delay'
export const MOCK_COUNT_HEADER = 'x-mock-count'
export const MOCK_SEED_HEADER = 'x-mock-seed'

/** Long enough to watch a skeleton; short enough not to look like a hang. */
const MAX_DELAY_MS = 30_000

/** Well past any real page size, and short of anything that would hang a walk. */
const MAX_COUNT = 10_000

export interface MockControls {
  /** Respond with this status instead of the endpoint's own. */
  readonly status?: number
  /** Wait this long before responding. */
  readonly delayMs?: number
  /** Size the primary collection, overriding the request's own `limit`. */
  readonly count?: number
  /** Replace the request-derived seed, so the same request yields new data. */
  readonly seed?: string
}

/**
 * Thrown for a malformed control header.
 *
 * A rejected header rather than an ignored one, for the same reason
 * {@link UnknownOverridePathError} exists: `x-mock-count: twenty` that quietly
 * does nothing is indistinguishable from a mock that ignores counts, and the
 * only symptom is a page that looks subtly wrong.
 */
export class InvalidControlError extends Error {
  readonly header: string

  constructor(header: string, value: string, expected: string) {
    super(`Invalid ${header}: "${value}". Expected ${expected}.`)
    this.name = 'InvalidControlError'
    this.header = header
  }
}

function readInt(
  headers: Headers,
  header: string,
  min: number,
  max: number,
): number | undefined {
  const raw = headers.get(header)
  if (raw === null || raw.trim() === '') return undefined

  const value = Number(raw)
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new InvalidControlError(
      header,
      raw,
      `a whole number between ${String(min)} and ${String(max)}`,
    )
  }
  return value
}

/** Read the `x-mock-*` controls off a request. */
export function readControls(headers: Headers): MockControls {
  const seed = headers.get(MOCK_SEED_HEADER)?.trim()

  return {
    // 599 rather than 599-and-standard-only: a made-up status is a legitimate
    // thing to want to see a client handle.
    status: readInt(headers, MOCK_STATUS_HEADER, 100, 599),
    delayMs: readInt(headers, MOCK_DELAY_HEADER, 0, MAX_DELAY_MS),
    count: readInt(headers, MOCK_COUNT_HEADER, 0, MAX_COUNT),
    seed: seed === '' ? undefined : seed,
  }
}
