# mocker

Fake data from your zod schemas, served over HTTP — so an app can be run,
demoed and tested against nothing at all.

| Package                                                    | What it is                                           |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| [`@magicspon/mocker`](packages/mocker)                     | the generator and the `Request` → `Response` handler |
| [`@magicspon/mocker-next`](packages/mocker-next)           | the Next.js App Router adapter                       |
| [`@magicspon/mocker-storybook`](packages/mocker-storybook) | the Storybook adapter, over Mock Service Worker      |

```sh
npm install --save-dev @magicspon/mocker-next       # Next.js
npm install --save-dev @magicspon/mocker-storybook  # Storybook
npm install --save-dev @magicspon/mocker zod        # anywhere else
```

One endpoint table serves both adapters, so a component sees identical bytes in
a story and in `next dev`.

Data is generated per request and seeded from the request itself, so it is the
same on every machine without anything being stored. When a story needs the
_specific_ answer rather than a plausible one, the Storybook adapter's
[`fixed: true`](packages/mocker-storybook#fixed-responses-from-a-file-on-disk)
writes the response to a JSON file you can edit and commit.

Start with the package README you need. The long-form guide — recipes, the
registry design, the supported zod surface and the reasoning behind each
decision — is [`docs/mocking-guide.md`](docs/mocking-guide.md).

## Working in this repo

pnpm workspace; run everything from the root.

| Task             | Command          |
| ---------------- | ---------------- |
| Test (no build)  | `pnpm test`      |
| Typecheck        | `pnpm typecheck` |
| Lint             | `pnpm lint`      |
| Format + autofix | `pnpm format`    |
| Build packages   | `pnpm build`     |
| Storybook        | `pnpm storybook` |

[`AGENTS.md`](AGENTS.md) documents the constraint the layout follows from: a
bundler config is evaluated unbundled, before tree-shaking can help, so nothing
a config file reaches may load `@faker-js/faker`. That is why the two packages a
config imports have a faker-free entry — `./config` for Next, `./vite` for
Storybook's fixture store — and why a test in each package walks the real import
graph to keep it honest.

MIT.
