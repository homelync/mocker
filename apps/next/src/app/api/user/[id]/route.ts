import { withMock } from '@magicspon/mocker-next'
import type { NextRequest, NextResponse } from 'next/server'
import { withApiKey } from '@/lib/auth'
import { noUpstream } from '@/lib/upstream'
import { userSchema } from './types'

/**
 * `GET /api/user/[id]` — the *other* mechanism: the wrapper, in place.
 *
 * This route is deliberately **not** in `src/mocks/registry.ts`. Declaring it
 * in both would be a mistake worth catching: the registry's rewrite intercepts
 * first, so the options passed here would be silently ignored.
 *
 * `withMock` sits outside `withApiKey`, so a mocked request never reaches the
 * credential check — which is the point of running against nothing. Without
 * `MOCK_API` set, `withMock` returns the handler it was given and this file is
 * the route it would have been anyway.
 *
 * In a production build it is not even that: `withMocker()` points Turbopack at
 * `@magicspon/mocker-next/production`, so the import above resolves to a stub
 * and neither the generator nor faker can reach a chunk.
 */
export const GET = withMock(
  userSchema,
  withApiKey(
    (
      _request: NextRequest,
      _context: { params: Promise<{ id: string }> },
    ): Promise<NextResponse> =>
      Promise.resolve(noUpstream('GET /api/user/[id]')),
  ),
  {
    // Per-endpoint generation options. Unlike a registry entry, these are not
    // path-checked against the schema — `withMock` takes any `z.ZodType` — so a
    // mistyped path here surfaces at request time as an
    // `UnknownOverridePathError` rather than in the editor.
    options: {
      // Every user has a phone number and a login; this route's screens have
      // nowhere to put an absent one.
      nullishRate: 0,
      overrides: {
        avatarUrl: ({ faker }): string => faker.image.avatar(),
      },
    },
  },
)
