# mocker

A pnpm monorepo publishing four packages: a library that generates fake data from zod schemas and
serves it over HTTP, and three adapters over it — Next.js App Router, Storybook via MSW, and
Playwright via `context.route`

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
