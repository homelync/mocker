# Graph Report - .  (2026-08-15)

## Corpus Check
- Corpus is ~32,302 words - fits in a single context window. You may not need a graph.

## Summary
- 238 nodes · 283 edges · 23 communities (17 shown, 6 thin omitted)
- Extraction: 80% EXTRACTED · 19% INFERRED · 1% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.86)
- Token cost: 24,389 input · 0 output

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

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `scripts` - 10 edges
3. `Header()` - 8 edges
4. `getRouter()` - 7 edges
5. `Button()` - 7 edges
6. `getContext()` - 6 edges
7. `Route` - 6 edges
8. `Vite Plugin Pipeline` - 6 edges
9. `TanStack Intent Skill Registry` - 6 edges
10. `permissions` - 5 edges

## Surprising Connections (you probably didn't know these)
- `getContext()` --shares_data_with--> `MyRouterContext (queryClient router context)`  [INFERRED]
  src/integrations/tanstack-query/root-provider.tsx → /Users/magicspon/dev/sandbox/playground/src/routes/__root.tsx
- `Header Stories Meta (Example/Header)` --references--> `Header()`  [EXTRACTED]
  /Users/magicspon/dev/sandbox/playground/src/stories/Header.stories.ts → src/stories/Header.tsx
- `Devtools EventClient Protocol` --conceptually_related_to--> `Vite Plugin Pipeline`  [AMBIGUOUS]
  /Users/magicspon/dev/sandbox/playground/AGENTS.md → /Users/magicspon/dev/sandbox/playground/vite.config.ts
- `Devtools Vite Plugin Must Be First` --rationale_for--> `Vite Plugin Pipeline`  [INFERRED]
  /Users/magicspon/dev/sandbox/playground/AGENTS.md → /Users/magicspon/dev/sandbox/playground/vite.config.ts
- `env` --conceptually_related_to--> `getRouter()`  [AMBIGUOUS]
  src/env.ts → src/router.tsx

## Import Cycles
- 1-file cycle: `eslint.config.js -> eslint.config.js`

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

## Communities (23 total, 6 thin omitted)

### Community 0 - "Build and Tooling Configuration"
Cohesion: 0.10
Nodes (34): Claude Code Permission Policy, Chosen Scaffold Add-Ons, Create TanStack App Scaffold Manifest, routeTree.gen.ts Editor Guards, Devtools EventClient Protocol, TanStack Devtools Plugin System, Devtools Vite Plugin Must Be First, Router Full Type Inference Philosophy (+26 more)

### Community 1 - "Router and Query Runtime"
Cohesion: 0.10
Nodes (23): MyRouterContext (queryClient router context), RootDocument (HTML shell component), Root Route (createRootRouteWithContext), Home(), Route, MyRouterContext, Route, env (+15 more)

### Community 2 - "Dev Dependencies"
Cohesion: 0.08
Nodes (25): devDependencies, @chromatic-com/storybook, eslint, eslint-plugin-storybook, playwright, prettier, storybook, @storybook/addon-a11y (+17 more)

### Community 3 - "Storybook Example Components"
Cohesion: 0.13
Nodes (19): Button(), ButtonProps, Large, Primary, Secondary, Small, Story, Header() (+11 more)

### Community 4 - "TypeScript Compiler Options"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 5 - "Runtime Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, nitro, react, react-dom, @t3-oss/env-core, tailwindcss, @tailwindcss/vite, @tanstack/react-devtools (+10 more)

### Community 6 - "Package Manifest and Scripts"
Cohesion: 0.12
Nodes (16): imports, name, pnpm, onlyBuiltDependencies, private, scripts, build, build-storybook (+8 more)

### Community 7 - "Storybook Docs and Sharing Assets"
Cohesion: 0.18
Nodes (14): Discord Community Support Channel, Discord Brand Icon (SVG), argTypes and Controls-Driven Props Table, Autodocs Screenshot: Meta tags autodocs to generated Docs page, Storybook autodocs Tag in Component Meta, Design-to-Story Visual Parity, Figma Plugin Screenshot: Storybook Connect in Figma Design File, Storybook Connect Figma Plugin (+6 more)

### Community 8 - "Storybook Setup and Story Meta"
Cohesion: 0.32
Nodes (8): Storybook Config (main.ts), Storybook TanStack React Framework Integration, A11y 'todo' Test Policy, Storybook Preview Parameters, Button Stories Meta (Example/Button), Header Stories Meta (Example/Header), Page Stories Meta (Example/Page), TanStack Router Story Mocking (tanstack.router parameter)

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

## Ambiguous Edges - Review These
- `env` → `getRouter()`  [AMBIGUOUS]
  /Users/magicspon/dev/sandbox/playground/src/env.ts · relation: conceptually_related_to
- `getContext()` → `TanstackQueryProvider()`  [AMBIGUOUS]
  /Users/magicspon/dev/sandbox/playground/src/integrations/tanstack-query/root-provider.tsx · relation: conceptually_related_to
- `Vite Plugin Pipeline` → `Devtools EventClient Protocol`  [AMBIGUOUS]
  /Users/magicspon/dev/sandbox/playground/vite.config.ts · relation: conceptually_related_to
- `GitHub Source Repository Link` → `Chromatic Hosted Storybook Publishing`  [AMBIGUOUS]
  /Users/magicspon/dev/sandbox/playground/src/stories/assets/share.png · relation: conceptually_related_to

## Knowledge Gaps
- **120 isolated node(s):** `$schema`, `allow`, `ask`, `deny`, `defaultMode` (+115 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `env` and `getRouter()`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `getContext()` and `TanstackQueryProvider()`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Vite Plugin Pipeline` and `Devtools EventClient Protocol`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `GitHub Source Repository Link` and `Chromatic Hosted Storybook Publishing`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `devDependencies` connect `Dev Dependencies` to `Package Manifest and Scripts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `Route` connect `Router and Query Runtime` to `Storybook Example Components`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Runtime Dependencies` to `Package Manifest and Scripts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._