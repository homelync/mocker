// Imported by `next.config.ts`, which Next evaluates with its own loader,
// unbundled, before any build graph exists. So every schema is a *thunk* and
// every type import is `import type` — erased — and this file loads no
// application module, no zod and no faker until a request is actually served.
import type {
  CheckedMockRegistry,
  MockRegistryDraft,
} from '@magicspon/mocker/config'
import type { MockOptions } from '@magicspon/mocker'
import type { deviceListSchema } from '../app/api/devices/types'

/**
 * The endpoints this example serves from their schemas.
 *
 * Keys are written exactly as the App Router reads a path — `[reference]` for a
 * dynamic segment — optionally followed by the query parameters a request must
 * carry. `withMocker()` in `next.config.ts` turns each one into a `beforeFiles`
 * rewrite, so a registered route is intercepted before its own `route.ts` is
 * matched and the route file needs no mock import at all.
 *
 * Paths are relative rather than `@/`-aliased: Next's config loader resolves
 * this file before the tsconfig `paths` map is in play.
 *
 * `GET /api/user/[id]` is missing on purpose — it mocks itself with `withMock`,
 * and a route declared both ways would have its wrapper options silently
 * ignored by the rewrite.
 */
const registry = {
  'GET /api/property/[reference]': {
    schema: () =>
      import('../app/api/property/[reference]/types').then(
        (module) => module.propertySchema,
      ),
  },

  'GET /api/devices?propertyReference=[reference]': {
    schema: () =>
      import('../app/api/devices/types').then(
        (module) => module.deviceListSchema,
      ),
    options: {
      // Fill the nullable fields rather than dropping a third of them: the
      // device table has a column for `lastSeenAt` and an empty one teaches
      // nothing.
      nullishRate: 0,
      overrides: {
        // `statusId` is a plain string in the schema and a closed set in the
        // domain — the UI only has labels for these four.
        'results[].statusId': ({ faker }): string =>
          faker.helpers.arrayElement(['GOOD', 'WARNING', 'FAULT', 'OFFLINE']),
        // Keep installation dates inside the window the chart renders.
        'results[].installedAt': ({ faker }): string =>
          faker.date
            .between({ from: '2024-01-01', to: '2026-01-01' })
            .toISOString(),
      },
      counts: {
        // Two tags per device. `counts` only accepts paths the schema declares
        // as arrays, so a typo here is a compile error rather than silence.
        'results[].tags': 2,
      },
      // The annotation is what makes the editor complete those canonical paths
      // as you type them, and puts a typo's error on the line that carries it.
    } satisfies MockOptions<typeof deviceListSchema>,
  },

  'POST /api/property/[reference]/notes': {
    schema: () =>
      import('../app/api/property/[reference]/notes/types').then(
        (module) => module.noteSchema,
      ),
    // A create answers 201, so the mock does too.
    status: 201,
  },

  // An endpoint nobody has built yet. The front end can be written against the
  // shape today; the ticket reference is what stops the guess outliving its
  // usefulness, because a host drift test asserts a planned key resolves to no
  // `route.ts` and starts failing the day the real one lands.
  'GET /api/property/[reference]/timeline': {
    schema: () =>
      import('./planned/timeline').then((module) => module.timelineSchema),
    planned: 'WP-101',
  },
} as const satisfies MockRegistryDraft

/**
 * The table, with every entry's options checked against its *own* schema.
 *
 * Two statements rather than one because the check has to name the table's type
 * and a declaration cannot refer to itself. Contextual types flow down into the
 * literal above; each entry's concrete schema is read back up here.
 */
export const mockRegistry = registry satisfies CheckedMockRegistry<
  typeof registry
>
