# mocker.

Fake data from your zod schemas, served over HTTP — so an app can be run,
demoed and tested against nothing at all.

| Package                                                      | What it is                                            |
| ------------------------------------------------------------ | ----------------------------------------------------- |
| [`@magicspon/mocker`](packages/mocker)                       | the generator and the `Request` → `Response` handler  |
| [`@magicspon/mocker-next`](packages/mocker-next)             | the Next.js App Router adapter                        |
| [`@magicspon/mocker-storybook`](packages/mocker-storybook)   | the Storybook adapter, over Mock Service Worker       |
| [`@magicspon/mocker-playwright`](packages/mocker-playwright) | the Playwright adapter, over `context.route`          |
| [`@magicspon/mocker-cli`](packages/mocker-cli)               | the `mocker` command, writing the whole table to disk |

```sh
npm install --save-dev @magicspon/mocker-next        # Next.js
npm install --save-dev @magicspon/mocker-storybook   # Storybook
npm install --save-dev @magicspon/mocker-playwright  # Playwright
npm install --save-dev @magicspon/mocker-cli         # seed the fixtures up front
npm install --save-dev @magicspon/mocker zod         # anywhere else
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
| E2E (Playwright) | `pnpm e2e`       |

[`AGENTS.md`](AGENTS.md) documents the constraint the layout follows from: a
bundler config is evaluated unbundled, before tree-shaking can help, so nothing
a config file reaches may load `@faker-js/faker`. That is why the two packages a
config imports have a faker-free entry — `./config` for Next, `./vite` for
Storybook's fixture store — and why a test in each package walks the real import
graph to keep it honest. The Playwright adapter has no such entry and needs none;
its boundary test asserts a different claim, that Playwright is never reached at
a runtime edge.

MIT.
