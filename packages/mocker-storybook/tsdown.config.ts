import { defineConfig } from 'tsdown'

/**
 * One entry, because this package has one job.
 *
 * There is no `./config` sibling here and no production stub: a Storybook
 * preview *is* the mock, so there is no build a mock must be absent from, and
 * `.storybook/main.ts` never needs to import this package at all. What the
 * other two packages spend entries defending, this one simply does not have.
 *
 * `platform: 'neutral'` matters more here than anywhere else — the output is
 * loaded into a browser by Storybook's bundler, so a node builtin sneaking in
 * would fail at preview load rather than at build. `package-boundary.test.ts`
 * asserts none can.
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
  external: [/^msw/, /^zod/, /^@magicspon\/mocker/],
})
