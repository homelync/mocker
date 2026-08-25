import { test as base } from '@playwright/test'
import { mockerTest } from '@homelync/mocker-playwright'
import { mockRegistry } from '../src/mocks/registry'

/**
 * The whole of the wiring a consumer writes.
 *
 * One `extend`, and every test in the suite is mocked — the `mocker` fixture is
 * `auto`, so a test that never mentions it still gets the registry, and still
 * fails if it fetched something nobody declared.
 */
export const test = base.extend(mockerTest({ registry: mockRegistry }))

export { expect } from '@playwright/test'
