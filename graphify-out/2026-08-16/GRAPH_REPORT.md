# Graph Report - .  (2026-08-16)

## Corpus Check
- Corpus is ~38,886 words - fits in a single context window. You may not need a graph.

## Summary
- 567 nodes · 1012 edges · 24 communities (21 shown, 3 thin omitted)
- Extraction: 92% EXTRACTED · 7% INFERRED · 1% AMBIGUOUS · INFERRED: 70 edges (avg confidence: 0.83)
- Token cost: 336,168 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Schema-Driven Data Generation|Schema-Driven Data Generation]]
- [[_COMMUNITY_Next.js Adapter and Mock Flag|Next.js Adapter and Mock Flag]]
- [[_COMMUNITY_Agent Instructions and Toolchain Policy|Agent Instructions and Toolchain Policy]]
- [[_COMMUNITY_Damp CLI Commands and Rendering|Damp CLI Commands and Rendering]]
- [[_COMMUNITY_Registry Key Matching|Registry Key Matching]]
- [[_COMMUNITY_Root Package Manifest|Root Package Manifest]]
- [[_COMMUNITY_Request Handling and Controls|Request Handling and Controls]]
- [[_COMMUNITY_Husky Git Hooks and Guardrails|Husky Git Hooks and Guardrails]]
- [[_COMMUNITY_TypeScript Compiler Options|TypeScript Compiler Options]]
- [[_COMMUNITY_shadcnui Component Config|shadcn/ui Component Config]]
- [[_COMMUNITY_CLI Package Manifest|CLI Package Manifest]]
- [[_COMMUNITY_Next Adapter Manifest|Next Adapter Manifest]]
- [[_COMMUNITY_Mock Package Manifest|Mock Package Manifest]]
- [[_COMMUNITY_Renovate Update Policy|Renovate Update Policy]]
- [[_COMMUNITY_Oxlint Rule Configuration|Oxlint Rule Configuration]]
- [[_COMMUNITY_Changesets Release Config|Changesets Release Config]]
- [[_COMMUNITY_Mock Request Logging|Mock Request Logging]]
- [[_COMMUNITY_Directory Fuzzy Search|Directory Fuzzy Search]]
- [[_COMMUNITY_Oxfmt Formatting Config|Oxfmt Formatting Config]]
- [[_COMMUNITY_Claude Permission Settings|Claude Permission Settings]]
- [[_COMMUNITY_es-toolkit Error Handling|es-toolkit Error Handling]]
- [[_COMMUNITY_Deprecated Husky Shim|Deprecated Husky Shim]]
- [[_COMMUNITY_TanStack Router Config|TanStack Router Config]]

