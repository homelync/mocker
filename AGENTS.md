# mocker

A pnpm monorepo publishing four packages: a library that generates fake data from zod schemas and
serves it over HTTP, and three adapters over it — Next.js App Router, Storybook via MSW, and
Playwright via `context.route`.

| Package                        | Directory                    | Entries                           |
| ------------------------------ | ---------------------------- | --------------------------------- |
| `@magicspon/mocker`            | `packages/mocker`            | `.` · `./core` · `./config`       |
| `@magicspon/mocker-next`       | `packages/mocker-next`       | `.` · `./config` · `./production` |
| `@magicspon/mocker-storybook`  | `packages/mocker-storybook`  | `.` · `./vite`                    |
| `@magicspon/mocker-playwright` | `packages/mocker-playwright` | `.`                               |

## The constraint everything else follows from

A bundler config file — `next.config.ts` above all — is evaluated by the framework's own loader,
**unbundled**, before any build graph exists. Tree-shaking cannot protect it.

So each package has a `./config` entry, and **nothing reachable from it at runtime may import `zod`
or `@faker-js/faker`**. Break that and faker loads on every `next dev` and can be emitted into a
production build that must not contain it — silently, with no error anywhere.

Three things enforce it, and none of them is a comment:

- `packages/mocker/src/package-boundary.test.ts` walks the real import graph from `config.ts`,
  following runtime edges only (`import type` is erased, so it is not followed).
- `packages/mocker-next/src/package-boundary.test.ts` proves the adapter's config chain reaches
  nothing but `@magicspon/mocker/config`. Composed with the above, that is the whole guarantee.
- The same file asserts `index.prod.ts` exports exactly what `index.ts` exports. The production stub
  is swapped in by **resolution**, not by a flag, so a drifted export is a consumer's build error and
  nobody else's.

These were eslint zones in the project this code came from. They did not survive extraction — which
is the argument for keeping them as tests. A test travels with the code it constrains.

`core/` carries a second boundary: it may import `zod` and `@faker-js/faker` and nothing else, and
may not reach `registry/`, `flag.ts` or `log.ts`. It must stay usable as a plain fixture factory in a
runtime with no `process` and no console.

`mocker-storybook` has no `./config` entry and no production stub, because that constraint does not
reach it: a preview _is_ the mock, so there is no build a mock must be absent from. It has a
different split instead, and `packages/mocker-storybook/src/package-boundary.test.ts` carries three
claims about it, all of which fail silently if broken:

- **Nothing reachable from `index.ts` may import a node builtin, and it may not reach `vite.ts`.**
  Storybook bundles `index.ts` into the preview. Vite resolves a `node:` import happily and the
  preview dies on load, in a consumer's app.
- **Nothing reachable from `vite.ts` may import anything but node and Vite.** This is the fixture
  store for `{ fixed: true }` (below), and `.storybook/main.ts` imports it unbundled — the same
  position `next.config.ts` is in. Reaching `@magicspon/mocker` from there loads zod and faker on
  every `storybook dev`.
- **Nothing in the package may import `storybook` — tests included.** These are plain MSW handlers,
  which is what lets the same call answer a Vitest browser test, and what keeps the package building
  when Storybook's addon API moves. The loader reads `{ id }` structurally rather than importing
  `StoryContext` for exactly this reason; a test that imported it would make adopting the coupling in
  `src/` look harmless.

`mocker-playwright` has one entry and no split at all, because Playwright is node from top to
bottom: no config file is evaluated unbundled, no preview needs a browser bundle, and the fixture
store is `readFile` and `rename` in the test process. `packages/mocker-playwright/src/package-boundary.test.ts`
carries the one claim that is left, and it is the analogue of the no-`storybook` rule:

- **Nothing in the package may import Playwright at a runtime edge — tests included.** Every
  reference is `import type`, which is what keeps both peers optional. A single runtime
  `import { test } from "@playwright/test"` in the imperative core gives anyone driving
  `playwright-core` from a script either a resolution failure or a second copy of Playwright's
  fixture registry, where the fixtures register against one copy and the runner reads the other —
  nothing throws and no mock is installed. The unit tests drive a stub `{ route, request }` instead,
  which is also what keeps them running in plain Vitest with no browser.

### Fixed responses (`fixed: true`)

`mockerHandlers(registry, { fixed: true })` answers from a JSON file instead of generating per
request, writing the file from the generated data the first time it is asked for. Generation is
already deterministic, so this is not about stability — it is about being able to **edit** the
answer, and to commit it.

