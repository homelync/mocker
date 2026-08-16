import type { NextRequest } from 'next/server'
import type { NextResponse } from 'next/server'
import { noUpstream } from '@/lib/upstream'

/**
 * `POST /api/property/[reference]/notes` — a write, mocked at 201.
 *
 * The registry entry sets `status: 201`, because a mocked create that answered
 * 200 would quietly disagree with the client code being developed against it.
 *
 * The mock is stateless: this returns a *generated* note every time, so a
 * create followed by a list will not show the row you just created. That is a
 * deliberate limit, not a bug — see the mocking guide.
 */
export function POST(
  _request: NextRequest,
  _context: { params: Promise<{ reference: string }> },
): NextResponse {
  return noUpstream('POST /api/property/[reference]/notes')
}
