# @homelync/mocker-cli

Write every endpoint in a
[`@homelync/mocker`](https://github.com/homelync/mocker/tree/main/packages/mocker)
registry to disk, as the fixture files the Playwright and Storybook adapters
already replay.

```sh
npm install --save-dev @homelync/mocker-cli
```

`@homelync/mocker` comes with it. `zod` (v4) is a peer. ESM only, Node ≥ 24.

## Quickstart

```sh
npx mocker ./src/mocks/registry.ts ./tests/mocks
```

```
Writing into /repo/tests/mocks

  written  GET /api/property/3BX6S9AC → GET/api/property/3BX6S9AC/bddd8f9b.json
  written  GET /api/devices?propertyReference=LLBT50P7 → GET/api/devices/888cb83b.json
  written  POST /api/property/ICH593PA/notes → POST/api/property/ICH593PA/notes/bdab8e58.json

3 endpoints: 3 written
```

Commit the tree. That is the whole point.

## Why

`@homelync/mocker-playwright` fails any test that had to _write_ a fixture, and
it is right to: a fixture first created by CI is one nobody reviewed, asserted
against faker output with nothing in the diff saying so. But that strictness
leaves a gap on the other side — someone adds an endpoint, and the first person
to run the suite gets a wall of failures about files that simply do not exist
yet.

This command closes it. Run it when you add an endpoint, review the JSON like
any other file, and the suite is green because the data was checked in rather
than invented on the runner.

The layout is not a new format: it is `fixturePath`'s tree, unchanged, so the
Playwright adapter and the Storybook fixture store both read exactly these
files. Seeding a store is what this command _is_.

## Usage

```
mocker <registry> <out> [options]
mocker <registry> --out <dir> [options]
mocker [options]                        # with a mocker.config.json
```

| Option                 | Effect                                                                    |
| ---------------------- | ------------------------------------------------------------------------- |
| `-o, --out <dir>`      | Output directory, if not given as the second argument                     |
| `--config <file>`      | Config file to read (default: `./mocker.config.json`)                     |
| `-e, --export <name>`  | Export holding the table (default: `mockRegistry`, `registry`, `default`) |
| `-s, --seed <value>`   | Pin `x-mock-seed` on every request                                        |
| `-c, --count <n>`      | Pin `x-mock-count`, sizing every primary collection                       |
| `-l, --locale <names>` | Pin `x-mock-locale`, e.g. `de_CH` or `de_CH,de` (default: `en_GB`)        |
| `-f, --force`          | Overwrite fixtures that already exist                                     |
| `-n, --dry-run`        | Report what would be written, and write nothing                           |
| `--skip-planned`       | Leave out entries carrying a `planned` ticket reference                   |
| `--json`               | Report as JSON on stdout                                                  |

Exit codes: `0` every endpoint accounted for, `1` at least one failed to
generate, `2` the command itself was wrong.

### Existing files are kept

A fixture is a committed, hand-edited, reviewed file, so a second run reports
`kept` and changes nothing. `--force` is how you say otherwise, and it is meant
to be a deliberate act.

That makes the command safe to put in a `predev` or `pretest` script: it fills
the gaps and leaves everything else alone.

```json
{
  "scripts": {
    "mocks": "mocker ./src/mocks/registry.ts ./tests/mocks",
    "pretest:e2e": "pnpm mocks"
  }
}
```

## mocker.config.json

Where the registry is, where the fixtures go, and what to put in a binding are
facts about the _repository_ rather than about a run. State them once:

```json
{
  "registry": "./src/mocks/registry.ts",
  "out": "./tests/mocks",
  "locale": "de_CH",
  "params": { "reference": "ABC123" }
}
```

```sh
mocker            # both paths come from the file
mocker --dry-run  # the flags still work as they did
```

The file is looked for in the working directory, and `--config <file>` names a
different one. Paths in it are relative to _the file_, so `pnpm mocks` means the
same thing from a package as from the repo root. An argument on the command line
wins over the file — the file is the default, the argument is what somebody typed
this time.

| Key        | Effect                                                   |
| ---------- | -------------------------------------------------------- |
| `registry` | The module exporting the table, in place of `<registry>` |
| `out`      | The fixture tree's root, in place of `<out>`             |
| `locale`   | Faker locale names, in place of `--locale`               |
| `params`   | Fixed values for bindings, by name                       |

### `locale`: the language the tree is generated in

`"locale": "de_CH"`, or `["de_CH", "de"]` to put a fallback behind it. It sets
the language of every generated body, and of the values filled into bindings
with them, so a fixture's name reads like the data inside it.

`en` backs whatever you name, because most faker locales define only part of the
data and faker throws on a category none of them covers rather than inventing a
value. A name faker does not ship is refused by the file, or by the flag, rather
than twenty entries deep into a report — which is what catches `de-CH`, the
`Accept-Language` spelling.

An entry that states its own `locale` is overruled, as it is by `--seed` and
`--count`. Fixtures generated under a locale are named apart from those
generated without one, so a tree can hold both and `--force` is not needed to
add a second language.

### `params`: the binding values your app actually sends

Everything else the command does is derived; `params` is the one thing it cannot
work out. `GET /api/property/[reference]` is filled with a plausible reference —
`3BX6S9AC` — and if the app under test asks for `/api/property/ABC123`, the
fixture is written under a name nothing ever reads.

Naming the value fixes that:

```json
{ "params": { "reference": "ABC123" } }
```

Now `[reference]` is `ABC123` everywhere it appears — in a path, in a
`?propertyReference=[reference]` query, and in the response field of that name —
so the tree the command writes is the tree the suite asks for. A binding the file
does not name is guessed as before.

## What it fills in, and what it cannot

A registry key names a _shape_, not a URL. `GET /api/property/[reference]` has to
become a request before it can become a file, so every binding — `[reference]` in
a path, `?ref=[reference]` in a query — is filled from the same name rules the
generator applies to field names. `[reference]` comes out as `3BX6S9AC`,
`[deviceId]` as a hex handle, and the value is echoed into the response field of
its own name, exactly as a real request's would be. A rule is only ever a guess:
`params` in `mocker.config.json` is how you replace one with the value your app
actually sends.

The values are derived from the endpoint's method and path, so two machines
produce identical trees and a rerun changes nothing. Adding a query constraint to
an entry does not rename the file its path fixture already lives in.

A `locale` reaches these too, though it changes fewer of them than you might
expect. Only a rule that reads locale data is affected: `[street]` comes out
Swiss under `de_CH`, while `[reference]` is the same alphanumeric code either
way. And a value that would not survive as a path segment falls back to a code
whatever the locale, so a `[city]` whose name has a space in it — most Swiss
ones — is a code rather than a city.

What it **cannot** guess is a request the registry does not fully describe. A key
states what a request must carry, not everything it may: if your app also sends
`?page=2`, that is a different request, a different hash and a different file.
Run the app or the suite once and the adapter records those; this command covers
the ones the table describes.

### Reading a TypeScript registry

Node strips types from a `.ts` file directly, which covers the usual registry —
every schema a thunk, every type import erased. It does not resolve a tsconfig
`paths` alias, so if your table imports through `@/…`, run the command under a
loader:

```sh
NODE_OPTIONS=--import=tsx mocker ./src/mocks/registry.ts ./tests/mocks
```

`NODE_OPTIONS` rather than `node --import`, because the installed `mocker` is a
shim rather than a file you can hand to `node` yourself. The error message names
this, rather than leaving it to be discovered.

## As a library

The same work, for a `globalSetup` or a codegen step that would rather not shell
out:

```ts
import { generateFixtures, loadRegistry } from '@homelync/mocker-cli'

const registry = await loadRegistry('./src/mocks/registry.ts')
const results = await generateFixtures(registry, { out: './tests/mocks' })

const failed = results.filter((result) => result.status === 'failed')
if (failed.length > 0) throw new Error(failed[0].reason)
```

`generateFixtures` never throws for a bad entry — the failure lands in that
entry's result, so one broken schema does not cost the others their fixtures.

`loadConfig` reads the same `mocker.config.json` the command does, for a setup
step that would rather honour the repository's settings than restate them:

```ts
import path from 'node:path'
import {
  generateFixtures,
  loadConfig,
  loadRegistry,
} from '@homelync/mocker-cli'

const loaded = await loadConfig()
// `dir` is the config file's own directory: what its relative paths mean.
const from = (value: string) =>
  path.resolve(loaded?.dir ?? process.cwd(), value)

const registry = await loadRegistry(
  from(loaded?.config.registry ?? './src/mocks/registry.ts'),
)
await generateFixtures(registry, {
  out: from(loaded?.config.out ?? './tests/mocks'),
  params: loaded?.config.params,
})
```

It returns `undefined` when there is no config file, and throws a `ConfigError`
for one that will not parse or states an option this command does not have.

## Licence

MIT
