# Using the packages before they are published

None of the five packages are on npm yet, so the only way to use them in another
project is to build them here and install them from a local store.
[yalc](https://github.com/wclr/yalc) is that store: it holds published-shaped
copies of each package and copies them into a consuming project, which is close
enough to a real install that the mistakes worth catching still surface.

`npm link` and `pnpm link` are the wrong tool here. They symlink the working tree,
so the consumer reads the _development_ `exports` map — which points at
`./src/*.ts` — and gets a package that no registry would ever serve.

## Getting started

yalc is a global tool, not a dependency of this repo:

```sh
npm install -g yalc
```

Then clone, install, build and publish to the local store:

```sh
git clone git@github.com:homelync/mocker.git
cd mocker
pnpm install
pnpm build
pnpm publish:local
```

Node ≥ 24.19 and pnpm 11. `publish:local` runs `pnpm build` itself, so the
explicit build above is only there the first time, when you want to see it
succeed on its own.

All five packages go into the store together:
`@homelync/mocker`, `@homelync/mocker-next`, `@homelync/mocker-storybook`,
`@homelync/mocker-playwright`, `@homelync/mocker-cli`.

### Why `pnpm publish:local` and not `yalc publish`

`yalc publish` copies the working-tree `package.json` verbatim, and that is wrong
here twice over — silently, both times:

- `exports` points at `./src/*.ts` during development and is swapped for
  `./dist/*.js` by `publishConfig.exports` at publish time. yalc does not apply
  `publishConfig`, and `files` ships only `dist` — so a plain `yalc publish`
  produces a package whose every entry point resolves to a file that is not in
  it.
- Every adapter depends on `@homelync/mocker` as `workspace:^`. npm has no idea
  what that means, so the consumer's install dies.

[`scripts/yalc-publish.mjs`](../scripts/yalc-publish.mjs) runs `pnpm pack` first,
which performs exactly the two transforms publishing performs, then hands yalc
the unpacked tarball. What lands in the store is byte-for-byte what a consumer
would get from the registry.

## Installing in another project

From the consuming project:

```sh
cd ../my-app
yalc add @homelync/mocker @homelync/mocker-next
npm install
```

**Always add `@homelync/mocker` itself**, even when you only import an adapter.
Each adapter depends on `@homelync/mocker@^0.1.0`, and that version exists in no
registry — the top-level copy is what satisfies it.

`yalc add` writes four things: a `file:.yalc/@homelync/…` dependency in
`package.json`, a copy of each package under `.yalc/`, a `yalc.lock`, and a copy
in `node_modules`. The install afterwards is what wires up their dependencies and
bins, so do not skip it.

Ignore the two yalc artefacts in the consumer:

```gitignore
# yalc
.yalc/
yalc.lock
```

Peer dependencies are yours to install, as they would be from npm:

| Package                       | Peers                                        |
| ----------------------------- | -------------------------------------------- |
| `@homelync/mocker`            | `zod@^4.4.3`                                 |
| `@homelync/mocker-next`       | `zod`, `next@^15 \|\| ^16`                   |
| `@homelync/mocker-storybook`  | `zod`, `msw@^2.15`, `vite@^7 \|\| ^8`        |
| `@homelync/mocker-playwright` | `zod`, `@playwright/test`, `playwright-core` |
| `@homelync/mocker-cli`        | `zod`                                        |

`@homelync/mocker-cli` ships a `mocker` bin, which links into
`node_modules/.bin` like any other — `npx mocker <registry> <out>` works from a
yalc install.

### pnpm consumers need one override

npm and yarn dedupe the adapter's `@homelync/mocker@^0.1.0` to the top-level
`file:` copy. pnpm resolves each package's dependencies on their own terms, hits
the registry, and stops:

```
[ERR_PNPM_FETCH_404] GET https://registry.npmjs.org/@homelync%2Fmocker: Not Found - 404
This error happened while installing the dependencies of @homelync/mocker-next@0.1.0
```

Point the nested range at the same local copy. On pnpm 11, overrides live in
`pnpm-workspace.yaml` — the file is read for settings even in a project that is
not a workspace:

```yaml
overrides:
  "@homelync/mocker": file:.yalc/@homelync/mocker
```

On pnpm 10 and earlier, the same entry goes under `pnpm.overrides` in
`package.json`. One entry covers every adapter, since `@homelync/mocker` is the
only package they depend on.

## The update loop

Change something here, then:

```sh
pnpm publish:local:push     # build, publish, push to every project using it
```

```sh
cd ../my-app
npm install                 # or pnpm install
```

`--push` updates every project that has yalc-added a package — the store keeps
the list, so you do not have to. The install afterwards is not optional: a push
_replaces_ files in `.yalc`, and the copy in `node_modules` stays stale until
something relinks it. Restart the dev server too; bundlers cache what they
resolved at startup.

`pnpm publish:local` without `--push` updates the store alone, which is what you
want when the consumer should pick the change up on its own schedule
(`yalc update` there).

## Removing it

```sh
yalc remove --all
npm install
```

That strips the `file:` dependencies, deletes `.yalc/` and unregisters the
project from the store — which also stops a future `--push` from writing into it.
Until the packages are on npm, the reinstall has nothing to fall back to, so do
this only when you are done with them.

## When it does not work

| Symptom                                                      | Cause                                                                                         |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `ERR_PNPM_FETCH_404` for `@homelync/mocker`                  | pnpm without the override above                                                               |
| `Cannot find module '…/dist/index.js'`                       | published without building, or with `yalc publish` instead of `pnpm publish:local`            |
| `does not provide an export named …`                         | the consumer's copies are from different builds — republish all five, then reinstall          |
| A change does not show up                                    | the consumer never reinstalled after the push, or the dev server is still holding the old one |
| `yalc: command not found` from `pnpm publish:local`          | yalc is global and not in this repo's dependencies — `npm install -g yalc`                    |
| The consumer's install pulls `@homelync/*` from the registry | the `file:` dependency was overwritten — `yalc add` the package again                         |
