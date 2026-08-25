import { findMatch } from '@homelync/mocker'
import type {
  GenerateOptions,
  MockRegistry,
  MockRegistryEntry,
} from '@homelync/mocker'
import type { MockerEndpointOptions } from './options'

/**
 * One test's changes of mind, as a list the adapter owns.
 *
 * This is where the single-route decision pays for itself. Registering a route
 * per override would rest precedence on Playwright's own ordering, and that
 * fails *silently*: an override that does not win returns plausible global data,
 * the page renders, and the assertion fails looking like a component bug. Here
 * precedence is a rule with a name — **last `use()` wins** — and it is the same
 * rule twice, because a second `use()` of one key is also a change of mind.
 *
 * Scanned per request rather than resolved when `use()` is called, because an
 * override is a claim about a *key*, and only a request can say whether it is
 * this key's. A key with query conditions — `"GET /api/devices?mode=full"` —
 * overrides one of two endpoints on a shared path and leaves the other alone.
 */

/** A pending override: a registry key, and what to do differently with it. */
export interface MockerOverride {
  readonly key: string
  readonly options: MockerEndpointOptions
}

/**
 * The override that applies to a request, or `null`.
 *
 * Walked from the end so the most recent `use()` is consulted first, and skipped
 * when its key does not match the request in front of it.
 *
 * @param overrides the list, in the order `use()` was called
 * @param method the request's method
 * @param url the request's URL, as the registry declares it
 */
export function findOverride(
  overrides: readonly MockerOverride[],
  method: string,
  url: URL,
): MockerOverride | null {
  for (let index = overrides.length - 1; index >= 0; index--) {
    // Non-null: `index` walks the array's own bounds.
    const override = overrides[index]!
    const match = findMatch(
      [override.key],
      method,
      url.pathname,
      url.searchParams,
    )
    if (match !== null) return override
  }

  return null
}

/**
 * A one-key registry for an override, with its generation options merged in.
 *
 * Handed on to `serveFromRegistry` rather than served here, so an override goes
 * through exactly the matching, the schema thunk and the seeding that every
 * other request does. The alternative — an override path that answers directly —
 * is how a test ends up asserting on bytes no other code path can produce.
 *
 * @param registry the table the route was installed with
 * @param override the entry to bend
 * @throws Error if the key is not in the registry
 */
export function overrideRegistry(
  registry: MockRegistry,
  override: MockerOverride,
): MockRegistry {
  const entry = registry[override.key]
  if (entry === undefined) {
    throw new Error(`No mock registered for "${override.key}".`)
  }

  const merged: MockRegistryEntry = {
    ...entry,
    // The same widening `handle()` performs, and for the same reason: the
    // options were checked against this entry's schema in `use()`, where the
    // caller wrote them, and a single-entry registry is typed for any schema.
    options: {
      ...entry.options,
      ...(override.options.generate as GenerateOptions | undefined),
    },
  }

  return { [override.key]: merged }
}
