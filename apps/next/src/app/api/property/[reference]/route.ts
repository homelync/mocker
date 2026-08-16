import type { NextRequest } from 'next/server'
import type { NextResponse } from 'next/server'
import { noUpstream } from '@/lib/upstream'

/**
 * `GET /api/property/[reference]` — the registry mechanism.
 *
 * Nothing in this file knows about the mock. `src/mocks/registry.ts` declares
 * the key, and with `MOCK_API` on a `beforeFiles` rewrite intercepts the
 * request *before* this route is matched, so this handler is never reached.
 *
 * That is the registry's whole selling point: a mocked route file is the file
 * it would have been anyway.
 */
export function GET(
  _request: NextRequest,
  _context: { params: Promise<{ reference: string }> },
): NextResponse {
  return noUpstream('GET /api/property/[reference]')
}
