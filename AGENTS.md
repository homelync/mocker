# mocker

A Cli for generating fake data based on zod schemas and a mocker server for handling http respones

## graphify

This project has a knowledge graph at `graphify-out/` with god nodes, community structure, and
cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when `graphify-out/graph.json`
  exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for
  focused concepts. These return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md` or
  raw grep output.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review, or when
  query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- Doc, image, and config changes are not picked up by `graphify update`. Run `/graphify . --update`
  for those — it re-runs semantic extraction on changed non-code files.
- Graph outputs are derived artifacts. Never hand-edit anything in `graphify-out/`.

## fallow

Static analysis for dead code, duplication, complexity, and dependency hygiene. Config lives in
`.fallowrc.jsonc`.

Rules:

- **After modifying code, run `fallow audit --format json --quiet --base main`.** It scopes
  dead-code, complexity, and duplication checks to the changed files and returns a pass/warn/fail
  verdict, so it is the cheap post-change gate. Run the full `fallow` only for a whole-project
  audit.
- Append `|| true` to every fallow command. Exit code 1 means "issues found", not a failure; only
  exit 2 is a real error.
- Before deleting anything fallow reports as unused, confirm it with `fallow dead-code --trace
FILE:EXPORT`, `--trace-file PATH`, or `--trace-dependency PKG`. Fallow is syntactic, so an export
  can be imported-but-unreferenced and a dependency can be loaded by config rather than by import.
- Known false positives are suppressed in `.fallowrc.jsonc`. Add to `ignoreDependencies` rather
  than deleting a package fallow cannot see: oxlint loads `@stylistic/eslint-plugin` and
  `eslint-plugin-storybook` through `jsPlugins` in `.oxlintrc.json`, and `vite.config.ts` is
  misread as a test file because it carries the Vitest `test:` block.
- CI runs the same gate on every PR into `main` (`.github/workflows/fallow.yml`), using
  `--gate new-only` so only findings the PR _introduces_ fail the build. Pre-existing findings are
  reported in the job summary but do not block. The fallow version there is pinned — bump it
  deliberately.

## Commands

Package manager is **pnpm**.

| Task                   | Command                |
| ---------------------- | ---------------------- |
| Dev server (port 3000) | `pnpm dev`             |
| Production build       | `pnpm build`           |
| Preview build          | `pnpm preview`         |
| Regenerate route tree  | `pnpm generate-routes` |
| Lint                   | `pnpm lint`            |
| Format + autofix       | `pnpm format`          |
| Check formatting only  | `pnpm check`           |
| Storybook (port 6006)  | `pnpm storybook`       |
| Build Storybook        | `pnpm build-storybook` |

There is no `test` script. Vitest is configured in `vite.config.ts` as a single `storybook`
project that runs stories in headless Chromium via Playwright — invoke it with `pnpm exec vitest`.

## Conventions

- **`src/routeTree.gen.ts` is generated.** Never edit it by hand; it is marked read-only in
  `.vscode/settings.json`. Regenerate with `pnpm generate-routes` after adding or renaming routes.
- **Import alias:** prefer `#/*` (→ `./src/*`). It is declared in both `package.json` `imports` and
  `tsconfig.json` `paths`, so it resolves at runtime and in TS. `@/*` is also mapped in tsconfig
  but is not a package subpath import — use `#/*` for new code.
- **Devtools Vite plugin must be first.** `devtools()` leads the `plugins` array in
  `vite.config.ts`; source inspection and console piping break if it is reordered.
- **Isomorphic by default.** Code runs on both server and client unless it is wrapped in a boundary
  (`createServerFn`, `createServerOnlyFn`, `createClientOnlyFn`, `createIsomorphicFn`). Assume any
  module you touch may execute in both environments.
- **Environment variables** go through `src/env.ts` (`@t3-oss/env-core` + Zod). Do not read
  `process.env` or `import.meta.env` directly; add the variable to the schema and import `env`
  instead. Note: `src/env.ts` is currently scaffolded but imported nowhere — the first consumer
  should wire it in rather than reaching for `import.meta.env`. Client-side vars need the `VITE_`
  prefix.
- **Router context** is typed as `MyRouterContext` in `src/routes/__root.tsx` and carries the
  `queryClient`. Query/Router SSR wiring lives in `src/router.tsx` and
  `src/integrations/tanstack-query/root-provider.tsx`.
- **TypeScript is strict**, with `noUnusedLocals`, `noUnusedParameters`,
  `noFallthroughCasesInSwitch`, and `verbatimModuleSyntax` all on. Follow TanStack Router's full
  type-inference philosophy: never cast, never annotate values the router already infers.
- **Formatting** is Oxfmt, then `oxlint --fix`. Run `pnpm format` before committing.
- Try to keep files **under 200 lines** of code (excluding comments).
- **Try/Catch** prefer `attempt` or `attemptAsync` from `es-toolkit`
- **hook** check `usehooks-ts` before writing custom hooks

When working on UI components, always use the `playground-storybook-mcp` MCP tools to access Storybook's component and documentation knowledge before answering or taking any action.

- **CRITICAL: Never hallucinate component properties!** Before using ANY property on a component from a design system (including common-sounding ones like `shadow`, etc.), you MUST use the MCP tools to check if the property is actually documented for that component.
- Query `list-all-documentation` to get a list of all components
- Query `get-documentation` for that component to see all available properties and examples
- Only use properties that are explicitly documented or shown in example stories
- If a property isn't documented, do not assume properties based on naming conventions or common patterns from other libraries. Check back with the user in these cases.
- Use the `get-storybook-story-instructions` tool to fetch the latest instructions for creating or updating stories. This will ensure you follow current conventions and recommendations.
- Check your work by running `run-story-tests`.

Remember: A story name might not reflect the property name correctly, so always verify properties through documentation or example stories before using them.

## Layout

```
src/
  env.ts                              # validated env schema (currently unused)
  styles.css                          # Tailwind entry, imported by __root.tsx
  router.tsx                          # getRouter(), Register declaration, SSR/Query integration
  routeTree.gen.ts                    # GENERATED
  routes/
    __root.tsx                        # root route, MyRouterContext, RootDocument shell
    index.tsx                         # /
  integrations/tanstack-query/
    root-provider.tsx                 # getContext()
    devtools.tsx                      # Query devtools plugin
  stories/                            # Storybook examples (Button, Header, Page)
.storybook/                           # main.ts, preview.tsx
```

## Comments

- Always comment your code (unless it's very obvious).
- Explain **why**, not what. The code shows what.
- Reference requirement IDs: `// (FR-012)` `// (NFR-003)`
- `// TODO(WP-xxx):` for known incomplete work
- JSDoc on all exported functions and types
- Try to keep comments as short as possible, a single paragraph should be enough
