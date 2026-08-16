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

export type Note = z.infer<typeof noteSchema>
