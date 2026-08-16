/**
 * What `MOCK_API` means, in one place.
 *
 * Shared by every opt-in mechanism — the `withMock` wrapper and the endpoint
 * registry's rewrite list — so the flag means exactly one thing. A second
 * implementation of this logic is how `MOCK_API=reports/devices` ends up mocking
 * a route through one mechanism and not the other, which from the outside is
 * indistinguishable from a bug in the route itself.
 *
 * Deliberately outside `core/`: the flag is a host-application convention, not
 * part of the generator, and `core` is kept importable by runtimes that have no
 * `process.env` at all.
 */

/** `MOCK_API` values that turn every opted-in route on. */
const ENABLE_ALL = ['1', 'true', 'all']

let warnedInProduction = false

/**
 * The environment, or an empty one.
 *
 * Guarded because a browser runtime — a Storybook decorator, an MSW worker —
 * has no `process` at all, and a bare `process.env` there is a `ReferenceError`
 * at import time rather than a missing flag. Such a runtime opts in by calling
 * the generator directly, so "no environment" simply means "not configured".
 */
function environment(): Partial<Record<string, string>> {
  return typeof process === 'undefined' ? {} : process.env
}

/**
 * Whether mocking is configured at all.
 *
 * Hard off in production regardless of the flag. A build that could serve
 * fabricated data to a real landlord is a worse failure than a demo environment
 * that cannot be mocked, and the flag is a developer convenience, not a
 * deployment mode.
 */
export function isMockConfigured(): boolean {
  const env = environment()
  const flag = env.MOCK_API
  if (flag === undefined || flag.trim() === '' || flag === '0') return false

  if (env.NODE_ENV === 'production') {
    if (!warnedInProduction) {
      warnedInProduction = true
      console.warn(
        '[mock] MOCK_API is set but ignored: mocking is disabled in production builds.',
      )
    }
    return false
  }

  return true
}

/**
 * Whether this particular path is mocked.
 *
 * `MOCK_API=1` mocks everything opted in; anything else is a comma-separated
 * list of path fragments (`MOCK_API=reports/devices,property/search`) so one
 * slow or unfinished endpoint can be faked while the rest still hit the real
 * services.
 *
 * @param pathname the request path as the *application* sees it — for a
 *   registry-served route that is the original path, not the rewritten one, so
 *   a fragment matches the same route whichever mechanism serves it
 */
export function isMockEnabledFor(pathname: string): boolean {
  const flag = environment().MOCK_API?.trim() ?? ''
  if (ENABLE_ALL.includes(flag)) return true

  return flag
    .split(',')
    .map((fragment) => fragment.trim())
    .filter((fragment) => fragment !== '')
    .some((fragment) => pathname.includes(fragment))
}
