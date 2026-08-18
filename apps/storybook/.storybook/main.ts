import { defineMain } from '@storybook/react-vite/node'

/**
 * Nothing here knows about the mock.
 *
 * Worth stating, because the Next example's config is the opposite: there,
 * `next.config.ts` has to import the adapter to install rewrites, and the whole
 * `/config` entry exists so that import cannot drag faker in. Storybook needs no
 * such thing — interception happens in the preview, at runtime, so this file
 * registers the MSW addon and nothing else.
 *
 * `staticDirs` is not optional: MSW intercepts from a service worker, and the
 * worker script has to be served from the preview's own origin.
 */
export default defineMain({
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['msw-storybook-addon'],
  staticDirs: ['../public'],
})
