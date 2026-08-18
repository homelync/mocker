import { z } from 'zod'

/**
 * One property, as this route answers with it.
 *
 * The schema lives next to the route rather than in `src/mocks/`, because it is
 * the route's own contract: the registry entry imports it lazily, so the mock
 * is generated from the very shape the real handler has to satisfy and cannot
 * drift from it.
 *
 * Field *names* do most of the work. `postcode`, `line1`, `city`, `county` and
 * `...At` are claimed by the generator's default name rules, so a plain
 * `z.string()` comes back as a British postcode rather than as `Lorem ipsum`.
 */
export const propertySchema = z.object({
  // Echoed from the dynamic segment: a request for `/api/property/ABC123`
  // returns the property you asked for, because the param name matches the
  // field name.
  reference: z.string(),
  address: z.object({
    line1: z.string(),
    city: z.string(),
    county: z.string().nullish(),
    postcode: z.string(),
  }),
  // Bounds are honoured, so a number the domain has a range for does not need
  // an override to stop it coming back as 519.
  bedrooms: z.number().int().min(1).max(8),
  tenure: z.enum(['freehold', 'leasehold', 'commonhold']),
  epcRating: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']),
  landlordEmail: z.string(),
  createdAt: z.string(),
})

/**
 * Exported for the reader; see the note in `api/devices/types.ts`.
 *
 * @expected-unused
 */
export type Property = z.infer<typeof propertySchema>
