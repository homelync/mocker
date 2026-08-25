import { defineMain } from '@storybook/react-vite/node'
import { mockerFixtures } from '@homelync/mocker-storybook/vite'

/**
 * Interception is still entirely the preview's business. This file knows about
 * exactly one thing the preview cannot do for itself: reach a disk.
 *
 * `mockerFixtures` is the store behind `{ fixed: true }` — a directory of JSON
 * served over Storybook's own dev server, because a preview is a browser and has
 * no filesystem. It is the *only* reason this file imports the adapter, and it
 * imports the `/vite` entry rather than the package root so that doing so costs
 * nothing: nothing reachable from there loads zod or faker, which is the same
 * discipline `next.config.ts` and the `/config` entry exist to enforce next
 * door.
 *
 * `staticDirs` is not optional: MSW intercepts from a service worker, and the
 * worker script has to be served from the preview's own origin.
 */
export default defineMain({
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['msw-storybook-addon'],
  staticDirs: ['../public'],
  viteFinal: (config) => ({
    ...config,
    plugins: [...(config.plugins ?? []), mockerFixtures()],
  }),
})
