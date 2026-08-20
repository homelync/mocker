# Graph Report - mocker  (2026-08-20)

## Corpus Check
- 203 files · ~95,084 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1314 nodes · 2054 edges · 167 communities (84 shown, 83 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4ff95c5b`
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
- Community 39
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
- CLAUDE.md
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
- tsdown.config.ts
- tsdown.config.ts
- Renovate postUpgradeTasks changeset generation
- Agent skills lockfile (shadcn skill pin)
- tsconfig paths mapping for #/* and @/*
- Strict TypeScript settings (noUnusedLocals, verbatimModuleSyntax, erasableSyntaxOnly)
- TypeScript compiler configuration
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 148
- Community 149
- Community 150
- Community 152
- pre-commit
- pre-merge-commit
- pre-push
- pre-rebase
- prepare-commit-msg

## God Nodes (most connected - your core abstractions)
1. `MockRegistry` - 22 edges
2. `answer()` - 20 edges
3. `parseKey()` - 20 edges
4. `compilerOptions` - 20 edges
5. `generate()` - 19 edges
6. `GenerateOptions` - 18 edges
7. `serveFromRegistry()` - 18 edges
8. `findMatch()` - 17 edges
9. `compilerOptions` - 16 edges
10. `scripts` - 16 edges

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

## Communities (167 total, 83 thin omitted)

### Community 0 - "Schema-Driven Data Generation"
Cohesion: 0.06
Nodes (59): test, fixtureError(), replay(), serveFixed(), sleep(), answer(), bend(), fulfillError() (+51 more)

### Community 1 - "Next.js Adapter and Mock Flag"
Cohesion: 0.07
Nodes (48): CliOptions, integer(), parseCliArgs(), ParsedArgs, options(), UsageError, main(), run() (+40 more)

### Community 2 - "Agent Instructions and Toolchain Policy"
Cohesion: 0.12
Nodes (17): Changesets versioning and publishing, oxlint configuration, CI workflow (lint, typecheck, build, tests), Three-tier test pipeline (unit, integration, e2e), fallow exit-code semantics (0 pass, 1 issues, 2 error), Fallow audit workflow, --gate new-only PR gating policy, Sticky PR comment upsert by marker (+9 more)

### Community 3 - "Damp CLI Commands and Rendering"
Cohesion: 0.07
Nodes (44): nextConfig, handler(), problem(), reconstruct(), serveRegistryRoute(), mockRewrites(), originalPathname(), requireApiPath() (+36 more)

### Community 4 - "Registry Key Matching"
Cohesion: 0.11
Nodes (33): deviceListSchema, DeviceList, deviceListSchema, Timeline, timelineSchema, FixedOutcome, MockOptions, bindingNames() (+25 more)

### Community 5 - "Root Package Manifest"
Cohesion: 0.05
Nodes (41): husky.sh script, config, devDependencies, @changesets/changelog-github, @changesets/cli, @commitlint/cli, @commitlint/config-conventional, @commitlint/types (+33 more)

### Community 6 - "Request Handling and Controls"
Cohesion: 0.18
Nodes (11): A note on dependencies, Array sizing, Canonical paths, How a value is chosen, How it works, Layout, Not yet built, Nullish fields (+3 more)

### Community 8 - "TypeScript Compiler Options"
Cohesion: 0.05
Nodes (45): author, bugs, default, dependencies, @magicspon/mocker, description, devDependencies, msw (+37 more)

### Community 9 - "shadcn/ui Component Config"
Cohesion: 0.18
Nodes (9): Commands, Comments, Communication, Conventions, fallow, graphify, mocker, mocker. (+1 more)

### Community 10 - "CLI Package Manifest"
Cohesion: 0.10
Nodes (20): compilerOptions, declaration, erasableSyntaxOnly, isolatedDeclarations, isolatedModules, lib, module, moduleResolution (+12 more)

### Community 11 - "Next Adapter Manifest"
Cohesion: 0.05
Nodes (44): author, bugs, default, dependencies, @magicspon/mocker, description, devDependencies, playwright-core (+36 more)

### Community 12 - "Mock Package Manifest"
Cohesion: 0.05
Nodes (43): author, bugs, default, types, default, dependencies, @magicspon/mocker, description (+35 more)

### Community 13 - "Renovate Update Policy"
Cohesion: 0.12
Nodes (16): commitMessageAction, commitMessagePrefix, commitMessageTopic, dependencyDashboard, description, extends, packageRules, postUpgradeTasks (+8 more)

### Community 14 - "Oxlint Rule Configuration"
Cohesion: 0.17
Nodes (11): categories, correctness, env, builtin, ignorePatterns, options, typeAware, overrides (+3 more)

### Community 15 - "Changesets Release Config"
Cohesion: 0.18
Nodes (10): access, baseBranch, changelog, commit, fixed, format, ignore, linked (+2 more)

### Community 16 - "Mock Request Logging"
Cohesion: 0.05
Nodes (41): author, bugs, default, types, default, types, default, dependencies (+33 more)

### Community 17 - "Directory Fuzzy Search"
Cohesion: 0.05
Nodes (38): author, bin, mocker, bugs, default, dependencies, @faker-js/faker, @magicspon/mocker (+30 more)

### Community 18 - "Oxfmt Formatting Config"
Cohesion: 0.17
Nodes (26): path(), absentValue(), assertOverridePathsExist(), clampNumber(), clampString(), context(), DEFAULT_NESTED_ARRAY_LENGTH, FORMAT_GENERATORS (+18 more)

### Community 19 - "Claude Permission Settings"
Cohesion: 0.29
Nodes (6): permissions, allow, ask, defaultMode, deny, $schema

### Community 21 - "Deprecated Husky Shim"
Cohesion: 0.11
Nodes (24): ArrayPath, CheckedCounts, CheckedOverrides, Descend, Join, MaxDepth, Opaque, PathCounts (+16 more)

### Community 22 - "TanStack Router Config"
Cohesion: 0.22
Nodes (8): ignorePatterns, overrides, printWidth, $schema, semi, singleQuote, sortPackageJson, trailingComma

### Community 23 - "Vitest Type Shims"
Cohesion: 0.15
Nodes (22): MockControls, decode(), fixturePath(), RELATIVE, safeSegment(), signature(), none, post() (+14 more)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (22): dependencies, @magicspon/mocker, @magicspon/mocker-next, next, react, react-dom, zod, devDependencies (+14 more)

### Community 25 - "Community 25"
Cohesion: 0.29
Nodes (6): compilerOptions, declaration, isolatedDeclarations, types, extends, include

### Community 26 - "Community 26"
Cohesion: 0.10
Nodes (19): dependencies, @magicspon/mocker, @magicspon/mocker-cli, @magicspon/mocker-playwright, zod, devDependencies, @playwright/test, tsx (+11 more)

### Community 27 - "Community 27"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 28 - "Community 28"
Cohesion: 0.16
Nodes (12): readControls(), readInt(), BODILESS_STATUSES, handle(), HandleContext, messageOf(), MockEndpoint, mockResponse() (+4 more)

### Community 29 - "Community 29"
Cohesion: 0.16
Nodes (13): DeviceList, deviceListSchema, DeviceTable(), State, AllOffline, AnotherProperty, Default, FewDevices (+5 more)

### Community 30 - "Community 30"
Cohesion: 0.40
Nodes (3): PACKAGES, push, ROOT

### Community 31 - "Community 31"
Cohesion: 0.22
Nodes (8): GET(), POST(), GET(), GET, User, userSchema, withApiKey(), noUpstream()

### Community 33 - "Community 33"
Cohesion: 0.22
Nodes (8): suggest(), UnknownOverridePathError, UnsupportedSchemaError, DEFAULT_RULES, ruleNamed(), SEEDS, LEAF_KINDS, NameRule

### Community 34 - "Community 34"
Cohesion: 0.31
Nodes (11): serializeFixture(), fixtureError(), generate(), replay(), serveFixed(), sleep(), FixtureLookup, fixtureUrl() (+3 more)

### Community 35 - "Community 35"
Cohesion: 0.15
Nodes (12): imports, msw, workerDirectory, name, private, scripts, build, dev (+4 more)

### Community 36 - "Community 36"
Cohesion: 0.31
Nodes (10): beforeEach(), applyControls(), asDeclared(), EntryOutput, handlerFor(), MockerEndpointOptions, mockerHandler(), MockerHandlerOptions (+2 more)

### Community 37 - "Community 37"
Cohesion: 0.15
Nodes (13): 1. Responses come from files (`fixed: true`), 2. An undeclared request fails the test (`unmatched: 'error'`), Alongside `@magicspon/mocker-next`, Further reading, If your app can start MSW itself, @magicspon/mocker-playwright, Options, Quickstart (+5 more)

### Community 38 - "Community 38"
Cohesion: 0.30
Nodes (9): middleware(), mockerFixtures(), MockerFixturesOptions, readBody(), RELATIVE, resolveFixture(), send(), serveFixture() (+1 more)

### Community 39 - "Community 39"
Cohesion: 0.29
Nodes (7): Property, propertySchema, PropertyCard(), AnotherProperty, Default, FullyPopulated, meta

### Community 42 - "applypatch-msg"
Cohesion: 0.20
Nodes (9): As a library, Existing files are kept, Licence, @magicspon/mocker-cli, Quickstart, Reading a TypeScript registry, Usage, What it fills in, and what it cannot (+1 more)

### Community 43 - "commit-msg"
Cohesion: 0.22
Nodes (9): devDependencies, msw, msw-storybook-addon, storybook, @storybook/react-vite, @types/react, @types/react-dom, typescript (+1 more)

### Community 44 - "post-applypatch"
Cohesion: 0.33
Nodes (4): alreadyRecorded, changesetDir, [packageFile, depType, depName], RELEASABLE_DEP_TYPES

### Community 45 - "post-checkout"
Cohesion: 0.42
Nodes (8): activeClientIds, getResponse(), handleRequest(), IS_MOCKED_RESPONSE, resolveMainClient(), respondWithMock(), sendToClient(), serializeRequest()

### Community 46 - "post-commit"
Cohesion: 0.31
Nodes (5): code(), Reference, referencesIn(), resolveLocal(), runtimeClosure()

### Community 47 - "post-merge"
Cohesion: 0.22
Nodes (8): Entry points, Further reading, @magicspon/mocker-next, Or: one route at a time, Quickstart, Registry keys, Testing with Vitest, What `withMocker` does

### Community 48 - "post-rewrite"
Cohesion: 0.31
Nodes (5): code(), Reference, referencesIn(), resolveLocal(), runtimeClosure()

### Community 49 - "pre-applypatch"
Cohesion: 0.22
Nodes (9): Components that take props, Fixed responses, from a file on disk, Further reading, @magicspon/mocker-storybook, One story, one endpoint, different behaviour, Outside Storybook, Quickstart, Under Playwright (+1 more)

### Community 50 - "pre-auto-gc"
Cohesion: 0.22
Nodes (6): deviceListSchema, fallback, noteSchema, server, store, unavailable

### Community 51 - "pre-commit"
Cohesion: 0.25
Nodes (7): compilerOptions, declaration, isolatedDeclarations, jsx, types, extends, include

### Community 52 - "pre-merge-commit"
Cohesion: 0.39
Nodes (6): code(), exportedNames(), Reference, referencesIn(), resolveLocal(), runtimeClosure()

### Community 53 - "pre-push"
Cohesion: 0.25
Nodes (8): Controls, per request, Entry points, Further reading, @magicspon/mocker, Quickstart, The `MOCK_API` flag, The rule the layout exists for, With Next.js

### Community 54 - "pre-rebase"
Cohesion: 0.36
Nodes (5): code(), Reference, referencesIn(), resolveLocal(), runtimeClosure()

### Community 55 - "prepare-commit-msg"
Cohesion: 0.36
Nodes (5): code(), Reference, referencesIn(), resolveLocal(), runtimeClosure()

### Community 77 - "CLAUDE.md"
Cohesion: 0.29
Nodes (6): compilerOptions, declaration, isolatedDeclarations, types, extends, include

### Community 109 - "tsdown.config.ts"
Cohesion: 0.29
Nodes (6): Example app, Notes for anyone copying this, The endpoints, The production guarantee, checked, Things worth trying, This is NOT the Next.js you know

### Community 110 - "tsdown.config.ts"
Cohesion: 0.29
Nodes (5): deviceListSchema, fallback, noteSchema, propertySchema, server

### Community 117 - "Community 117"
Cohesion: 0.33
Nodes (5): mockLoader(), MockLoaderResult, StoryIdentity, deviceSchema, propertySchema

### Community 118 - "Community 118"
Cohesion: 0.33
Nodes (6): dependencies, @magicspon/mocker, @magicspon/mocker-storybook, react, react-dom, zod

### Community 119 - "Community 119"
Cohesion: 0.73
Nodes (4): toHandlerPath(), toPrefix(), toPrefixPath(), toRegistryPath()

### Community 120 - "Community 120"
Cohesion: 0.40
Nodes (3): fixture(), put(), raw()

### Community 121 - "Community 121"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 122 - "Community 122"
Cohesion: 0.40
Nodes (4): Storybook example, The point of the registry, The service worker, What to look at

### Community 123 - "Community 123"
Cohesion: 0.40
Nodes (4): compilerOptions, types, extends, include

### Community 125 - "Community 125"
Cohesion: 0.40
Nodes (4): compilerOptions, types, extends, include

### Community 126 - "Community 126"
Cohesion: 0.40
Nodes (4): compilerOptions, types, extends, include

### Community 127 - "Community 127"
Cohesion: 0.09
Nodes (23): Adding a mock to a route, An endpoint nobody has built, Endpoints that take a query string, How a key reaches Next, `MOCK_API`, `MOCK_LOG`, Mocking only some routes, Pinning an endpoint's data (+15 more)

### Community 129 - "Community 129"
Cohesion: 0.40
Nodes (4): compilerOptions, types, extends, include

### Community 130 - "Community 130"
Cohesion: 0.40
Nodes (5): Determinism, Echoed inputs, Failing loudly, Pagination that adds up, What the handler does with a request

### Community 131 - "Community 131"
Cohesion: 0.40
Nodes (4): compilerOptions, types, extends, include

### Community 132 - "Community 132"
Cohesion: 0.50
Nodes (3): PORT, root, server

## Ambiguous Edges - Review These
- `mocker root package manifest` → `CI workflow (lint, typecheck, build, tests)`  [AMBIGUOUS]
  .github/workflows/ci.yaml · relation: shares_data_with

## Knowledge Gaps
- **589 isolated node(s):** `$schema`, `baseBranch`, `access`, `format`, `changelog` (+584 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **83 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `mocker root package manifest` and `CI workflow (lint, typecheck, build, tests)`?**
  _Edge tagged AMBIGUOUS (relation: shares_data_with) - confidence is low._
- **Why does `devDependencies` connect `commit-msg` to `Community 35`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `vite` connect `commit-msg` to `Community 38`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `middleware()` connect `Community 38` to `Schema-Driven Data Generation`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `$schema`, `baseBranch`, `access` to the rest of the system?**
  _608 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Schema-Driven Data Generation` be split into smaller, more focused modules?**
  _Cohesion score 0.060805860805860805 - nodes in this community are weakly interconnected._
- **Should `Next.js Adapter and Mock Flag` be split into smaller, more focused modules?**
  _Cohesion score 0.07010402532790593 - nodes in this community are weakly interconnected._