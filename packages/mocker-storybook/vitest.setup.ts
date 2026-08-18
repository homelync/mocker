/**
 * The one browser fact these tests cannot do without: an origin.
 *
 * MSW resolves a relative handler path — `/api/devices`, which is how every
 * registry key reads — against `location.origin`, and matches nothing at all
 * when there is none. A Storybook preview always has one; Node does not, so
 * without this the whole suite would pass by falling through to a fallback
 * handler, which is exactly the failure it is meant to catch.
 *
 * Stubbed rather than swapping in a DOM environment: `href` is the only property
 * MSW reads to resolve a path, and a whole jsdom to supply one string would be a
 * dependency this package otherwise does not need. `origin` is set alongside it
 * because a `location` carrying one and not the other is a shape no browser has.
 */
globalThis.location = {
  href: 'http://localhost/',
  origin: 'http://localhost',
} as Location
