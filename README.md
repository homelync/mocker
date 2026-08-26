[![CI](https://github.com/homelync/mocker/actions/workflows/ci.yaml/badge.svg)](https://github.com/homelync/mocker/actions/workflows/ci.yaml) [![Fallow](https://github.com/homelync/mocker/actions/workflows/fallow.yml/badge.svg)](https://github.com/homelync/mocker/actions/workflows/fallow.yml) [![Release](https://github.com/homelync/mocker/actions/workflows/release.yaml/badge.svg)](https://github.com/homelync/mocker/actions/workflows/release.yaml) [![Renovate](https://github.com/homelync/mocker/actions/workflows/renovate.yaml/badge.svg)](https://github.com/homelync/mocker/actions/workflows/renovate.yaml)

# mocker.

Fake data from your zod schemas, served over HTTP — so an app can be run,
demoed and tested against nothing at all.

| Package                                                     | What it is                                            |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| [`@homelync/mocker`](packages/mocker)                       | the generator and the `Request` → `Response` handler  |
| [`@homelync/mocker-next`](packages/mocker-next)             | the Next.js App Router adapter                        |
| [`@homelync/mocker-storybook`](packages/mocker-storybook)   | the Storybook adapter, over Mock Service Worker       |
| [`@homelync/mocker-playwright`](packages/mocker-playwright) | the Playwright adapter, over `context.route`          |
| [`@homelync/mocker-cli`](packages/mocker-cli)               | the `mocker` command, writing the whole table to disk |

## Getting Started

```sh
npm install --save-dev @homelync/mocker-next        # Next.js
npm install --save-dev @homelync/mocker-storybook   # Storybook
npm install --save-dev @homelync/mocker-playwright  # Playwright
npm install --save-dev @homelync/mocker-cli         # seed the fixtures up front
npm install --save-dev @homelync/mocker zod         # anywhere else
```

One endpoint table serves every adapter, so a component sees identical bytes in
a story, in `next dev` and in an e2e run.

Data is generated per request and seeded from the request itself, so it is the
same on every machine without anything being stored. When you need the _specific_
answer rather than a plausible one, `fixed` writes the response to a JSON file
you can edit and commit — [opt-in in
Storybook](packages/mocker-storybook#fixed-responses-from-a-file-on-disk),
[the default under
Playwright](packages/mocker-playwright#1-responses-come-from-files-fixed-true),
where a missing fixture also fails the test. `npx mocker <registry> <out>` writes
those files for every endpoint at once, so they are reviewed in a pull request
rather than invented on a CI runner.

Start with the package README you need. The long-form guide — recipes, the
registry design, the supported zod surface and the reasoning behind each
decision — is [`docs/mocking-guide.md`](docs/mocking-guide.md), and
[`docs/overrides-and-rules.md`](docs/overrides-and-rules.md) covers bending an
endpoint's data: pinning a field by path, and teaching the generator what a field
name means.

## Working in this repo

pnpm workspace; run everything from the root.

### Tools to install

Node and pnpm are pinned, and everything else the build needs is in the
lockfile:

```sh
nvm use               # Node 24.19.0, from .nvmrc
corepack enable       # pnpm 11.22.0, from the packageManager field
pnpm install
pnpm --filter @homelync/e2e-example exec playwright install   # e2e browsers
```

Three tools are used from outside the lockfile, each optional until you need it:

| Tool                                              | Install                        | Used for                                                              |
| ------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------- |
| [`yalc`](https://github.com/wclr/yalc)            | `npm install -g yalc`          | publishing to a local store — see [`docs/yalc.md`](docs/yalc.md)      |
| [`fallow`](https://github.com/fallow-rs/fallow)   | `npm install -g fallow@3.17.0` | dead code, duplication and dependency hygiene, from `.fallowrc.jsonc` |
| [`graphify`](https://pypi.org/project/graphifyy/) | `uv tool install graphifyy`    | the knowledge graph in `graphify-out/`                                |

The graphify package is `graphifyy`; the command it installs is `graphify`. Pin
`fallow` to the version
[`.github/workflows/fallow.yml`](.github/workflows/fallow.yml) installs, so a
local audit and the CI gate report the same findings — a fallow major moves the
built-in defaults. All three are run as commands rather than imported, which is
why none of them is in `package.json`.

| Task             | Command          |
| ---------------- | ---------------- |
| Test (no build)  | `pnpm test`      |
| Typecheck        | `pnpm typecheck` |
| Lint             | `pnpm lint`      |
| Format + autofix | `pnpm format`    |
| Build packages   | `pnpm build`     |
| Storybook        | `pnpm storybook` |
| E2E (Playwright) | `pnpm e2e`       |

| Publish locally                     | Command                   |
| ----------------------------------- | ------------------------- |
| Build and publish to the yalc store | `pnpm publish:local`      |
| …and push to every project using it | `pnpm publish:local:push` |

See [`docs/yalc.md`](docs/yalc.md) for both halves of that loop.

[`AGENTS.md`](AGENTS.md) documents the constraint the layout follows from: a
bundler config is evaluated unbundled, before tree-shaking can help, so nothing
a config file reaches may load `@faker-js/faker`. That is why the two packages a
config imports have a faker-free entry — `./config` for Next, `./vite` for
Storybook's fixture store — and why a test in each package walks the real import
graph to keep it honest. The Playwright adapter has no such entry and needs none;
its boundary test asserts a different claim, that Playwright is never reached at
a runtime edge.

MIT.