Note the vocabulary: `overrides` **pins a field** and is the older meaning of "pin" throughout this
repo and the guide. `fixed` freezes the **whole response**, as a file. Keep the two words apart.

That is the only feature in the repo that needs a filesystem, and a preview is a browser, so in
Storybook it is split across the two entries: `fixed.ts` decides policy in the preview, `vite.ts` is
a dumb byte store mounted on Storybook's dev server at `/__mocker/fixture`, and `route.ts` — which
imports nothing at all — is the one constant they share. Sharing it through either side would breach
one of the boundaries above. Under Playwright the same split collapses into
`mocker-playwright/src/store.ts`, because a test process has the disk in its own hands.

**The two adapters answer a missing fixture differently, and the asymmetry is the point.** Storybook
writes one and carries on; Playwright writes one and **fails the test**, the same call
`toMatchSnapshot` makes about a missing baseline. A story is looked at, so plausible data is enough;
a test asserts, and a fixture CI generated inside a container and threw away is a test asserting on
faker output with nothing saying so. `fixed` defaults to `false` there and `true` here for the same
reason.

Three decisions worth not re-litigating:

- **The filename is derived, never declared** (`packages/mocker/src/core/fixture.ts`):
  `GET/api/devices/<hash>.json`, from method, path, sorted query and the story's
  `seed`/`count`/`status`. A mirrored tree because the directory listing is the interface; a hashed
  leaf because a query string is not a filename. Not the registry key — renaming a key must not
  orphan the file it holds. It lives in `core/` alongside `serializeFixture`, the two-space
  formatter, because the Playwright adapter writes the same store: two copies of either would churn
  a diff or split one request across two files.
- **A fixture that fails its schema is a 500 naming the file.** Regenerating would destroy the edit
  that was the point; serving it unchecked moves the failure into the component. Same call
  `handle()` makes about generated output.
- **A missing plugin costs you fixtures, not Storybook.** One console warning, then generate as
  usual — which is also what a statically-built preview gets, since it has no server to ask.

## Commands

Package manager is **pnpm**. Run these from the repo root.

| Task                | Command           |
| ------------------- | ----------------- |
| Build every package | `pnpm build`      |
| Test (whole repo)   | `pnpm test`       |
| Test in watch mode  | `pnpm test:watch` |
| Typecheck           | `pnpm typecheck`  |
| Lint                | `pnpm lint`       |
| Format + autofix    | `pnpm format`     |
| Check formatting    | `pnpm check`      |
| Storybook example   | `pnpm storybook`  |
| E2E (Playwright)    | `pnpm e2e`        |

`pnpm test` needs **no build**: the workspace `exports` point at `src/*.ts` during development, and
`publishConfig.exports` swaps in `dist/*.js` at publish time. Keep the two maps in step — nothing in
CI executes the published one.

`pnpm typecheck` is two passes. The root tsconfig checks only tooling files; each package checks its
own `src/`, because the constraint that matters there (`isolatedDeclarations`) exists for declaration
emit and nothing at the root is ever emitted.

`packages/mocker-storybook` carries its own `vitest.config.ts`, which the root config's `projects`
glob picks up. It exists for one line in `vitest.setup.ts`: MSW resolves a relative handler path
against `location.href`, and Node has none — without a stubbed `location` every handler matches
nothing and the whole suite passes by falling through.

`pnpm e2e` is **not** part of `pnpm test`: it needs a browser binary and a running app, and it is
the only thing in the repo that does. It drives `apps/e2e` — one HTML file and a `node:http` server,
deliberately not `apps/next`, which makes no client-side requests at all and would intercept
nothing. Its `tests/mocks/` directory is committed, and must be: the suite asserts on those bytes,
and a missing fixture fails the run by design. CI installs Chromium and runs it after `Build`.

## Communication

Always respond to the user in plain language using ISO 24495-1:2023

## Conventions

- **`isolatedDeclarations` is on.** tsdown emits `.d.ts` with oxc rather than a typechecker, which is
  only correct while every exported signature is explicitly annotated. That is why an exported
  `const` carries a type annotation that looks redundant — `typescript/no-inferrable-types` is off
  for exactly this reason.
- **`noUncheckedIndexedAccess` is on.** Guards like `const [, target] = key.split(" "); if (target
=== undefined)` are correct at runtime and invisible to the typechecker without it — and the
  type-aware lint would have us delete the check that makes a malformed registry key throw.
- **ESM only.** Both packages are `"type": "module"` and ship no CJS. `zod` is a peer dependency
  because users pass their own schemas in and a second copy breaks `_zod.def` reads.
