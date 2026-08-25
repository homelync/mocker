---
"@homelync/mocker-cli": minor
---

Add `@homelync/mocker-cli`: a `mocker` command that writes every endpoint in a
registry to disk in one go.

```sh
npx mocker ./src/mocks/registry.ts ./tests/mocks
```

The tree it produces is not a new format — it is `fixturePath`'s, unchanged — so
these are the very files `@homelync/mocker-playwright` and
`@homelync/mocker-storybook` already replay. Seeding a fixture store is what the
command is for.

It exists because of the gap the Playwright adapter's strictness leaves. Failing
a test that had to _write_ a fixture is right: a fixture first created by CI is
one nobody reviewed, asserted against faker output with nothing in the diff
saying so. But it means the first person to run a suite after an endpoint is
added meets a wall of failures about files that simply do not exist yet. Now they
are generated, reviewed and committed like any other file.

A registry key names a shape rather than a URL, so every binding — `[reference]`
in a path, `?ref=[reference]` in a query — is filled from the same name rules the
generator applies to field names: `[reference]` becomes `3BX6S9AC`, `[deviceId]`
a hex handle, and the value is echoed into the response field of its own name
exactly as a real request's would be. The values derive from the endpoint's
method and path, so two machines produce identical trees and a rerun changes
nothing. What it cannot guess is a request the table does not fully describe — an
app that also sends `?page=2` is a different request and a different file, and
only running the app records that one.

Existing fixtures are **kept**, because they are committed files somebody may
have edited by hand; `--force` is how you say otherwise. Also `--dry-run`,
`--json`, `--skip-planned`, `--seed` and `--count`. An entry that fails to
generate is reported and the run carries on, so one broken schema does not cost
the others their fixtures.

The same work is exported as `generateFixtures` / `loadRegistry` for a
`globalSetup` or codegen step that would rather not shell out.
