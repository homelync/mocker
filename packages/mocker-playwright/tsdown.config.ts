import { defineConfig } from 'tsdown'

/**
 * One entry, and the absence of the others is the point.
 *
 * The sibling packages spend an entry each on a boundary this one does not
 * have. There is no `./config`, because nothing here is loaded by a bundler's
 * unbundled config loader; no production stub, because a Playwright run *is* the
 * mock, so there is no build a mock must be absent from; and no `./vite`-style
 * split, because Playwright is node from top to bottom — the fixture store is
 * `readFile` and `rename` in this very process, not a plugin on someone else's
 * dev server.
 *
 * `platform: 'neutral'` like every other package here, with `node:` specifiers
 * externalised explicitly rather than by the platform default. `'node'` would be
 * truthful — nothing here is ever bundled into a browser — but it also changes
 * the emitted extension to `.mjs`, and the `publishConfig.exports` map that
 * nothing in CI executes is the last place to want a filename that differs from
 * its three siblings for no reason a reader can see.
 *
 * Playwright is externalised and also never imported at runtime — every
 * reference to it is `import type`, which `package-boundary.test.ts` asserts. It
 * appears here so that a slip shows up as an unexpected external rather than as
 * a copy of Playwright inlined into the bundle.
 */
export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: 'esm',
  platform: 'neutral',
  target: 'node20',
  dts: { oxc: true },
  clean: true,
  treeshake: true,
  external: [
    /^@homelync\/mocker/,
    /^zod/,
    /^node:/,
    /^playwright/,
    /^@playwright/,
  ],
})
