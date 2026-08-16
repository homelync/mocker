import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * A stand-in for whatever middleware a real route is wrapped in.
 *
 * It exists here to make one point about `withMock`: the mock wraps the
 * *outside* of this, so a mocked request never reaches the session check and a
 * developer running against fabricated data needs no credentials at all.
 */
export function withApiKey<TArgs extends unknown[]>(
  handler: (request: NextRequest, ...args: TArgs) => Promise<NextResponse>,
): (request: NextRequest, ...args: TArgs) => Promise<NextResponse> {
  return async (request, ...args) => {
    if (request.headers.get('x-api-key') === null) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }
    return handler(request, ...args)
  }
}
