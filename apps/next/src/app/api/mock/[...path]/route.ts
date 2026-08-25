import { serveRegistryRoute } from '@homelync/mocker-next'
import type { NextRequest, NextResponse } from 'next/server'
import { mockRegistry } from '@/mocks/registry'

/**
 * The one endpoint every registered route is rewritten to.
 *
 * `withMocker()` sends `/api/devices` to `/api/mock/devices`, and the catch-all
 * segments carry the original path — which is what lets the adapter rebuild the
 * URL the caller actually asked for, so the seed (and therefore the data) is
 * the same whichever mechanism served it.
 *
 * The registry is passed in rather than imported by the library: the endpoint
 * table is this application's data.
 *
 * In a production build this file still ships, and can only 404: no rewrite
 * points at it, and the import above resolves to the adapter's stub.
 */
function handler(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  return context.params.then(({ path }) =>
    serveRegistryRoute(request, path, mockRegistry),
  )
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
}
