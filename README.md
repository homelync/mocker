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
bundler config must never load `@faker-js/faker`, which is why each package has
a `./config` entry and why a test walks the import graph to keep it honest.

MIT.
