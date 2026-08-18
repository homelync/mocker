import { z } from 'zod'

/**
 * A guess at `GET /api/property/[reference]/timeline`, which **does not exist
 * yet**.
 *
 * A planned schema lives here rather than beside a route, because there is no
 * route: nobody has built the endpoint. The registry entry carries
 * `planned: "WP-101"`, and the front end can be written against the shape today.
 *
 * Delete this file when the real route lands, and move the schema into its
 * `types.ts` — a host that keeps a drift test (see the README) is told to do so
 * on the day the `route.ts` appears.
 */
export const timelineSchema = z.object({
  reference: z.string(),
  events: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(['inspection', 'repair', 'tenancy', 'certificate']),
      summary: z.string(),
      occurredAt: z.string(),
      actor: z.string().nullish(),
    }),
  ),
})

/**
 * Exported for the reader; see the note in `api/devices/types.ts`. On a planned
 * route it is the whole deliverable — the front end is written against this
 * before the endpoint exists.
 *
 * @expected-unused
 */
export type Timeline = z.infer<typeof timelineSchema>
