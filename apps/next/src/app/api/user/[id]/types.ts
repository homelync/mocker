import { z } from 'zod'

/** One user, as `GET /api/user/[id]` answers with it. */
export const userSchema = z.object({
  // `id` is echoed from the dynamic segment, so the mock returns the user asked
  // for rather than a stranger with the right shape.
  id: z.string(),
  // `fullName`, not `name`: the default rules claim only the unambiguous
  // person-name fields, because a bare `name` is more often a device model than
  // a person and a plausible-looking wrong value is worse than lorem.
  fullName: z.string(),
  email: z.string(),
  phone: z.string().nullish(),
  role: z.enum(['admin', 'agent', 'landlord', 'tenant']),
  avatarUrl: z.string(),
  lastLoginAt: z.string().nullish(),
})

export type User = z.infer<typeof userSchema>
