# Graph Report - .  (2026-08-16)

## Corpus Check
- 107 files · ~56,852 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 673 nodes · 903 edges · 51 communities (43 shown, 8 thin omitted)
- Extraction: 94% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 49 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Damp CLI Output and Directory Prompt|Damp CLI: Output and Directory Prompt]]
- [[_COMMUNITY_Build and Tooling Configuration|Build and Tooling Configuration]]
- [[_COMMUNITY_Dev Dependencies|Dev Dependencies]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Storybook Example Components|Storybook Example Components]]
- [[_COMMUNITY_Router and Query Runtime|Router and Query Runtime]]
- [[_COMMUNITY_Dataset Query and Schema|Dataset Query and Schema]]
- [[_COMMUNITY_TypeScript Compiler Options|TypeScript Compiler Options]]
- [[_COMMUNITY_Episodes, RNG and Work Orders|Episodes, RNG and Work Orders]]
- [[_COMMUNITY_shadcn components.json Config|shadcn components.json Config]]
- [[_COMMUNITY_Package Manifest and Scripts|Package Manifest and Scripts]]
- [[_COMMUNITY_shadcn Skill Index|shadcn Skill Index]]
- [[_COMMUNITY_shadcn CLI Reference|shadcn CLI Reference]]
- [[_COMMUNITY_Reading Simulation Physics|Reading Simulation Physics]]
- [[_COMMUNITY_Renovate Dependency Automation|Renovate Dependency Automation]]
- [[_COMMUNITY_shadcn Theming and Customization|shadcn Theming and Customization]]
- [[_COMMUNITY_Storybook Docs and Sharing Assets|Storybook Docs and Sharing Assets]]
- [[_COMMUNITY_shadcn Composition Rules|shadcn Composition Rules]]
- [[_COMMUNITY_shadcn Styling Rules|shadcn Styling Rules]]
- [[_COMMUNITY_World and Entity Generation|World and Entity Generation]]
- [[_COMMUNITY_Prettier Config Module|Prettier Config Module]]
- [[_COMMUNITY_Storybook Setup and Story Meta|Storybook Setup and Story Meta]]
- [[_COMMUNITY_shadcn MCP Server Tools|shadcn MCP Server Tools]]
- [[_COMMUNITY_Changesets Release Config|Changesets Release Config]]
- [[_COMMUNITY_Simulation Tuning Parameters|Simulation Tuning Parameters]]
- [[_COMMUNITY_Base UI vs Radix Rules|Base UI vs Radix Rules]]
- [[_COMMUNITY_shadcn Chat Component Rules|shadcn Chat Component Rules]]
- [[_COMMUNITY_shadcn Registry Authoring|shadcn Registry Authoring]]
- [[_COMMUNITY_Mould Risk Scoring|Mould Risk Scoring]]
- [[_COMMUNITY_shadcn Forms and Inputs Rules|shadcn Forms and Inputs Rules]]
- [[_COMMUNITY_AGENTS.md Project Conventions|AGENTS.md Project Conventions]]
- [[_COMMUNITY_ESLint Config Module|ESLint Config Module]]
- [[_COMMUNITY_pnpm Workspace Install Policy|pnpm Workspace Install Policy]]
- [[_COMMUNITY_Claude Code Permissions|Claude Code Permissions]]
- [[_COMMUNITY_Accessibility and Addon Ecosystem|Accessibility and Addon Ecosystem]]
- [[_COMMUNITY_Storybook Testing and Theming|Storybook Testing and Theming]]
- [[_COMMUNITY_Button and cn Utility|Button and cn Utility]]
- [[_COMMUNITY_shadcn Icon Rules|shadcn Icon Rules]]
- [[_COMMUNITY_Component Styling Options|Component Styling Options]]
- [[_COMMUNITY_Learning Resource Links|Learning Resource Links]]
- [[_COMMUNITY_Component Context Layers|Component Context Layers]]
- [[_COMMUNITY_Changesets README|Changesets README]]
- [[_COMMUNITY_Commitlint Config|Commitlint Config]]
- [[_COMMUNITY_Storybook MCP Server|Storybook MCP Server]]
- [[_COMMUNITY_Storybook Main Config|Storybook Main Config]]
- [[_COMMUNITY_Storybook Preview Config|Storybook Preview Config]]
- [[_COMMUNITY_Vite Config Module|Vite Config Module]]
- [[_COMMUNITY_Static Assets Illustration|Static Assets Illustration]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 21 edges
2. `uniform()` - 16 edges
3. `runCreate()` - 15 edges
4. `scripts` - 14 edges
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
- `Picking a directory` --references--> `runCreate()`  [INFERRED]
  README.md → src/cli/commands/create.ts
- `Anchored New Directory Creation` --references--> `writeResult()`  [INFERRED]
  README.md → src/cli/output.ts
- `pnpm onlyBuiltDependencies Allowlist` --semantically_similar_to--> `Claude Code Permission Policy`  [INFERRED] [semantically similar]
  package.json → .claude/settings.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Directory Prompt: search, rank, anchor, write** — readme_picking_a_directory, cli_directories_createdirectorysearch, cli_directories_fuzzyscore, cli_output_writeresult [EXTRACTED 0.90]

## Communities (51 total, 8 thin omitted)

### Community 0 - "Damp CLI: Output and Directory Prompt"
Cohesion: 0.07
Nodes (46): createDirectorySearch(), DirectoryOption, fuzzyScore(), IGNORED, listDirectories(), walk(), main, Dataset (+38 more)

### Community 1 - "Build and Tooling Configuration"
Cohesion: 0.06
Nodes (43): Claude Code Permission Policy, Chosen Scaffold Add-Ons, Create TanStack App Scaffold Manifest, Devtools EventClient Protocol, TanStack Devtools Plugin System, Devtools Vite Plugin Must Be First, Router Full Type Inference Philosophy, Isomorphic-by-Default Execution Model (+35 more)

### Community 2 - "Dev Dependencies"
Cohesion: 0.06
Nodes (34): config, devDependencies, @changesets/cli, @chromatic-com/storybook, citty, @clack/prompts, @commitlint/cli, @commitlint/config-conventional (+26 more)

### Community 3 - "Runtime Dependencies"
Cohesion: 0.06
Nodes (35): dependencies, @base-ui/react, class-variance-authority, clsx, @emotion/react, @emotion/styled, es-toolkit, @faker-js/faker (+27 more)

### Community 4 - "Storybook Example Components"
Cohesion: 0.09
Nodes (27): Storybook Config (main.ts), Storybook TanStack React Framework Integration, A11y 'todo' Test Policy, Storybook Preview Parameters, Button(), ButtonProps, Large, Button Stories Meta (Example/Button) (+19 more)

### Community 5 - "Router and Query Runtime"
Cohesion: 0.10
Nodes (21): MyRouterContext (queryClient router context), RootDocument (HTML shell component), Root Route (createRootRouteWithContext), Home(), Route, MyRouterContext, Route, env (+13 more)

### Community 6 - "Dataset Query and Schema"
Cohesion: 0.11
Nodes (24): renderEpisodes(), getWorld(), rooms, decimate(), queryDataset(), QueryResult, resolveWindow(), Row (+16 more)

### Community 7 - "TypeScript Compiler Options"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, isolatedModules, jsx, lib, module, moduleResolution (+15 more)

### Community 8 - "Episodes, RNG and Work Orders"
Cohesion: 0.21
Nodes (20): build(), cache, countFor(), Episode, episodesAt(), episodesBetween(), episodesForYear(), startOfEpisode() (+12 more)

### Community 9 - "shadcn components.json Config"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 10 - "Package Manifest and Scripts"
Cohesion: 0.10
Nodes (20): bin, damp, imports, name, private, scripts, build, build-storybook (+12 more)

### Community 11 - "shadcn Skill Index"
Cohesion: 0.10
Nodes (19): Chat & Messaging → [chat.md](./rules/chat.md), CLI, Component Docs, Examples, and Usage, Component Selection, Component Structure → [composition.md](./rules/composition.md), Critical Rules, Current Project Context, Detailed References (+11 more)

### Community 12 - "shadcn CLI Reference"
Cohesion: 0.11
Nodes (17): `add` — Add components, `apply` — Apply a preset to an existing project, `build` — Build a custom registry, Commands, Contents, `diff` — Check for updates, `docs` — Get component documentation URLs, Dry-Run Mode (+9 more)

### Community 13 - "Reading Simulation Physics"
Cohesion: 0.21
Nodes (16): absoluteHumidity(), combineEffects(), dayOfYear(), dewPoint(), EpisodeEffect, heatingIsOn(), NO_EFFECT, occupancyFactor() (+8 more)

### Community 14 - "Renovate Dependency Automation"
Cohesion: 0.12
Nodes (15): commitMessageAction, commitMessagePrefix, commitMessageTopic, dependencyDashboard, extends, packageManager, packageRules, postUpgradeTasks (+7 more)

### Community 15 - "shadcn Theming and Customization"
Cohesion: 0.13
Nodes (14): 1. Built-in variants, 2. Tailwind classes via `className`, 3. Add a new variant, 4. Wrapper components, Adding Custom Colors, Border Radius, Changing the Theme, Checking for Updates (+6 more)

### Community 16 - "Storybook Docs and Sharing Assets"
Cohesion: 0.18
Nodes (14): Discord Community Support Channel, Discord Brand Icon (SVG), argTypes and Controls-Driven Props Table, Autodocs Screenshot: Meta tags autodocs to generated Docs page, Storybook autodocs Tag in Component Meta, Design-to-Story Visual Parity, Figma Plugin Screenshot: Storybook Connect in Figma Design File, Storybook Connect Figma Plugin (+6 more)

### Community 17 - "shadcn Composition Rules"
Cohesion: 0.14
Nodes (13): Avatar always needs AvatarFallback, Button has no isPending or isLoading prop, Callouts use Alert, Card structure, Choosing between overlay components, Component Composition, Contents, Dialog, Sheet, and Drawer always need a Title (+5 more)

### Community 18 - "shadcn Styling Rules"
Cohesion: 0.14
Nodes (13): Built-in variants first, className for layout only, Contents, No manual dark: color overrides, No manual z-index on overlay components, No raw color values for status/state indicators, No space-x-* / space-y-*, Prefer size-* over w-* h-* when equal (+5 more)

### Community 19 - "World and Entity Generation"
Cohesion: 0.22
Nodes (10): archetypeWeights, buildWorld(), cache, pad(), roomIds, World, Building, Sensor (+2 more)

### Community 20 - "Prettier Config Module"
Cohesion: 0.17
Nodes (11): categories, correctness, env, builtin, ignorePatterns, options, typeAware, overrides (+3 more)

### Community 21 - "Storybook Setup and Story Meta"
Cohesion: 0.17
Nodes (11): Data CLI, Datasets, Examples, Getting Started, Guided mode, Learn More, Notes, Options (+3 more)

### Community 22 - "shadcn MCP Server Tools"
Cohesion: 0.17
Nodes (11): Configuring Registries, Setup, `shadcn:get_add_command_for_items`, `shadcn:get_audit_checklist`, `shadcn:get_item_examples_from_registries`, `shadcn:get_project_registries`, `shadcn:list_items_in_registries`, shadcn MCP Server (+3 more)

### Community 23 - "Changesets Release Config"
Cohesion: 0.18
Nodes (10): access, baseBranch, changelog, commit, fixed, format, ignore, linked (+2 more)

### Community 24 - "Simulation Tuning Parameters"
Cohesion: 0.20
Nodes (9): ArchetypeId, archetypes, climate, episodes, heating, moisture, portfolio, RoomId (+1 more)

### Community 25 - "Base UI vs Radix Rules"
Cohesion: 0.20
Nodes (9): Accordion, Base vs Radix, Button / trigger as non-button element (base only), Composition: asChild (radix) vs render (base), Contents, Select, Select — multiple selection and object values (base only), Slider (+1 more)

### Community 26 - "shadcn Chat Component Rules"
Cohesion: 0.20
Nodes (9): Attachments use Attachment, Chat & Messaging, Contents, Escape hatch: the scroller hooks, Message rows use Message, Message surfaces use Bubble, Scrollable threads use MessageScroller, Streaming, anchoring, and jump-to-latest are built in (+1 more)

### Community 27 - "shadcn Registry Authoring"
Cohesion: 0.20
Nodes (9): Address Schemes, Build and Verify, GitHub Registries, Include, Item Definitions, Mental Model, Registry Authoring and Addresses, Registry Dependencies (+1 more)

### Community 28 - "Mould Risk Scoring"
Cohesion: 0.31
Nodes (8): risk, RiskBand, bandFor(), dayCache, DayScore, riskBetween(), riskForDay(), scoreDay()

### Community 29 - "shadcn Forms and Inputs Rules"
Cohesion: 0.22
Nodes (8): Buttons inside inputs use InputGroup + InputGroupAddon, Contents, Field validation and disabled states, FieldSet + FieldLegend for grouping related fields, Forms & Inputs, Forms use FieldGroup + Field, InputGroup requires InputGroupInput/InputGroupTextarea, Option sets (2–7 choices) use ToggleGroup

### Community 30 - "AGENTS.md Project Conventions"
Cohesion: 0.25
Nodes (7): Commands, Comments, Conventions, fallow, graphify, Layout, playground

### Community 31 - "ESLint Config Module"
Cohesion: 0.25
Nodes (7): ignorePatterns, printWidth, $schema, semi, singleQuote, sortPackageJson, trailingComma

### Community 32 - "pnpm Workspace Install Policy"
Cohesion: 0.36
Nodes (8): allowBuilds Postinstall Allowlist, esbuild (native build dependency), minimumReleaseAgeExclude Supply-Chain Cooldown Bypass, Single-Package Root Workspace ('.'), @tanstack/react-start-client@1.168.26, @tanstack/start-server-core@1.169.27, unrs-resolver (native build dependency), pnpm Workspace Definition

### Community 33 - "Claude Code Permissions"
Cohesion: 0.29
Nodes (6): permissions, allow, ask, defaultMode, deny, $schema

### Community 34 - "Accessibility and Addon Ecosystem"
Cohesion: 0.33
Nodes (6): Accessibility Addon Panel Screenshot, Automated Accessibility Audit Panel, Axe Rule Result List, Accessibility Icon (Universal Access Glyph), Storybook Addon Ecosystem Grid, Storybook Addon / Integration Ecosystem

### Community 35 - "Storybook Testing and Theming"
Cohesion: 0.33
Nodes (6): Storybook Test Runner Panel Screenshot, Histogram: Default Story Under Test, Interaction Test Panel with Pass/Fail State and Step Playback Controls, Storybook Theming Before/After Screenshot, Branded Storybook UI (Acme Dark Theme Overlay on Default Light Theme), Storybook Sidebar Story Tree (Example > Button > Docs/Primary/Secondary/Large/Small)

### Community 36 - "Button and cn Utility"
Cohesion: 0.70
Nodes (3): cn(), Button(), buttonVariants

### Community 37 - "shadcn Icon Rules"
Cohesion: 0.40
Nodes (4): Icons, Icons in Button use data-icon attribute, No sizing classes on icons inside components, Pass icons as component objects, not string keys

### Community 38 - "Component Styling Options"
Cohesion: 0.67
Nodes (3): Styling Ecosystem Icon Grid, Component Styling Approach, CSS Styling Tool Logos (Tailwind, MUI, Emotion, Styled Components, Bootstrap, Sass)

### Community 39 - "Learning Resource Links"
Cohesion: 0.67
Nodes (3): Tutorials Book Icon (SVG), YouTube Play Button Logo (SVG), Video-Based Learning Resource Link

## Ambiguous Edges - Review These
- `env` → `getRouter()`  [AMBIGUOUS]
  src/env.ts · relation: conceptually_related_to
- `Vite Plugin Pipeline` → `Devtools EventClient Protocol`  [AMBIGUOUS]
  vite.config.ts · relation: conceptually_related_to
- `GitHub Source Repository Link` → `Chromatic Hosted Storybook Publishing`  [AMBIGUOUS]
  src/stories/assets/share.png · relation: conceptually_related_to

## Knowledge Gaps
- **379 isolated node(s):** `$schema`, `baseBranch`, `access`, `format`, `changelog` (+374 more)
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
- **Why does `Picking a directory` connect `Damp CLI: Output and Directory Prompt` to `Storybook Setup and Story Meta`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `Guided mode` connect `Storybook Setup and Story Meta` to `Damp CLI: Output and Directory Prompt`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `$schema`, `baseBranch`, `access` to the rest of the system?**
  _382 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Damp CLI: Output and Directory Prompt` be split into smaller, more focused modules?**
  _Cohesion score 0.06836055656382335 - nodes in this community are weakly interconnected._