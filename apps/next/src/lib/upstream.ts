import { NextResponse } from 'next/server'

/**
 * What every route in this example does when it is *not* mocked.
 *
 * There is no backend here — the point of the example is the mock — so a real
 * handler answers 501 and says how to reach the interesting path. That is also
 * the honest demonstration: with `MOCK_API` unset the app is exactly the app it
 * was, and nothing in this file knows the mock exists.
 */
export function noUpstream(route: string): NextResponse {
  return NextResponse.json(
    {
      error: `No upstream service for ${route}.`,
      hint: 'Run the dev server with MOCK_API=1 to serve this route from its zod schema.',
    },
    { status: 501 },
  )
}
