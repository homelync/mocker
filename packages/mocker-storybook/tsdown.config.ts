import { defineConfig } from 'tsdown'

/**
 * Two entries, and the split is the same kind the other packages make — a
 * runtime boundary, not a convenience.
 *
 * `index` is loaded into the Storybook preview, which is a browser: no
 * filesystem, no `process`. `vite` is loaded by `.storybook/main.ts`, which is
 * node and nothing else. `vite.ts` therefore imports `node:fs/promises` and must
 * never be reachable from `index.ts`; `package-boundary.test.ts` asserts it, in
 * both directions.
 *
 * There is still no `./config` sibling and no production stub: a Storybook
 * preview *is* the mock, so there is no build a mock must be absent from. What
 * the other two packages spend an entry defending, this one does not have.
 *
 * `platform: 'neutral'` matters more here than anywhere else — a node builtin
 * sneaking into the preview bundle would fail at preview load rather than at
 * build — so `node:` specifiers are externalised explicitly rather than by the
 * platform default, which neutral does not supply.
 */
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    vite: 'src/vite.ts',
  },
  format: 'esm',
  platform: 'neutral',
  target: 'node20',
  dts: { oxc: true },
  clean: true,
  treeshake: true,
  external: [/^msw/, /^zod/, /^@homelync\/mocker/, /^node:/, /^vite$/],
})
