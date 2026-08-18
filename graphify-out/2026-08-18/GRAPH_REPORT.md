# Graph Report - mocker  (2026-08-16)

## Corpus Check
- 109 files · ~47,418 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 735 nodes · 1006 edges · 116 communities (34 shown, 82 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8cc7d030`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Schema-Driven Data Generation
- Next.js Adapter and Mock Flag
- Agent Instructions and Toolchain Policy
- Damp CLI Commands and Rendering
- Registry Key Matching
- Root Package Manifest
- Request Handling and Controls
- Husky Git Hooks and Guardrails
- TypeScript Compiler Options
- shadcn/ui Component Config
- CLI Package Manifest
- Next Adapter Manifest
- Mock Package Manifest
- Renovate Update Policy
- Oxlint Rule Configuration
- Changesets Release Config
- Mock Request Logging
- Directory Fuzzy Search
- Oxfmt Formatting Config
- Claude Permission Settings
- es-toolkit Error Handling
- Deprecated Husky Shim
- TanStack Router Config
- Vitest Type Shims
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 40
- applypatch-msg
- commit-msg
- post-applypatch
- post-checkout
- post-commit
- post-merge
- post-rewrite
- pre-applypatch
- pre-auto-gc
- pre-commit
- pre-merge-commit
- pre-push
- pre-rebase
- prepare-commit-msg
- GitHub Changelog Generator (magicspon/playground)
- Internal Dependency Patch Bumping
- Restricted Package Access Policy
- Auto-Allowed Tooling Commands
- Confirmation-Gated Destructive Commands
- Hard-Denied Commands and Secret Reads
- Disabled MCP Servers (local override)
- Claude Code Permission Policy
- oxfmt formatting configuration
- Lint ignore patterns for generated artifacts
- oxlint jsPlugins (@stylistic/eslint-plugin, eslint-plugin-storybook)
- Type-aware oxlint rule set
- AGENTS.md project agent instructions
- Comment the why, with requirement IDs and JSDoc
- Env vars via src/env.ts schema only
- fallow static-analysis change gate
- routeTree.gen.ts is generated and read-only
- graphify knowledge-graph workflow
- Isomorphic-by-default execution convention
- mocker: zod-driven fake data CLI plus mock HTTP server
- Storybook MCP property-verification rule
- CLAUDE.md delegating to AGENTS.md
- applypatch-msg Hook Shim
- commit-msg Hook Shim
- HUSKY Environment Bypass Switch
- Husky Hook Dispatcher (h)
- Husky Init Script Sourcing (XDG config)
- node_modules/.bin PATH Injection
- User Hook Delegation to .husky/<name>
- Deprecated husky.sh Shim
- post-applypatch Hook Shim
- post-checkout Hook Shim
- post-commit Hook Shim
- post-merge Hook Shim
- post-rewrite Hook Shim
- pre-applypatch Hook Shim
- pre-auto-gc Hook Shim
- pre-commit Hook Shim
- pre-merge-commit Hook Shim
- pre-push Hook Shim
- pre-rebase Hook Shim
- prepare-commit-msg Hook Shim
- citty CLI framework dependency
- @clack/prompts interactive prompt dependency
- damp CLI bin entry (./src/cli/index.ts)
- es-toolkit runtime dependency
- @faker-js/faker runtime dependency
- pnpm format (oxfmt then oxlint --fix)
- #/* subpath import alias
- husky git hook installation (prepare/postinstall)
- zod runtime dependency
- Renovate postUpgradeTasks changeset generation
- Agent skills lockfile (shadcn skill pin)
- tsconfig paths mapping for #/* and @/*
- Strict TypeScript settings (noUnusedLocals, verbatimModuleSyntax, erasableSyntaxOnly)
- TypeScript compiler configuration

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `compilerOptions` - 16 edges
3. `generate()` - 16 edges
4. `parseKey()` - 15 edges
5. `mockRewrites()` - 13 edges
6. `handle()` - 13 edges
7. `scripts` - 12 edges
8. `GenerateOptions` - 12 edges
9. `serveRegistryRoute()` - 11 edges
10. `Using it` - 11 edges

## Surprising Connections (you probably didn't know these)
- `minimumReleaseAgeExclude escape hatch` --semantically_similar_to--> `Renovate package groups (TanStack Start, React, Vite, Vitest, Storybook)`  [INFERRED] [semantically similar]
  pnpm-workspace.yaml → renovate.json
- `CI workflow (lint, typecheck, build, tests)` --shares_data_with--> `mocker root package manifest`  [AMBIGUOUS]
  .github/workflows/ci.yaml → package.json
- `Release workflow via changesets/action` --references--> `mocker root package manifest`  [INFERRED]
  .github/workflows/release.yaml → package.json
- `pnpm workspace definition (packages/**)` --shares_data_with--> `mocker root package manifest`  [INFERRED]
  pnpm-workspace.yaml → package.json
- `CI workflow (lint, typecheck, build, tests)` --references--> `pnpm typecheck (tsc --noEmit)`  [EXTRACTED]
  .github/workflows/ci.yaml → package.json

## Import Cycles
- None detected.

## Communities (116 total, 82 thin omitted)

### Community 0 - "Schema-Driven Data Generation"
Cohesion: 0.06
Nodes (54): InvalidControlError, MockControls, readControls(), readInt(), BODILESS_STATUSES, handle(), HandleContext, messageOf() (+46 more)

### Community 1 - "Next.js Adapter and Mock Flag"
Cohesion: 0.11
Nodes (35): DeviceList, deviceListSchema, handler(), problem(), reconstruct(), serveRegistryRoute(), originalPathname(), bindingNames() (+27 more)

### Community 2 - "Agent Instructions and Toolchain Policy"
Cohesion: 0.12
Nodes (17): Changesets versioning and publishing, oxlint configuration, CI workflow (lint, typecheck, build, tests), Three-tier test pipeline (unit, integration, e2e), fallow exit-code semantics (0 pass, 1 issues, 2 error), Fallow audit workflow, --gate new-only PR gating policy, Sticky PR comment upsert by marker (+9 more)

### Community 3 - "Damp CLI Commands and Rendering"
Cohesion: 0.05
Nodes (43): author, bugs, default, types, default, dependencies, @magicspon/mocker, description (+35 more)

### Community 4 - "Registry Key Matching"
Cohesion: 0.11
Nodes (32): suggest(), UnknownOverridePathError, UnsupportedSchemaError, absentValue(), assertOverridePathsExist(), clampNumber(), clampString(), context() (+24 more)

### Community 5 - "Root Package Manifest"
Cohesion: 0.05
Nodes (36): husky.sh script, config, devDependencies, @changesets/changelog-github, @changesets/cli, @commitlint/cli, @commitlint/config-conventional, husky (+28 more)

### Community 6 - "Request Handling and Controls"
Cohesion: 0.05
Nodes (39): Example app, Notes for anyone copying this, The endpoints, The production guarantee, checked, Things worth trying, This is NOT the Next.js you know, A note on dependencies, Array sizing (+31 more)

### Community 8 - "TypeScript Compiler Options"
Cohesion: 0.05
Nodes (41): author, bugs, default, types, default, types, default, dependencies (+33 more)

### Community 9 - "shadcn/ui Component Config"
Cohesion: 0.09
Nodes (23): Adding a mock to a route, An endpoint nobody has built, Endpoints that take a query string, How a key reaches Next, `MOCK_API`, `MOCK_LOG`, Mocking only some routes, Pinning an endpoint's data (+15 more)

### Community 10 - "CLI Package Manifest"
Cohesion: 0.10
Nodes (20): compilerOptions, declaration, erasableSyntaxOnly, isolatedDeclarations, isolatedModules, lib, module, moduleResolution (+12 more)

### Community 11 - "Next Adapter Manifest"
Cohesion: 0.13
Nodes (22): nextConfig, mockRewrites(), requireApiPath(), Rewrite, RewriteHas, ruleSignature(), detailSchema, toRewriteConditions() (+14 more)

### Community 12 - "Mock Package Manifest"
Cohesion: 0.18
Nodes (16): MockEndpointOptions, NextRouteHandler, routeParams(), detailSchema, realHandler, withMock(), ENABLE_ALL, environment() (+8 more)

### Community 13 - "Renovate Update Policy"
Cohesion: 0.12
Nodes (15): commitMessageAction, commitMessagePrefix, commitMessageTopic, dependencyDashboard, extends, packageManager, packageRules, postUpgradeTasks (+7 more)

### Community 14 - "Oxlint Rule Configuration"
Cohesion: 0.17
Nodes (11): categories, correctness, env, builtin, ignorePatterns, options, typeAware, overrides (+3 more)

### Community 15 - "Changesets Release Config"
Cohesion: 0.18
Nodes (10): access, baseBranch, changelog, commit, fixed, format, ignore, linked (+2 more)

### Community 16 - "Mock Request Logging"
Cohesion: 0.15
Nodes (11): Commands, Comments, Conventions, fallow, graphify, Linking into a consumer, mocker, Releasing (+3 more)

### Community 17 - "Directory Fuzzy Search"
Cohesion: 0.09
Nodes (22): dependencies, @magicspon/mocker, @magicspon/mocker-next, next, react, react-dom, zod, devDependencies (+14 more)

### Community 18 - "Oxfmt Formatting Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 19 - "Claude Permission Settings"
Cohesion: 0.29
Nodes (6): permissions, allow, ask, defaultMode, deny, $schema

### Community 21 - "Deprecated Husky Shim"
Cohesion: 0.22
Nodes (8): GET(), POST(), GET(), GET, User, userSchema, withApiKey(), noUpstream()

### Community 22 - "TanStack Router Config"
Cohesion: 0.25
Nodes (7): ignorePatterns, printWidth, $schema, semi, singleQuote, sortPackageJson, trailingComma

### Community 23 - "Vitest Type Shims"
Cohesion: 0.39
Nodes (6): code(), exportedNames(), Reference, referencesIn(), resolveLocal(), runtimeClosure()

### Community 24 - "Community 24"
Cohesion: 0.36
Nodes (5): code(), Reference, referencesIn(), resolveLocal(), runtimeClosure()

### Community 25 - "Community 25"
Cohesion: 0.29
Nodes (6): compilerOptions, declaration, isolatedDeclarations, types, extends, include

### Community 26 - "Community 26"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 28 - "Community 28"
Cohesion: 0.40
Nodes (4): compilerOptions, types, extends, include

### Community 29 - "Community 29"
Cohesion: 0.40
Nodes (4): compilerOptions, types, extends, include

### Community 30 - "Community 30"
Cohesion: 0.40
Nodes (3): PACKAGES, push, ROOT

## Ambiguous Edges - Review These
- `mocker root package manifest` → `CI workflow (lint, typecheck, build, tests)`  [AMBIGUOUS]
  .github/workflows/ci.yaml · relation: shares_data_with

## Knowledge Gaps
- **348 isolated node(s):** `$schema`, `baseBranch`, `access`, `format`, `changelog` (+343 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **82 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `mocker root package manifest` and `CI workflow (lint, typecheck, build, tests)`?**
  _Edge tagged AMBIGUOUS (relation: shares_data_with) - confidence is low._
- **Why does `handle()` connect `Schema-Driven Data Generation` to `Next.js Adapter and Mock Flag`, `Mock Package Manifest`, `Registry Key Matching`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `withMock()` connect `Mock Package Manifest` to `Schema-Driven Data Generation`, `Deprecated Husky Shim`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `MockRegistry` connect `Next.js Adapter and Mock Flag` to `Next Adapter Manifest`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `$schema`, `baseBranch`, `access` to the rest of the system?**
  _367 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Schema-Driven Data Generation` be split into smaller, more focused modules?**
  _Cohesion score 0.059154929577464786 - nodes in this community are weakly interconnected._
- **Should `Next.js Adapter and Mock Flag` be split into smaller, more focused modules?**
  _Cohesion score 0.11378353376503238 - nodes in this community are weakly interconnected._