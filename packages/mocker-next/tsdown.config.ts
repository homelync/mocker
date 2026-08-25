import { defineConfig } from 'tsdown'

/**
 * Three entries: the runtime adapter, the config surface, and the production
 * stub the adapter is aliased to.
 *
 * `index.prod` is emitted as a real entry so `withMocker()` can alias to the
 * package specifier `@homelync/mocker-next/production` rather than a path
 * inside a consumer's `node_modules` — the path then lives in this repo, where
 * it can be kept correct, instead of in every consumer's `next.config.ts`.
 */
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    config: 'src/config.ts',
    'index.prod': 'src/index.prod.ts',
  },
  format: 'esm',
  platform: 'neutral',
  target: 'node20',
  dts: { oxc: true },
  clean: true,
  treeshake: true,
  external: [/^next/, /^zod/, /^@homelync\/mocker/],
})
