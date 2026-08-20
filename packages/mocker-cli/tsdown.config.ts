import { defineConfig } from 'tsdown'

/**
 * Two entries, and they are not two halves of a boundary.
 *
 * The sibling packages spend an entry each on a rule about what may be *loaded*
 * — `./config` must not reach zod or faker, `./production` must contain no
 * generator. Nothing like that applies here: this package is a command, run
 * deliberately, on a developer's machine or in CI, and it is welcome to load
 * anything. `cli.ts` is the executable and `index.ts` the same work as a
 * function, for anyone who would rather call it from a script than shell out.
 *
 * `platform: 'neutral'` like every other package here, with `node:` specifiers
 * externalised explicitly. `'node'` would be truthful — this one really is
 * node-only — but it also changes the emitted extension to `.mjs`, and the
 * `bin` field would then have to name a file that differs from its siblings for
 * no reason a reader can see.
 *
 * The shebang on `cli.ts` survives into `dist/cli.js`; `bin` depends on it, and
 * `cli.test.ts` executes the built file to prove it.
 */
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: 'esm',
  platform: 'neutral',
  target: 'node20',
  dts: { oxc: true },
  clean: true,
  treeshake: true,
  external: [/^@magicspon\/mocker/, /^@faker-js\/faker/, /^zod/, /^node:/],
})