- **TypeScript is strict** — `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`,
  `verbatimModuleSyntax`, `erasableSyntaxOnly`. Never cast where a narrowing will do.
- **Formatting** is Oxfmt, then `oxlint --fix`. Run `pnpm format` before committing.
- Try to keep files **under 200 lines** of code (excluding comments).

## Releasing

Changesets, with the two packages `linked` — they bump together, so a consumer never has to work out
which adapter version pairs with which library version. `access` is `public`; both are scoped.

CI (`.github/workflows/ci.yaml`) runs lint → typecheck → test → build on every PR.
`release.yaml` builds and runs `changeset publish` on pushes to `main`.

**Known gap:** nothing in CI exercises the `publishConfig.exports` map, so a broken published exports
map would first be noticed by a consumer. `publint` and `@arethetypeswrong/cli` on a packed tarball
would close it.

### Renovate changesets

`pnpm update --changeset` writes a changeset for the bumps **its own run** makes. Renovate never
makes such a run — it rewrites the range in `package.json` itself and then refreshes the lockfile. So
as a post-upgrade task the flag always fired with nothing left to do and reported "No changeset was
generated", including for the `@faker-js/faker` and `zod` bumps that a consumer does install.

`scripts/renovate-changeset.mjs` supplies what Renovate's update leaves implicit — whether the change
is releasable, and which package owns it — then calls `pnpm change` to do the writing, so the
changesets format stays pnpm's problem rather than ours. It records a patch intent only when the
moved dep is a `dependencies` or `peerDependencies` entry of a published package; devDeps, the root
manifest, `apps/next` and github-actions are invisible to consumers and get nothing.

Two constraints on that script, both easy to break:

- It runs in the Renovate container, which has **no `node_modules`** — so no `@changesets/cli`, and
  nothing outside the standard library. `pnpm change` is safe there because it is native to pnpm
  (v11.13.0+) rather than a bin; it has been verified against a workspace with no install.
- Its command is allowlisted by `RENOVATE_ALLOWED_COMMANDS` in `renovate.yaml`, matched _after_
  template expansion, so the command and the allowlist must change together. The allowlist governs
  only what Renovate itself launches, not the `pnpm` the script spawns.

### Linking into a consumer

| Task                       | Command                   |
| -------------------------- | ------------------------- |
| Build + publish to yalc    | `pnpm publish:local`      |
| …and update every consumer | `pnpm publish:local:push` |

`scripts/yalc-publish.mjs` packs with `pnpm pack` and hands yalc the unpacked tarball rather than
calling `yalc publish` directly. Two reasons, and both failures are silent:

- yalc copies the working-tree `package.json` verbatim and does **not** apply `publishConfig`, so the
  store would get `exports` pointing at `./src/*.ts` while `files` ships only `dist`.
- `@magicspon/mocker-next` depends on `@magicspon/mocker` as `workspace:^`, which npm cannot resolve.

`pnpm pack` performs exactly the two rewrites that publishing performs, so what lands in the store is
what a consumer would get from the registry. That also narrows the gap above: a broken exports map
now breaks the local link, which someone notices.

The consumer must yalc-add **both** packages — the adapter's dependency becomes a real `^0.1.0`
range, satisfied by the top-level link rather than by the registry.

## graphify

This project has a knowledge graph at `graphify-out/`.

- For codebase questions, first run `graphify query "<question>"` when `graphify-out/graph.json`
  exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for
  focused concepts.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review.
- After modifying code, run `graphify update .` (AST-only, no API cost). Doc, image and config
  changes need `/graphify . --update`.
- Graph outputs are derived artifacts. Never hand-edit anything in `graphify-out/`.

## fallow

Static analysis for dead code, duplication, complexity and dependency hygiene. Config is
`.fallowrc.jsonc`, whose `entry` list is every published entry point — anything unreachable from one
of those is genuinely dead.

- After modifying code, run `fallow audit --format json --quiet --base main || true`.
- Append `|| true` to every fallow command: exit 1 means "issues found", only exit 2 is a real error.
- Before deleting anything fallow reports as unused, confirm with `fallow dead-code --trace
FILE:EXPORT`. Fallow is syntactic; an export can be imported-but-unreferenced and a dependency can be
  loaded by config rather than by import.

## Comments

- Always comment your code (unless it's very obvious).
- Explain **why**, not what. Keep comments _short_ and _consise_.
- `// TODO(WP-xxx):` for known incomplete work.
- JSDoc on all exported functions and types.
- Keep comments short; a single paragraph is usually enough.
