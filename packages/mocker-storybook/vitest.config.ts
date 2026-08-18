import { defineConfig } from 'vitest/config'

/**
 * This package's own project config, for the reason the root config anticipated:
 * it needs an environment the others do not.
 *
 * See `vitest.setup.ts` — MSW cannot match a relative path without an origin,
 * and these handlers are the only code in the repo that runs in a browser by
 * design rather than by accident.
 */
export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
  },
})
