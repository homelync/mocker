import type {
  CheckedMockRegistry,
  MockOptions,
  MockRegistryDraft,
} from '@homelync/mocker'
import type { deviceListSchema } from '../api/devices'

/**
 * The endpoints the preview answers, written exactly as the Next example writes
 * them.
 *
 * That is the point worth noticing: this is the same table, in the same dialect,
 * with the same lazy schema thunks. `mockerHandlers()` turns it into MSW
 * handlers for Storybook; `withMocker()` in a `next.config.ts` turns it into
 * rewrites for the dev server. A component sees identical bytes either way,
 * because both end in the same `handle()`.
 *
 * The thunks stay lazy here for a reason that no longer applies — nothing in a
 * preview is protected from loading zod — but keeping the shape identical means
 * a table can be lifted from one app to the other without editing it.
 */
const registry = {
  'GET /api/property/[reference]': {
    schema: () =>
      import('../api/property').then((module) => module.propertySchema),
  },

  'GET /api/devices?propertyReference=[reference]': {
    schema: () =>
      import('../api/devices').then((module) => module.deviceListSchema),
    options: {
      // Fill the nullable fields rather than dropping a third of them: the
      // table has a column for `lastSeenAt` and an empty one teaches nothing.
      nullishRate: 0,
      overrides: {
        // `statusId` is a plain string in the schema and a closed set in the
        // domain — the table only has labels for these four.
        'results[].statusId': ({ faker }): string =>
          faker.helpers.arrayElement(['GOOD', 'WARNING', 'FAULT', 'OFFLINE']),
        'results[].installedAt': ({ faker }): string =>
          faker.date
            .between({ from: '2024-01-01', to: '2026-01-01' })
            .toISOString(),
      },
      // The annotation is what makes the editor complete those canonical paths
      // as you type them, and puts a typo's error on the line that carries it.
    } satisfies MockOptions<typeof deviceListSchema>,
  },
} as const satisfies MockRegistryDraft

/**
 * The table, with every entry's options checked against its *own* schema.
 *
 * Two statements rather than one because the check has to name the table's type
 * and a declaration cannot refer to itself.
 */
export const mockRegistry = registry satisfies CheckedMockRegistry<
  typeof registry
>
