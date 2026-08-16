# mocker

A pnpm monorepo publishing two packages: a library that generates fake data from zod schemas and
serves it over HTTP, and a Next.js App Router adapter for it.

| Package                  | Directory              | Entries                           |
| ------------------------ | ---------------------- | --------------------------------- |
| `@magicspon/mocker`      | `packages/mocker`      | `.` · `./core` · `./config`       |
| `@magicspon/mocker-next` | `packages/mocker-next` | `.` · `./config` · `./production` |

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

## Commands

Package manager is **pnpm**. Run these from the repo root.

| Task                | Command           |
| ------------------- | ----------------- |
| Build both packages | `pnpm build`      |
| Test (whole repo)   | `pnpm test`       |
| Test in watch mode  | `pnpm test:watch` |
| Typecheck           | `pnpm typecheck`  |
| Lint                | `pnpm lint`       |
| Format + autofix    | `pnpm format`     |
| Check formatting    | `pnpm check`      |

`pnpm test` needs **no build**: the workspace `exports` point at `src/*.ts` during development, and
`publishConfig.exports` swaps in `dist/*.js` at publish time. Keep the two maps in step — nothing in
CI executes the published one.

`pnpm typecheck` is two passes. The root tsconfig checks only tooling files; each package checks its
own `src/`, because the constraint that matters there (`isolatedDeclarations`) exists for declaration
emit and nothing at the root is ever emitted.

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
- Explain **why**, not what. The code shows what.
- `// TODO(WP-xxx):` for known incomplete work.
- JSDoc on all exported functions and types.
- Keep comments short; a single paragraph is usually enough.
