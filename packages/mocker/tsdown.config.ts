import { defineConfig } from 'tsdown'

/**
 * Three entries, because the split is a guarantee rather than a convenience.
 *
 * `config` must never acquire a runtime path to `zod` or `@faker-js/faker` —
 * see `src/config.ts`. Emitting it as its own entry is what makes that
 * guarantee observable: if the rule is ever broken, the import appears in
 * `dist/config.js`, and `package-boundary.test.ts` fails before it gets there.
 *
 * Declarations come from oxc's isolated-declarations transform, not the
 * typechecker. It is fast, and it holds because the source is already
 * `isolatedDeclarations`-clean — a constraint the tsconfig now enforces.
 */
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core/index.ts',
    config: 'src/config.ts',
  },
  format: 'esm',
  platform: 'neutral',
  target: 'node20',
  dts: { oxc: true },
  clean: true,
  treeshake: true,
  // Nothing is bundled in: `zod` is a peer (a second copy breaks `_zod.def`
  // reads on a user's schema) and faker is a dependency the consumer installs.
  external: [/^zod/, /^@faker-js\/faker/],
})
