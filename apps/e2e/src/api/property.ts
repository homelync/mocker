import { z } from 'zod'

/**
 * One property, as the API answers with it.
 *
 * Field *names* do most of the work: `postcode`, `line1`, `city`, `county` and
 * `...At` are claimed by the generator's default name rules, so a plain
 * `z.string()` comes back as a British postcode rather than as `Lorem ipsum`.
 */
export const propertySchema = z.object({
  // Echoed from the dynamic segment, because the field is named after it: a
  // request for `/api/property/ABC123` returns the property you asked for.
  reference: z.string(),
  address: z.object({
    line1: z.string(),
    city: z.string(),
    county: z.string().nullish(),
    postcode: z.string(),
  }),
  bedrooms: z.number().int().min(1).max(8),
  tenure: z.enum(['freehold', 'leasehold', 'commonhold']),
  epcRating: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']),
  createdAt: z.string(),
})

// export type Property = z.infer<typeof propertySchema>
