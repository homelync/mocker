import { bypass } from 'msw'
import { FIXTURE_ROUTE } from './route'

/**
 * The preview's half of the fixture store: two fetches.
 *
 * A Storybook preview is a browser. It has no `node:fs`, and
 * `package-boundary.test.ts` asserts it cannot acquire one — so "respond from
 * disk" has to be somebody else's disk, reached over HTTP. That somebody is the
 * Vite plugin in `vite.ts`, mounted on Storybook's own dev server, which is why
 * this is the one feature in this package that needs a line in
 * `.storybook/main.ts`.
 *
 * Every request here goes through MSW's `bypass`, which marks it so the worker
 * passes it straight to the network. Without that, a preview configured with
 * `onUnhandledRequest: "error"` would fail its own fixture lookups — the mock
 * would be intercepting itself.
 */

/** What a lookup found, and whether anything was listening. */
export type FixtureLookup =
  /** The fixture exists; this is the file, verbatim. */
  | { readonly kind: 'hit'; readonly body: string }
  /** The store answered, and has no such file yet. Write one. */
  | { readonly kind: 'miss' }
  /** Nothing answered: no plugin, or a static build with no server behind it. */
  | { readonly kind: 'unavailable' }

const NOT_FOUND = 404

/**
 * Said once per preview, not once per request.
 *
 * A missing plugin fails on every fixed request there is, and a story that
 * fetches on render fails on every render — the same sentence a few hundred
 * times buries whatever else the console had to say.
 */
let warned = false

function warnUnavailable(): void {
  if (warned) return
  warned = true
  console.warn(
    `[mocker] Fixed mocks asked for ${FIXTURE_ROUTE} and nothing answered, so responses are being generated instead of fixed. Add mockerFixtures() from "@magicspon/mocker-storybook/vite" to viteFinal in .storybook/main.ts.`,
  )
}

/**
 * A fixture path as a URL the store answers on.
 *
 * Resolved against the origin explicitly rather than left relative, which is the
 * same thing MSW's own path matcher does and for the same reason: a browser
 * resolves a relative `Request` against the document, and nothing else does.
 * `setupServer` in a Vitest run would otherwise throw on every lookup and report
 * the store as missing — a failure that looks exactly like an empty directory.
 *
 * With no `location` at all there is nothing to resolve against and no dev
 * server to reach either, so the relative path is handed on to fail and be
 * caught as "unavailable", which is the truth.
 */
function fixtureUrl(name: string): string {
  const relative = `${FIXTURE_ROUTE}/${name}`
  if (typeof location === 'undefined') return relative

  return new URL(relative, location.href).href
}

/**
 * Read a fixed response, if one has been written.
 *
 * The three outcomes are kept apart because they call for three different
 * things: serve the file, generate and store it, or generate and say why nothing
 * was stored. Collapsing "no file" into "no server" is what would make a
 * consumer who forgot the plugin believe their fixtures were being written all
 * along.
 *
 * @param name a path from `fixturePath`
 */
export async function readFixture(name: string): Promise<FixtureLookup> {
  let response: Response
  try {
    response = await fetch(bypass(fixtureUrl(name)))
  } catch {
    // A network-level failure: no dev server, or a built preview served as
    // static files. Neither is an error the story should see.
    warnUnavailable()
    return { kind: 'unavailable' }
  }

  if (response.status === NOT_FOUND) return { kind: 'miss' }
  if (!response.ok) {
    warnUnavailable()
    return { kind: 'unavailable' }
  }

  return { kind: 'hit', body: await response.text() }
}

/**
 * Write a response to the store, so this request answers the same way forever.
 *
 * Failure is reported and swallowed. The response has already been generated and
 * is perfectly serviceable; refusing to show it because it could not be saved
 * would turn a read-only checkout into a broken Storybook.
 *
 * @param name a path from `fixturePath`
 * @param body the response body, as it should appear in the file
 */
export async function writeFixture(name: string, body: string): Promise<void> {
  try {
    const response = await fetch(
      bypass(fixtureUrl(name), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body,
      }),
    )
    if (!response.ok) warnUnavailable()
  } catch {
    warnUnavailable()
  }
}
