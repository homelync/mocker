import { definePreview } from '@storybook/react-vite'
import addonMsw from 'msw-storybook-addon'
import { mockerHandlers } from '@magicspon/mocker-storybook'
import { mockRegistry } from '../src/mocks/registry'

/**
 * Every registered endpoint, answered for every story.
 *
 * This is the whole preview-level setup: one spread. A story that wants an
 * endpoint to behave differently reaches for `mockerHandler` in its own
 * `beforeEach`, which MSW gives precedence over these — see
 * `DeviceTable.stories.tsx`.
 *
 * Handlers rather than a wrapper around `definePreview`: these are plain MSW
 * handlers, so the addon stays the consumer's choice and this file reads the way
 * the addon's own documentation reads.
 */
export default definePreview({
  addons: [addonMsw()],
  beforeEach({ msw }) {
    msw.use(...mockerHandlers(mockRegistry))
  },
})
