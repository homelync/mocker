import type {
  CheckedMockRegistry,
  MockRegistryDraft,
} from '@magicspon/mocker/config'
import type { MockOptions } from '@magicspon/mocker'
import type { deviceListSchema } from '../app/api/devices/types'
import type { timelineSchema } from './planned/timeline'

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
      nullishRate: 0,
      overrides: {
        'results[].statusId': ({ faker }): string =>
          faker.helpers.arrayElement(['GOOD', 'WARNING', 'FAULT', 'OFFLINE']),
        'results[].installedAt': ({ faker }): string =>
          faker.date
            .between({ from: '2024-01-01', to: '2026-01-01' })
            .toISOString(),
      },
      counts: {
        'results[].tags': 2,
      },
    } satisfies MockOptions<typeof deviceListSchema>,
  },

  'POST /api/property/[reference]/notes': {
    schema: () =>
      import('../app/api/property/[reference]/notes/types').then(
        (module) => module.noteSchema,
      ),
    status: 201,
  },

  'GET /api/property/[reference]/timeline': {
    schema: () =>
      import('./planned/timeline').then((module) => module.timelineSchema),
    planned: 'WP-101',
    options: {
      rules: [
        {
          name: 'timeline-occurred-at',
          match: /^occurredAt$/,
          types: ['string'],
          gen: ({ faker }): string =>
            faker.date
              .between({
                from: '2021-01-01T00:00:00Z',
                to: '2026-06-01T00:00:00Z',
              })
              .toISOString(),
        },
        {
          name: 'timeline-actor',
          match: /^actor$/,
          types: ['string'],
          gen: ({ faker }): string => faker.word.noun(),
        },
      ],
    } satisfies MockOptions<typeof timelineSchema>,
  },
} as const satisfies MockRegistryDraft

export const mockRegistry = registry satisfies CheckedMockRegistry<
  typeof registry
>
