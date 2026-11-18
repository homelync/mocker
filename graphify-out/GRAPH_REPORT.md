# Graph Report - mocker  (2026-11-17)

## Corpus Check
- 217 files · ~110,294 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1481 nodes · 2318 edges · 174 communities (88 shown, 86 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `11994be1`
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
- GitHub Changelog Generator (homelync/playground)
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
- Community 116
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
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 150
- Community 151
- Community 152
- Community 153
- pre-push
- pre-rebase
- prepare-commit-msg
- playwright.config.ts
- CLAUDE.md
- tsdown.config.ts
- tsdown.config.ts
- tsdown.config.ts
- tsdown.config.ts
- vitest.config.ts

## God Nodes (most connected - your core abstractions)
1. `MockRegistry` - 22 edges
2. `parseKey()` - 20 edges
3. `compilerOptions` - 20 edges
4. `scripts` - 19 edges
5. `answer()` - 18 edges
6. `GenerateOptions` - 18 edges
7. `serveFromRegistry()` - 18 edges
8. `findMatch()` - 17 edges
9. `compilerOptions` - 16 edges
10. `emitOne()` - 15 edges

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

## Communities (174 total, 86 thin omitted)

### Community 0 - "Schema-Driven Data Generation"
Cohesion: 0.05
Nodes (68): CliArgs, integer(), locales(), parseCliArgs(), ParsedArgs, options(), UsageError, main() (+60 more)

### Community 1 - "Next.js Adapter and Mock Flag"
Cohesion: 0.06
Nodes (56): test, answer(), bend(), fulfillError(), fulfillWith(), handleRoute(), HandlerState, inScope() (+48 more)

### Community 2 - "Agent Instructions and Toolchain Policy"
Cohesion: 0.12
Nodes (17): Changesets versioning and publishing, oxlint configuration, CI workflow (lint, typecheck, build, tests), Three-tier test pipeline (unit, integration, e2e), fallow exit-code semantics (0 pass, 1 issues, 2 error), Fallow audit workflow, --gate new-only PR gating policy, Sticky PR comment upsert by marker (+9 more)

### Community 3 - "Damp CLI Commands and Rendering"
Cohesion: 0.07
Nodes (45): nextConfig, handler(), problem(), reconstruct(), serveRegistryRoute(), mockRewrites(), originalPathname(), requireApiPath() (+37 more)

### Community 4 - "Registry Key Matching"
Cohesion: 0.10
Nodes (37): deviceListSchema, DeviceList, deviceListSchema, Timeline, timelineSchema, FixedOutcome, fixtureError(), replay() (+29 more)

### Community 5 - "Root Package Manifest"
Cohesion: 0.11
Nodes (19): scripts, build, check, e2e, format, lint, mocks, prepare (+11 more)

### Community 6 - "Request Handling and Controls"
Cohesion: 0.18
Nodes (11): A note on dependencies, Determinism, Echoed inputs, Failing loudly, How it works, Layout, Not yet built, Pagination that adds up (+3 more)

### Community 8 - "TypeScript Compiler Options"
Cohesion: 0.05
Nodes (46): author, bugs, default, dependencies, @homelync/mocker, description, devDependencies, msw (+38 more)

### Community 9 - "shadcn/ui Component Config"
Cohesion: 0.05
Nodes (45): author, bugs, default, dependencies, @homelync/mocker, description, devDependencies, playwright-core (+37 more)

### Community 10 - "CLI Package Manifest"
Cohesion: 0.10
Nodes (20): compilerOptions, declaration, erasableSyntaxOnly, isolatedDeclarations, isolatedModules, lib, module, moduleResolution (+12 more)

### Community 11 - "Next Adapter Manifest"
Cohesion: 0.05
Nodes (44): author, bugs, default, types, default, dependencies, @homelync/mocker, description (+36 more)

### Community 12 - "Mock Package Manifest"
Cohesion: 0.05
Nodes (42): author, bugs, default, types, default, types, default, dependencies (+34 more)

### Community 13 - "Renovate Update Policy"
Cohesion: 0.11
Nodes (17): commitMessageAction, commitMessagePrefix, commitMessageTopic, dependencyDashboard, description, extends, minimumReleaseAge, packageRules (+9 more)

### Community 14 - "Oxlint Rule Configuration"
Cohesion: 0.17
Nodes (11): categories, correctness, env, builtin, ignorePatterns, options, typeAware, overrides (+3 more)

### Community 15 - "Changesets Release Config"
Cohesion: 0.14
Nodes (13): access, baseBranch, changelog, commit, fixed, format, ignore, linked (+5 more)

### Community 16 - "Mock Request Logging"
Cohesion: 0.05
Nodes (39): author, bin, mocker, bugs, default, dependencies, @faker-js/faker, @homelync/mocker (+31 more)

### Community 17 - "Directory Fuzzy Search"
Cohesion: 0.13
Nodes (22): serializeFixture(), fixtureError(), generate(), replay(), serveFixed(), sleep(), FixtureLookup, fixtureUrl() (+14 more)

### Community 18 - "Oxfmt Formatting Config"
Cohesion: 0.12
Nodes (26): MockEndpoint, ArrayPath, CheckedCounts, CheckedOverrides, Descend, Join, MaxDepth, Opaque (+18 more)

### Community 19 - "Claude Permission Settings"
Cohesion: 0.29
Nodes (6): permissions, allow, ask, defaultMode, deny, $schema

### Community 21 - "Deprecated Husky Shim"
Cohesion: 0.07
Nodes (27): dependencies, @homelync/mocker, @homelync/mocker-storybook, react, react-dom, zod, devDependencies, msw (+19 more)

### Community 22 - "TanStack Router Config"
Cohesion: 0.22
Nodes (8): ignorePatterns, overrides, printWidth, $schema, semi, singleQuote, sortPackageJson, trailingComma

### Community 23 - "Vitest Type Shims"
Cohesion: 0.09
Nodes (22): dependencies, @homelync/mocker, @homelync/mocker-next, next, react, react-dom, zod, devDependencies (+14 more)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (22): blockExoticSubdeps, Build spec workflows (for Cloud Build projects), Dependabot settings, `dependabot.test.ts` - Dependabot unit tests, `dependabot.yml`, Dependency audit, engineStrict, GitHub workflows (+14 more)

### Community 25 - "Community 25"
Cohesion: 0.29
Nodes (6): compilerOptions, declaration, isolatedDeclarations, types, extends, include

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (15): readControls(), readInt(), readLocale(), BODILESS_STATUSES, handle(), HandleContext, messageOf(), mockResponse() (+7 more)

### Community 27 - "Community 27"
Cohesion: 0.15
Nodes (19): MockControls, coerce(), CollectionShape, echoInputs(), EMPTY_SHAPE, envelope(), MockRequestInput, paged() (+11 more)

### Community 28 - "Community 28"
Cohesion: 0.19
Nodes (20): absentValue(), DEFAULT_NESTED_ARRAY_LENGTH, isAbsent(), LeafNode, leafValue(), pickOne(), valueFor(), walk() (+12 more)

### Community 29 - "Community 29"
Cohesion: 0.10
Nodes (19): dependencies, @homelync/mocker, @homelync/mocker-cli, @homelync/mocker-playwright, zod, devDependencies, @playwright/test, tsx (+11 more)

### Community 30 - "Community 30"
Cohesion: 0.40
Nodes (3): PACKAGES, push, ROOT

### Community 31 - "Community 31"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 33 - "Community 33"
Cohesion: 0.16
Nodes (17): activeClientIds, activeClientIdsRestorePromise, activeClientIdsStorePromise, getResponse(), handleRequest(), IS_MOCKED_RESPONSE, notifyClient(), pendingRequests (+9 more)

### Community 34 - "Community 34"
Cohesion: 0.16
Nodes (13): DeviceList, deviceListSchema, DeviceTable(), State, AllOffline, AnotherProperty, Default, FewDevices (+5 more)

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (8): GET(), POST(), GET(), GET, User, userSchema, withApiKey(), noUpstream()

### Community 36 - "Community 36"
Cohesion: 0.30
Nodes (13): path(), assertOverridePathsExist(), generate(), childPath(), collectLeafKinds(), collectPaths(), elementPath(), findArrayPaths() (+5 more)

### Community 37 - "Community 37"
Cohesion: 0.31
Nodes (10): beforeEach(), applyControls(), asDeclared(), EntryOutput, handlerFor(), MockerEndpointOptions, mockerHandler(), MockerHandlerOptions (+2 more)

### Community 38 - "Community 38"
Cohesion: 0.15
Nodes (13): 1. Responses come from files (`fixed: true`), 2. An undeclared request fails the test (`unmatched: 'error'`), Alongside `@homelync/mocker-next`, Further reading, @homelync/mocker-playwright, If your app can start MSW itself, Options, Quickstart (+5 more)

### Community 39 - "Community 39"
Cohesion: 0.19
Nodes (10): AnySchema, Bounds, BOUNDS_WRITERS, classify(), MutableBounds, NODE_BUILDERS, RawCheck, RawDef (+2 more)

### Community 42 - "applypatch-msg"
Cohesion: 0.14
Nodes (14): devDependencies, @changesets/changelog-github, @changesets/cli, @commitlint/cli, @commitlint/config-conventional, @commitlint/types, oxfmt, oxlint (+6 more)

### Community 43 - "commit-msg"
Cohesion: 0.17
Nodes (12): As a library, Existing files are kept, @homelync/mocker-cli, Licence, `locale`: the language the tree is generated in, mocker.config.json, `params`: the binding values your app actually sends, Quickstart (+4 more)

### Community 44 - "post-applypatch"
Cohesion: 0.33
Nodes (4): alreadyRecorded, changesetDir, [packageFile, depType, depName], RELEASABLE_DEP_TYPES

### Community 45 - "post-checkout"
Cohesion: 0.05
Nodes (40): Commands, Comments, Communication, Conventions, fallow, graphify, mocker, Canonical paths (+32 more)

### Community 46 - "post-commit"
Cohesion: 0.29
Nodes (8): decode(), fixturePath(), RELATIVE, safeSegment(), signature(), none, post(), hashSeed()

### Community 47 - "post-merge"
Cohesion: 0.29
Nodes (7): Property, propertySchema, PropertyCard(), AnotherProperty, Default, FullyPopulated, meta

### Community 48 - "post-rewrite"
Cohesion: 0.31
Nodes (5): code(), Reference, referencesIn(), resolveLocal(), runtimeClosure()

### Community 49 - "pre-applypatch"
Cohesion: 0.22
Nodes (8): Entry points, Further reading, @homelync/mocker-next, Or: one route at a time, Quickstart, Registry keys, Testing with Vitest, What `withMocker` does

### Community 50 - "pre-auto-gc"
Cohesion: 0.22
Nodes (8): dictionaries, dictionaryDefinitions, ignorePaths, ignoreRegExpList, language, $schema, version, cspell

### Community 51 - "pre-commit"
Cohesion: 0.31
Nodes (5): code(), Reference, referencesIn(), resolveLocal(), runtimeClosure()

### Community 52 - "pre-merge-commit"
Cohesion: 0.22
Nodes (9): Components that take props, Fixed responses, from a file on disk, Further reading, @homelync/mocker-storybook, One story, one endpoint, different behaviour, Outside Storybook, Quickstart, Under Playwright (+1 more)

### Community 53 - "pre-push"
Cohesion: 0.22
Nodes (6): deviceListSchema, fallback, noteSchema, server, store, unavailable

### Community 54 - "pre-rebase"
Cohesion: 0.25
Nodes (7): compilerOptions, declaration, isolatedDeclarations, jsx, types, extends, include

### Community 55 - "prepare-commit-msg"
Cohesion: 0.25
Nodes (7): 1.0.0, 1.1.0, @homelync/mocker-cli, Major Changes, Minor Changes, Patch Changes, Patch Changes

### Community 77 - "CLAUDE.md"
Cohesion: 0.39
Nodes (6): code(), exportedNames(), Reference, referencesIn(), resolveLocal(), runtimeClosure()

### Community 109 - "tsdown.config.ts"
Cohesion: 0.43
Nodes (3): suggest(), UnknownOverridePathError, UnsupportedSchemaError

### Community 110 - "tsdown.config.ts"
Cohesion: 0.22
Nodes (8): engines, node, pnpm, name, packageManager, private, type, version

### Community 116 - "Community 116"
Cohesion: 0.36
Nodes (5): code(), Reference, referencesIn(), resolveLocal(), runtimeClosure()

### Community 117 - "Community 117"
Cohesion: 0.36
Nodes (5): code(), Reference, referencesIn(), resolveLocal(), runtimeClosure()

### Community 118 - "Community 118"
Cohesion: 0.29
Nodes (6): compilerOptions, declaration, isolatedDeclarations, types, extends, include

### Community 119 - "Community 119"
Cohesion: 0.29
Nodes (6): Example app, Notes for anyone copying this, The endpoints, The production guarantee, checked, Things worth trying, This is NOT the Next.js you know

### Community 120 - "Community 120"
Cohesion: 0.29
Nodes (5): deviceListSchema, fallback, noteSchema, propertySchema, server

### Community 121 - "Community 121"
Cohesion: 0.33
Nodes (5): mockLoader(), MockLoaderResult, StoryIdentity, deviceSchema, propertySchema

### Community 122 - "Community 122"
Cohesion: 0.33
Nodes (5): 1.0.0, 1.1.0, @homelync/mocker, Major Changes, Minor Changes

### Community 123 - "Community 123"
Cohesion: 0.73
Nodes (4): toHandlerPath(), toPrefix(), toPrefixPath(), toRegistryPath()

### Community 124 - "Community 124"
Cohesion: 0.40
Nodes (5): Array sizing, Canonical paths, How a value is chosen, Nullish fields, Why name rules exist

### Community 125 - "Community 125"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 126 - "Community 126"
Cohesion: 0.40
Nodes (4): Storybook example, The point of the registry, The service worker, What to look at

### Community 127 - "Community 127"
Cohesion: 0.08
Nodes (25): Adding a mock to a route, An endpoint nobody has built, Choosing a locale, Endpoints that take a query string, How a key reaches Next, `MOCK_API`, `MOCK_LOG`, Mocking only some routes (+17 more)

### Community 129 - "Community 129"
Cohesion: 0.40
Nodes (4): compilerOptions, types, extends, include

### Community 130 - "Community 130"
Cohesion: 0.40
Nodes (4): 1.0.0, @homelync/mocker-next, Major Changes, Patch Changes

### Community 132 - "Community 132"
Cohesion: 0.40
Nodes (4): compilerOptions, types, extends, include

### Community 133 - "Community 133"
Cohesion: 0.40
Nodes (4): 1.0.0, @homelync/mocker-playwright, Major Changes, Patch Changes

### Community 134 - "Community 134"
Cohesion: 0.40
Nodes (4): compilerOptions, types, extends, include

### Community 135 - "Community 135"
Cohesion: 0.40
Nodes (4): 1.0.0, @homelync/mocker-storybook, Major Changes, Patch Changes

### Community 136 - "Community 136"
Cohesion: 0.40
Nodes (4): compilerOptions, types, extends, include

### Community 137 - "Community 137"
Cohesion: 0.40
Nodes (4): compilerOptions, types, extends, include

### Community 138 - "Community 138"
Cohesion: 0.50
Nodes (3): PORT, root, server

## Ambiguous Edges - Review These
- `mocker root package manifest` → `CI workflow (lint, typecheck, build, tests)`  [AMBIGUOUS]
  .github/workflows/ci.yaml · relation: shares_data_with

## Knowledge Gaps
- **665 isolated node(s):** `$schema`, `baseBranch`, `access`, `format`, `changelog` (+660 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **86 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `mocker root package manifest` and `CI workflow (lint, typecheck, build, tests)`?**
  _Edge tagged AMBIGUOUS (relation: shares_data_with) - confidence is low._
- **Why does `withMock()` connect `Damp CLI Commands and Rendering` to `Schema-Driven Data Generation`, `Next.js Adapter and Mock Flag`, `Community 26`, `Community 35`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `vite` connect `Deprecated Husky Shim` to `Directory Fuzzy Search`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `$schema`, `baseBranch`, `access` to the rest of the system?**
  _684 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Schema-Driven Data Generation` be split into smaller, more focused modules?**
  _Cohesion score 0.050560512468542665 - nodes in this community are weakly interconnected._
- **Should `Next.js Adapter and Mock Flag` be split into smaller, more focused modules?**
  _Cohesion score 0.06388666132050254 - nodes in this community are weakly interconnected._
- **Should `Agent Instructions and Toolchain Policy` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._