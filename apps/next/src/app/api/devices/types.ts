import { z } from 'zod'

/**
 * A page of devices installed at one property.
 *
 * Written as an envelope on purpose: `results` is the shallowest array, so the
 * mock treats it as *the* collection and makes `count`, `page`, `totalPages`
 * and `limit` agree with the page it actually generated. Ask for
 * `?page=2&limit=5` and the totals still add up, which is what paging controls
 * need in order to misbehave honestly.
 */
export const deviceListSchema = z.object({
  // Echoed from the query string, because the field is named after the
  // parameter — so the page is about the property you asked for.
  propertyReference: z.string(),
  results: z.array(
    z.object({
      id: z.string(),
      serialNumber: z.string(),
      // A closed set in the domain and a plain string in the schema, which is
      // exactly the case `overrides` exists for — see the registry entry.
      statusId: z.string(),
      model: z.string(),
      room: z.string(),
      installedAt: z.string(),
      lastSeenAt: z.string().nullish(),
      firmware: z.object({
        version: z.string(),
        upToDate: z.boolean(),
      }),
      tags: z.array(z.string()),
    }),
  ),
  count: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
})

export type DeviceList = z.infer<typeof deviceListSchema>
