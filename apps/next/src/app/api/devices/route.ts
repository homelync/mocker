import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { noUpstream } from '@/lib/upstream'

/**
 * `GET /api/devices?propertyReference=…` — a registry key with a query
 * constraint.
 *
 * The registry declares
 * `"GET /api/devices?propertyReference=[reference]"`, which becomes a rewrite
 * carrying a `has` condition: a request *without* the parameter is not
 * intercepted and lands here, on the 400 below, mocked or not. A request with
 * it never reaches this file.
 */
export function GET(request: NextRequest): NextResponse {
  const reference = request.nextUrl.searchParams.get('propertyReference')
  if (reference === null || reference === '') {
    return NextResponse.json(
      { error: 'propertyReference is required' },
      { status: 400 },
    )
  }

  return noUpstream('GET /api/devices')
}