## God Nodes (most connected - your core abstractions)
1. `generate()` - 23 edges
2. `compilerOptions` - 21 edges
3. `handle()` - 18 edges
4. `runCreate()` - 15 edges
5. `parseKey()` - 15 edges
6. `serveRegistryRoute()` - 15 edges
7. `mockRewrites()` - 15 edges
8. `GenerateOptions` - 14 edges
9. `withMock()` - 14 edges
10. `serveFromRegistry()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `minimumReleaseAgeExclude escape hatch` --semantically_similar_to--> `Renovate package groups (TanStack Start, React, Vite, Vitest, Storybook)`  [INFERRED] [semantically similar]
  pnpm-workspace.yaml → renovate.json
- `Agent skills lockfile (shadcn skill pin)` --semantically_similar_to--> `Storybook MCP property-verification rule`  [INFERRED] [semantically similar]
  skills-lock.json → AGENTS.md
- `tsModule()` --semantically_similar_to--> `Request-hash determinism`  [INFERRED] [semantically similar]
  packages/cli/src/output.ts → packages/mock/README.md
- `pnpm workspace definition (packages/**)` --shares_data_with--> `mocker root package manifest`  [INFERRED]
  pnpm-workspace.yaml → package.json
- `CI workflow (lint, typecheck, build, tests)` --shares_data_with--> `mocker root package manifest`  [AMBIGUOUS]
  .github/workflows/ci.yaml → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Husky Git Hook Shims Sharing One Dispatcher** — __pre_commit_hook_shim, __commit_msg_hook_shim, __pre_push_hook_shim, __prepare_commit_msg_hook_shim, __post_commit_hook_shim, __post_merge_hook_shim, __post_checkout_hook_shim, __post_rewrite_hook_shim, __pre_rebase_hook_shim, __pre_merge_commit_hook_shim, __pre_auto_gc_hook_shim, __applypatch_msg_hook_shim, __pre_applypatch_hook_shim, __post_applypatch_hook_shim, __h_husky_dispatcher [EXTRACTED 1.00]
- **Layered Agent Guardrail Policy** — _claude_settings_allow_list, _claude_settings_ask_list, _claude_settings_deny_list, _claude_settings_local_disabled_mcp_servers [EXTRACTED 1.00]
- **Commit-Time Quality and Release Gate** — __pre_commit_hook_shim, __commit_msg_hook_shim, __h_node_modules_bin_path, _changeset_config_changesets_release_config [INFERRED 0.75]
- **Oxc-based code quality toolchain (format, lint, typecheck, pre-commit)** — _oxfmtrc_format_config, _oxlintrc_lint_config, tsconfig_typescript_config, nano_staged_config, package_format_script, package_typecheck_script [EXTRACTED 1.00]
- **Dependency update to release automation flow** — renovate_dependency_automation, workflows_renovate_renovate_workflow, renovate_changeset_postupgrade, _changeset_readme_changesets_versioning, workflows_release_release_workflow, commitlint_config_config [EXTRACTED 1.00]
- **Zod-plus-faker mock data generation stack producing seeded rows/meta output** — agents_mocker_project_purpose, package_zod_dependency, package_faker_dependency, package_damp_bin, sample_rows_meta_envelope, sample_deterministic_seed [INFERRED 0.85]
- **Mock request-to-response flow** — core_handle_handle, core_controls_readcontrols, core_shape_shaperequest, core_generate_generate, core_handle_mockresponse [EXTRACTED 1.00]
- **Field value resolution precedence** — core_generate_generate, core_generate_format_generators, core_generate_matchrule, core_rules_default_rules, core_zod_def_classify, mock_readme_value_precedence [EXTRACTED 1.00]
- **Canonical path system (runtime and type-level)** — core_paths_collectpaths, core_paths_collectleafkinds, core_paths_findarraypaths, core_path_types_schemapath, core_path_types_arraypath, core_errors_unknownoverridepatherror, mock_readme_canonical_paths [EXTRACTED 1.00]
- **Resolving a request to a registry entry** — registry_match_parsekey, registry_match_matchpattern, registry_match_matchquery, registry_match_comparespecificity, registry_match_findmatch, registry_serve_servefromregistry, registry_serve_explainmiss [EXTRACTED 1.00]
- **MOCK_API opt-in, both mechanisms** — src_flag_ismockconfigured, src_flag_ismockenabledfor, src_with_mock_withmock, src_rewrites_mockrewrites, src_registry_route_serveregistryroute, src_index_prod_withmock [EXTRACTED 1.00]
- **Registry key to App Router dialect** — src_rewrites_torewritesource, src_rewrites_torewritedestination, src_rewrites_torewriteconditions, src_rewrites_toroutedirectory, src_rewrites_originalpathname, src_rewrites_requireapipath, src_rewrites_mockrewrites [EXTRACTED 1.00]

## Communities (24 total, 3 thin omitted)

### Community 0 - "Schema-Driven Data Generation"
Cohesion: 0.06
Nodes (74): suggest(), UnknownOverridePathError, UnsupportedSchemaError, absentValue(), assertOverridePathsExist(), clampNumber(), clampString(), context() (+66 more)

### Community 1 - "Next.js Adapter and Mock Flag"
Cohesion: 0.06
Nodes (47): @mocker/next-adapter manifest, Path/query split in a key, Serve the caller's original URL, The second platform-agnostic seam, Schema as a lazy thunk, planned entry marker, ENABLE_ALL, environment() (+39 more)

### Community 2 - "Agent Instructions and Toolchain Policy"
Cohesion: 0.06
Nodes (52): Changesets versioning and publishing, oxfmt formatting configuration, Lint ignore patterns for generated artifacts, oxlint jsPlugins (@stylistic/eslint-plugin, eslint-plugin-storybook), oxlint configuration, Type-aware oxlint rule set, AGENTS.md project agent instructions, Comment the why, with requirement IDs and JSDoc (+44 more)

### Community 3 - "Damp CLI Commands and Rendering"
Cohesion: 0.10
Nodes (41): @mocker/cli package, askQuery(), create, DATASETS, estimateRows(), releaseStdin(), runCreate(), SAMPLES_PER_DAY (+33 more)

### Community 4 - "Registry Key Matching"
Cohesion: 0.15
Nodes (32): Registry public surface, bindingNames(), compareSpecificity(), describeConstraint(), DYNAMIC_SEGMENT, dynamicSegments(), findMatch(), InvalidRegistryKeyError (+24 more)

### Community 5 - "Root Package Manifest"
Cohesion: 0.06
Nodes (32): bin, damp, dependencies, es-toolkit, @faker-js/faker, zod, devDependencies, @changesets/cli (+24 more)

### Community 6 - "Request Handling and Controls"
Cohesion: 0.09
Nodes (26): InvalidControlError, MockControls, readControls(), readInt(), BODILESS_STATUSES, handle(), HandleContext, messageOf() (+18 more)

### Community 7 - "Husky Git Hooks and Guardrails"
Cohesion: 0.08
Nodes (29): applypatch-msg Hook Shim, commit-msg Hook Shim, HUSKY Environment Bypass Switch, Husky Hook Dispatcher (h), Husky Init Script Sourcing (XDG config), node_modules/.bin PATH Injection, User Hook Delegation to .husky/<name>, Deprecated husky.sh Shim (+21 more)

### Community 8 - "TypeScript Compiler Options"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, isolatedModules, jsx, lib, module, moduleResolution (+15 more)

### Community 9 - "shadcn/ui Component Config"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 10 - "CLI Package Manifest"
Cohesion: 0.10
Nodes (20): bin, damp, dependencies, es-toolkit, devDependencies, citty, @clack/prompts, typescript (+12 more)

### Community 11 - "Next Adapter Manifest"
Cohesion: 0.11
Nodes (18): dependencies, es-toolkit, @faker-js/faker, next, zod, devDependencies, typescript, imports (+10 more)

### Community 12 - "Mock Package Manifest"
Cohesion: 0.11
Nodes (17): dependencies, es-toolkit, @faker-js/faker, zod, devDependencies, typescript, imports, name (+9 more)

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
Cohesion: 0.33
Nodes (9): Malformed keys fail loudly, DISABLED, environment(), formatMockLog(), isMockLogEnabled(), logMock(), MockLogEntry, Log line asserted as text (+1 more)

### Community 17 - "Directory Fuzzy Search"
Cohesion: 0.27
Nodes (7): Join, createDirectorySearch(), DirectoryOption, fuzzyScore(), IGNORED, listDirectories(), walk()

### Community 18 - "Oxfmt Formatting Config"
Cohesion: 0.25
Nodes (7): ignorePatterns, printWidth, $schema, semi, singleQuote, sortPackageJson, trailingComma

### Community 19 - "Claude Permission Settings"
Cohesion: 0.29
Nodes (6): permissions, allow, ask, defaultMode, deny, $schema

## Ambiguous Edges - Review These
- `main` → `@mocker/cli package`  [AMBIGUOUS]
  packages/cli/package.json · relation: references
- `Changesets Release Config` → `pre-commit Hook Shim`  [AMBIGUOUS]
  .husky/_/pre-commit · relation: conceptually_related_to
- `mocker root package manifest` → `CI workflow (lint, typecheck, build, tests)`  [AMBIGUOUS]
  .github/workflows/ci.yaml · relation: shares_data_with
- `shadcn/ui components configuration` → `Renovate package groups (TanStack Start, React, Vite, Vitest, Storybook)`  [AMBIGUOUS]
  renovate.json · relation: conceptually_related_to
- `AGENTS.md project agent instructions` → `Three-tier test pipeline (unit, integration, e2e)`  [AMBIGUOUS]
  AGENTS.md · relation: conceptually_related_to
- `@mocker/mock package` → `Faker kept out of the production bundle`  [AMBIGUOUS]
  packages/mock/package.json · relation: conceptually_related_to

## Knowledge Gaps
- **201 isolated node(s):** `$schema`, `baseBranch`, `access`, `format`, `changelog` (+196 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `main` and `@mocker/cli package`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Changesets Release Config` and `pre-commit Hook Shim`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `mocker root package manifest` and `CI workflow (lint, typecheck, build, tests)`?**
  _Edge tagged AMBIGUOUS (relation: shares_data_with) - confidence is low._
- **What is the exact relationship between `shadcn/ui components configuration` and `Renovate package groups (TanStack Start, React, Vite, Vitest, Storybook)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `AGENTS.md project agent instructions` and `Three-tier test pipeline (unit, integration, e2e)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `@mocker/mock package` and `Faker kept out of the production bundle`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `handle()` connect `Request Handling and Controls` to `Schema-Driven Data Generation`, `Next.js Adapter and Mock Flag`, `Registry Key Matching`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._