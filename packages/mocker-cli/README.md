# @magicspon/mocker-cli

Write every endpoint in a
[`@magicspon/mocker`](https://github.com/magicspon/mocker/tree/main/packages/mocker)
registry to disk, as the fixture files the Playwright and Storybook adapters
already replay.

```sh
npm install --save-dev @magicspon/mocker-cli
```

`@magicspon/mocker` comes with it. `zod` (v4) is a peer. ESM only, Node ≥ 24.

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

`@magicspon/mocker-playwright` fails any test that had to _write_ a fixture, and
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
```

| Option                | Effect                                                                    |
| --------------------- | ------------------------------------------------------------------------- |
| `-o, --out <dir>`     | Output directory, if not given as the second argument                     |
| `-e, --export <name>` | Export holding the table (default: `mockRegistry`, `registry`, `default`) |
| `-s, --seed <value>`  | Pin `x-mock-seed` on every request                                        |
| `-c, --count <n>`     | Pin `x-mock-count`, sizing every primary collection                       |
| `-f, --force`         | Overwrite fixtures that already exist                                     |
| `-n, --dry-run`       | Report what would be written, and write nothing                           |
| `--skip-planned`      | Leave out entries carrying a `planned` ticket reference                   |
| `--json`              | Report as JSON on stdout                                                  |

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

## What it fills in, and what it cannot

A registry key names a _shape_, not a URL. `GET /api/property/[reference]` has to
become a request before it can become a file, so every binding — `[reference]` in
a path, `?ref=[reference]` in a query — is filled from the same name rules the
generator applies to field names. `[reference]` comes out as `3BX6S9AC`,
`[deviceId]` as a hex handle, and the value is echoed into the response field of
its own name, exactly as a real request's would be.

The values are derived from the endpoint's method and path, so two machines
produce identical trees and a rerun changes nothing. Adding a query constraint to
an entry does not rename the file its path fixture already lives in.

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
import { generateFixtures, loadRegistry } from '@magicspon/mocker-cli'

const registry = await loadRegistry('./src/mocks/registry.ts')
const results = await generateFixtures(registry, { out: './tests/mocks' })

const failed = results.filter((result) => result.status === 'failed')
if (failed.length > 0) throw new Error(failed[0].reason)
```

`generateFixtures` never throws for a bad entry — the failure lands in that
entry's result, so one broken schema does not cost the others their fixtures.

## Licence

MIT
