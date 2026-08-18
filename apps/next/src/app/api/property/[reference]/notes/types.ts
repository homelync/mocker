import { z } from 'zod'

/** The note a successful `POST` answers with. */
export const noteSchema = z.object({
  id: z.string(),
  reference: z.string(),
  body: z.string(),
  author: z.object({
    fullName: z.string(),
    email: z.string(),
  }),
  createdAt: z.string(),
})

/**
 * Exported for the reader; see the note in `api/devices/types.ts`.
 *
 * @expected-unused
 */
export type Note = z.infer<typeof noteSchema>
