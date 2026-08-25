---
"@homelync/mocker-cli": minor
---

Read `mocker.config.json`, so a repository states its arguments once.

```json
{
  "registry": "./src/mocks/registry.ts",
  "out": "./tests/mocks",
  "params": { "reference": "ABC123" }
}
```

```sh
mocker            # both paths come from the file
mocker --dry-run  # the flags still work as they did
```

The file is looked for in the working directory, and `--config <file>` names a
different one. Paths in it are relative to the file, so the command means the
same thing from a package as from the repo root, and an argument on the command
line still wins over the file.

`params` is the half that could not be worked out any other way. A binding is
filled from the generator's name rules — `[reference]` becomes `3BX6S9AC` — and
a rule is only ever a guess: if the app under test asks for
`/api/property/ABC123`, the fixture was written under a name nothing ever read.
Naming the value puts it everywhere the binding appears, in a path, in a query
and in the response field of that name, so the tree the command writes is the
tree the suite asks for.

`loadConfig` is exported alongside it, for a `globalSetup` that would rather
honour the repository's settings than restate them.
