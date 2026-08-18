import { mockerHandler } from '@magicspon/mocker-storybook'
import preview from '#.storybook/preview'
import { mockRegistry } from '../mocks/registry'
import { DeviceTable } from './DeviceTable'

/**
 * Every state of a fetching component, and not one fixture between them.
 *
 * The preview already answers `GET /api/devices` from the registry, so
 * {@link Default} needs nothing at all. The rest override that one endpoint for
 * the length of one story — `msw.use` gives a story's handlers precedence — and
 * everything else the page might request still answers from the table.
 */

const DEVICES = 'GET /api/devices?propertyReference=[reference]'

const meta = preview.meta({
  component: DeviceTable,
  args: { reference: 'ABC123' },
})

/** Whatever the registry generates for this request. Stable across reloads. */
export const Default = meta.story({})

/** A short table: enough rows to read, few enough to screenshot. */
export const FewDevices = meta.story({
  beforeEach({ msw }) {
    msw.use(mockerHandler(mockRegistry, DEVICES, { count: 3 }))
  },
})

/** The empty state, which is otherwise the hardest one to reach on purpose. */
export const NoDevices = meta.story({
  beforeEach({ msw }) {
    msw.use(mockerHandler(mockRegistry, DEVICES, { count: 0 }))
  },
})

/** Held long enough to look at. The component is not modified to get here. */
export const Loading = meta.story({
  beforeEach({ msw }) {
    msw.use(mockerHandler(mockRegistry, DEVICES, { delayMs: 60_000 }))
  },
})

/** The error branch, without breaking anything to reach it. */
export const ServerError = meta.story({
  beforeEach({ msw }) {
    msw.use(mockerHandler(mockRegistry, DEVICES, { status: 500 }))
  },
})

/**
 * One field pinned, the rest still generated.
 *
 * The override path is checked against *this entry's* schema, so
 * `results[].statusId` is a completion rather than a guess — and a field the
 * schema does not declare fails to compile here, on the line that carries it.
 */
export const AllOffline = meta.story({
  beforeEach({ msw }) {
    msw.use(
      mockerHandler(mockRegistry, DEVICES, {
        count: 4,
        generate: { overrides: { 'results[].statusId': () => 'OFFLINE' } },
      }),
    )
  },
})

/**
 * The same request, different data.
 *
 * Generation is seeded from the request, so two stories of one endpoint would
 * otherwise be indistinguishable. A seed is the only thing that separates them.
 */
export const AnotherProperty = meta.story({
  args: { reference: 'ZZ9000' },
  beforeEach({ msw }) {
    msw.use(
      mockerHandler(mockRegistry, DEVICES, {
        seed: 'another-property',
        fixed: true,
      }),
    )
  },
})

/**
 * Answered from a file, so the data can be edited rather than only generated.
 *
 * The first run writes `mocks/GET/api/devices/<hash>.json` from whatever the
 * generator produced; every run after it serves that file. Open it, change a
 * device to the one the story is actually about, commit it, and everybody sees
 * the same table.
 *
 * Not the same thing as the `overrides` in {@link AllOffline}, which pins one
 * field and leaves the rest generated. This freezes the whole response.
 *
 * The name is derived from the request — method, path, query and the controls
 * above — so it is the same on every machine and does not move when the registry
 * key is renamed. Editing the file into something the schema rejects is a 500
 * naming the file, rather than a component that renders the wrong thing.
 *
 * Needs `mockerFixtures()` in `.storybook/main.ts`; without it the console says
 * so once and the story generates as usual.
 */
export const Fixed = meta.story({
  beforeEach({ msw }) {
    msw.use(mockerHandler(mockRegistry, DEVICES, { count: 3, fixed: true }))
  },
})
