# Graph Report - playground  (2026-08-16)

## Corpus Check
- 84 files · ~57,819 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 669 nodes · 893 edges · 52 communities (44 shown, 8 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Build and Tooling Configuration|Build and Tooling Configuration]]
- [[_COMMUNITY_Router and Query Runtime|Router and Query Runtime]]
- [[_COMMUNITY_Dev Dependencies|Dev Dependencies]]
- [[_COMMUNITY_Storybook Example Components|Storybook Example Components]]
- [[_COMMUNITY_TypeScript Compiler Options|TypeScript Compiler Options]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Package Manifest and Scripts|Package Manifest and Scripts]]
- [[_COMMUNITY_Storybook Docs and Sharing Assets|Storybook Docs and Sharing Assets]]
- [[_COMMUNITY_Storybook Setup and Story Meta|Storybook Setup and Story Meta]]
- [[_COMMUNITY_pnpm Workspace Install Policy|pnpm Workspace Install Policy]]
- [[_COMMUNITY_Claude Code Permissions|Claude Code Permissions]]
- [[_COMMUNITY_Accessibility and Addon Ecosystem|Accessibility and Addon Ecosystem]]
- [[_COMMUNITY_Storybook Testing and Theming|Storybook Testing and Theming]]
- [[_COMMUNITY_Component Styling Options|Component Styling Options]]
- [[_COMMUNITY_Learning Resource Links|Learning Resource Links]]
- [[_COMMUNITY_Component Context Layers|Component Context Layers]]
- [[_COMMUNITY_Prettier Config Module|Prettier Config Module]]
- [[_COMMUNITY_Storybook Main Config|Storybook Main Config]]
- [[_COMMUNITY_Storybook Preview Config|Storybook Preview Config]]
- [[_COMMUNITY_Vite Config Module|Vite Config Module]]
- [[_COMMUNITY_Static Assets Illustration|Static Assets Illustration]]
- [[_COMMUNITY_ESLint Config Module|ESLint Config Module]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 21 edges
2. `uniform()` - 16 edges
3. `scripts` - 14 edges
4. `runCreate()` - 13 edges
5. `Component Composition` - 13 edges
6. `Styling & Customization` - 13 edges
7. `sampleAt()` - 12 edges
8. `shadcn/ui` - 12 edges
9. `queryDataset()` - 10 edges
10. `Commands` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Devtools EventClient Protocol` --conceptually_related_to--> `Vite Plugin Pipeline`  [AMBIGUOUS]
  AGENTS.md → vite.config.ts
- `Devtools Vite Plugin Must Be First` --rationale_for--> `Vite Plugin Pipeline`  [INFERRED]
  AGENTS.md → vite.config.ts
- `pnpm onlyBuiltDependencies Allowlist` --semantically_similar_to--> `Claude Code Permission Policy`  [INFERRED] [semantically similar]
  package.json → .claude/settings.json
- `Create TanStack App Scaffold Manifest` --conceptually_related_to--> `TanStack Intent Skill Registry`  [INFERRED]
  .cta.json → AGENTS.md
- `Create TanStack App Scaffold Manifest` --conceptually_related_to--> `File-Based Routing in src/routes`  [INFERRED]
  .cta.json → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Storybook example component suite (Button/Header/Page and their stories)** — stories_button_button, stories_header_header, stories_page_page, stories_button_stories_meta, stories_header_stories_meta, stories_page_stories_meta, _storybook_main_config [EXTRACTED 1.00]
- **Code Quality Toolchain (TS, ESLint, Prettier, scripts)** — tsconfig_compiler_options, eslint_config_flat_config, prettier_config_style, readme_lint_format_scripts, package_npm_scripts [INFERRED 0.85]
- **QueryClient SSR wiring: context creation, router registration, root context type, devtools panel** — tanstack_query_root_provider_getcontext, src_router_getrouter, routes___root_myroutercontext, src_router_ssr_query_integration, tanstack_query_devtools_default [INFERRED 0.85]
- **Login/logout state flow driven from Page through Header into Button and asserted by the play test** — stories_page_page, stories_header_header, stories_button_button, stories_header_user, stories_page_stories_loggedin [INFERRED 0.95]
- **Storybook Browser Testing Stack** — vite_config_storybook_vitest_project, vitest_shims_playwright_types, stories_configure_storybook_onboarding, eslint_config_flat_config [INFERRED 0.85]
- **TanStack Start Runtime Stack** — readme_file_based_routing, readme_server_functions, readme_api_routes, readme_route_loaders, readme_nitro_deployment, vite_config_plugin_pipeline, package_generate_routes_script [INFERRED 0.85]
- **Accessibility Addon Narrative (icon, panel, rule results)** — assets_accessibility_svg, assets_accessibility_png, assets_accessibility_png_a11y_audit_panel, assets_accessibility_png_axe_rule_results [EXTRACTED 1.00]
- **Storybook Onboarding Story Assets (document, share, design-connect, community links)** — assets_docs_autodocs_screenshot, assets_share_screenshot, assets_figma_plugin_screenshot, assets_discord_icon, assets_github_icon [INFERRED 0.85]
- **Component Workflow: Autodocs, Published Library, Design Parity** — assets_docs_autodocs_tag, assets_share_chromatic_publishing, assets_figma_plugin_design_to_story_parity, assets_share_example_button_component [INFERRED 0.75]
- **pnpm Install Safety Policy (build allowlist + release-age cooldown exclusions)** — pnpm_workspace_workspace_definition, pnpm_workspace_allowbuilds, pnpm_workspace_minimumreleaseageexclude, pnpm_workspace_packages [INFERRED 0.85]

## Communities (52 total, 8 thin omitted)

### Community 0 - "Build and Tooling Configuration"
Cohesion: 0.06
Nodes (43): Claude Code Permission Policy, Chosen Scaffold Add-Ons, Create TanStack App Scaffold Manifest, Devtools EventClient Protocol, TanStack Devtools Plugin System, Devtools Vite Plugin Must Be First, Router Full Type Inference Philosophy, Isomorphic-by-Default Execution Model (+35 more)

### Community 1 - "Router and Query Runtime"
Cohesion: 0.10
Nodes (21): MyRouterContext (queryClient router context), RootDocument (HTML shell component), Root Route (createRootRouteWithContext), Home(), Route, MyRouterContext, Route, env (+13 more)

### Community 2 - "Dev Dependencies"
Cohesion: 0.06
Nodes (34): config, devDependencies, @changesets/cli, @chromatic-com/storybook, citty, @clack/prompts, @commitlint/cli, @commitlint/config-conventional (+26 more)

### Community 3 - "Storybook Example Components"
Cohesion: 0.09
Nodes (27): Storybook Config (main.ts), Storybook TanStack React Framework Integration, A11y 'todo' Test Policy, Storybook Preview Parameters, Button(), ButtonProps, Large, Button Stories Meta (Example/Button) (+19 more)

### Community 4 - "TypeScript Compiler Options"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, isolatedModules, jsx, lib, module, moduleResolution (+15 more)

### Community 5 - "Runtime Dependencies"
Cohesion: 0.05
Nodes (41): bin, damp, dependencies, @base-ui/react, class-variance-authority, clsx, @emotion/react, @emotion/styled (+33 more)

### Community 6 - "Package Manifest and Scripts"
Cohesion: 0.14
Nodes (14): scripts, build, build-storybook, check, damp, dev, format, generate-routes (+6 more)

### Community 7 - "Storybook Docs and Sharing Assets"
Cohesion: 0.18
Nodes (14): Discord Community Support Channel, Discord Brand Icon (SVG), argTypes and Controls-Driven Props Table, Autodocs Screenshot: Meta tags autodocs to generated Docs page, Storybook autodocs Tag in Component Meta, Design-to-Story Visual Parity, Figma Plugin Screenshot: Storybook Connect in Figma Design File, Storybook Connect Figma Plugin (+6 more)

### Community 8 - "Storybook Setup and Story Meta"
Cohesion: 0.17
Nodes (11): Data CLI, Datasets, Examples, Getting Started, Guided mode, Learn More, Notes, Options (+3 more)

### Community 9 - "pnpm Workspace Install Policy"
Cohesion: 0.36
Nodes (8): allowBuilds Postinstall Allowlist, esbuild (native build dependency), minimumReleaseAgeExclude Supply-Chain Cooldown Bypass, Single-Package Root Workspace ('.'), @tanstack/react-start-client@1.168.26, @tanstack/start-server-core@1.169.27, unrs-resolver (native build dependency), pnpm Workspace Definition

### Community 10 - "Claude Code Permissions"
Cohesion: 0.29
Nodes (6): permissions, allow, ask, defaultMode, deny, $schema

### Community 11 - "Accessibility and Addon Ecosystem"
Cohesion: 0.33
Nodes (6): Accessibility Addon Panel Screenshot, Automated Accessibility Audit Panel, Axe Rule Result List, Accessibility Icon (Universal Access Glyph), Storybook Addon Ecosystem Grid, Storybook Addon / Integration Ecosystem

### Community 12 - "Storybook Testing and Theming"
Cohesion: 0.33
Nodes (6): Storybook Test Runner Panel Screenshot, Histogram: Default Story Under Test, Interaction Test Panel with Pass/Fail State and Step Playback Controls, Storybook Theming Before/After Screenshot, Branded Storybook UI (Acme Dark Theme Overlay on Default Light Theme), Storybook Sidebar Story Tree (Example > Button > Docs/Primary/Secondary/Large/Small)

### Community 13 - "Component Styling Options"
Cohesion: 0.67
Nodes (3): Styling Ecosystem Icon Grid, Component Styling Approach, CSS Styling Tool Logos (Tailwind, MUI, Emotion, Styled Components, Bootstrap, Sass)

### Community 14 - "Learning Resource Links"
Cohesion: 0.67
Nodes (3): Tutorials Book Icon (SVG), YouTube Play Button Logo (SVG), Video-Based Learning Resource Link

### Community 16 - "Prettier Config Module"
Cohesion: 0.17
Nodes (11): categories, correctness, env, builtin, ignorePatterns, options, typeAware, overrides (+3 more)

### Community 21 - "ESLint Config Module"
Cohesion: 0.25
Nodes (7): ignorePatterns, printWidth, $schema, semi, singleQuote, sortPackageJson, trailingComma

### Community 24 - "Community 24"
Cohesion: 0.25
Nodes (7): Commands, Comments, Conventions, fallow, graphify, Layout, playground

### Community 26 - "Community 26"
Cohesion: 0.07
Nodes (46): DirectoryOption, directoryOptions(), IGNORED, listDirectories(), normalise(), walk(), main, Dataset (+38 more)

### Community 27 - "Community 27"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 28 - "Community 28"
Cohesion: 0.13
Nodes (20): decimate(), queryDataset(), QueryResult, resolveWindow(), Row, selectUnits(), archetypeIds, buildingSchema (+12 more)

### Community 29 - "Community 29"
Cohesion: 0.10
Nodes (19): Chat & Messaging → [chat.md](./rules/chat.md), CLI, Component Docs, Examples, and Usage, Component Selection, Component Structure → [composition.md](./rules/composition.md), Critical Rules, Current Project Context, Detailed References (+11 more)

### Community 30 - "Community 30"
Cohesion: 0.11
Nodes (17): `add` — Add components, `apply` — Apply a preset to an existing project, `build` — Build a custom registry, Commands, Contents, `diff` — Check for updates, `docs` — Get component documentation URLs, Dry-Run Mode (+9 more)

### Community 31 - "Community 31"
Cohesion: 0.21
Nodes (15): absoluteHumidity(), combineEffects(), dayOfYear(), dewPoint(), EpisodeEffect, heatingIsOn(), NO_EFFECT, occupancyFactor() (+7 more)

### Community 32 - "Community 32"
Cohesion: 0.12
Nodes (15): commitMessageAction, commitMessagePrefix, commitMessageTopic, dependencyDashboard, extends, packageManager, packageRules, postUpgradeTasks (+7 more)

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (14): 1. Built-in variants, 2. Tailwind classes via `className`, 3. Add a new variant, 4. Wrapper components, Adding Custom Colors, Border Radius, Changing the Theme, Checking for Updates (+6 more)

### Community 34 - "Community 34"
Cohesion: 0.20
Nodes (11): archetypeWeights, buildWorld(), cache, pad(), roomIds, World, RoomId, Building (+3 more)

### Community 35 - "Community 35"
Cohesion: 0.34
Nodes (12): avalanche(), chance(), fnv1a(), gaussian(), pick(), uniform(), uniformInt(), weighted() (+4 more)

### Community 36 - "Community 36"
Cohesion: 0.14
Nodes (13): Avatar always needs AvatarFallback, Button has no isPending or isLoading prop, Callouts use Alert, Card structure, Choosing between overlay components, Component Composition, Contents, Dialog, Sheet, and Drawer always need a Title (+5 more)

### Community 37 - "Community 37"
Cohesion: 0.14
Nodes (13): Built-in variants first, className for layout only, Contents, No manual dark: color overrides, No manual z-index on overlay components, No raw color values for status/state indicators, No space-x-* / space-y-*, Prefer size-* over w-* h-* when equal (+5 more)

### Community 38 - "Community 38"
Cohesion: 0.17
Nodes (11): Configuring Registries, Setup, `shadcn:get_add_command_for_items`, `shadcn:get_audit_checklist`, `shadcn:get_item_examples_from_registries`, `shadcn:get_project_registries`, `shadcn:list_items_in_registries`, shadcn MCP Server (+3 more)

### Community 39 - "Community 39"
Cohesion: 0.18
Nodes (10): access, baseBranch, changelog, commit, fixed, format, ignore, linked (+2 more)

### Community 40 - "Community 40"
Cohesion: 0.33
Nodes (9): build(), cache, countFor(), Episode, episodesAt(), episodesBetween(), episodesForYear(), startOfEpisode() (+1 more)

### Community 41 - "Community 41"
Cohesion: 0.27
Nodes (9): risk, RiskBand, bandFor(), dayCache, DayScore, riskBetween(), riskForDay(), scoreDay() (+1 more)

### Community 42 - "Community 42"
Cohesion: 0.20
Nodes (9): Accordion, Base vs Radix, Button / trigger as non-button element (base only), Composition: asChild (radix) vs render (base), Contents, Select, Select — multiple selection and object values (base only), Slider (+1 more)

### Community 43 - "Community 43"
Cohesion: 0.20
Nodes (9): Attachments use Attachment, Chat & Messaging, Contents, Escape hatch: the scroller hooks, Message rows use Message, Message surfaces use Bubble, Scrollable threads use MessageScroller, Streaming, anchoring, and jump-to-latest are built in (+1 more)

### Community 44 - "Community 44"
Cohesion: 0.20
Nodes (9): Address Schemes, Build and Verify, GitHub Registries, Include, Item Definitions, Mental Model, Registry Authoring and Addresses, Registry Dependencies (+1 more)

### Community 45 - "Community 45"
Cohesion: 0.22
Nodes (8): ArchetypeId, archetypes, climate, episodes, heating, moisture, portfolio, workOrders

### Community 46 - "Community 46"
Cohesion: 0.22
Nodes (8): Buttons inside inputs use InputGroup + InputGroupAddon, Contents, Field validation and disabled states, FieldSet + FieldLegend for grouping related fields, Forms & Inputs, Forms use FieldGroup + Field, InputGroup requires InputGroupInput/InputGroupTextarea, Option sets (2–7 choices) use ToggleGroup

### Community 47 - "Community 47"
Cohesion: 0.70
Nodes (3): cn(), Button(), buttonVariants

### Community 48 - "Community 48"
Cohesion: 0.40
Nodes (4): Icons, Icons in Button use data-icon attribute, No sizing classes on icons inside components, Pass icons as component objects, not string keys

## Ambiguous Edges - Review These
- `env` → `getRouter()`  [AMBIGUOUS]
  src/env.ts · relation: conceptually_related_to
- `Vite Plugin Pipeline` → `Devtools EventClient Protocol`  [AMBIGUOUS]
  vite.config.ts · relation: conceptually_related_to
- `GitHub Source Repository Link` → `Chromatic Hosted Storybook Publishing`  [AMBIGUOUS]
  src/stories/assets/share.png · relation: conceptually_related_to

## Knowledge Gaps
- **380 isolated node(s):** `$schema`, `baseBranch`, `access`, `format`, `changelog` (+375 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `env` and `getRouter()`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Vite Plugin Pipeline` and `Devtools EventClient Protocol`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `GitHub Source Repository Link` and `Chromatic Hosted Storybook Publishing`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `devDependencies` connect `Dev Dependencies` to `Runtime Dependencies`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `scripts` connect `Package Manifest and Scripts` to `Runtime Dependencies`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `$schema`, `baseBranch`, `access` to the rest of the system?**
  _383 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Build and Tooling Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.06423034330011074 - nodes in this community are weakly interconnected._