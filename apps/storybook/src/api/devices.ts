import { z } from 'zod'

/**
 * A page of devices installed at one property.
 *
 * An envelope on purpose: `results` is the shallowest array, so the mock treats
 * it as *the* collection and makes `count`, `page`, `limit` and `totalPages`
 * agree with the page it actually generated — which is what the table's paging
 * footer needs in order to misbehave honestly.
 */
export const deviceListSchema = z.object({
  // Echoed from the query string, because the field is named after the
  // parameter.
  propertyReference: z.string(),
  results: z.array(
    z.object({
      id: z.string(),
      serialNumber: z.string(),
      // A closed set in the domain and a plain string in the schema — exactly
      // the case an override exists for. See the registry entry.
      statusId: z.string(),
      room: z.string(),
      installedAt: z.string(),
      lastSeenAt: z.string().nullish(),
    }),
  ),
  count: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
})

export type DeviceList = z.infer<typeof deviceListSchema>
export type Device = DeviceList['results'][number]
