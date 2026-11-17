# Node.js project settings - Compliance (pnpm)

As part of hardening HomeLink's dependency supply chain against npm-ecosystem attacks, we've layered
controls across both where packages are allowed to come from and when new versions become eligible
for use.

We also need every project to use the same Node version everywhere, and to pick up vulnerabilities
as soon as possible. This also helps audits show which versions of Node and its packages are in use.

Other tasks in this document improve code quality, build speed and production bundle size, and
further reduce the risk of deploying code with vulnerabilities.

This version of the document is for projects that use **pnpm 11 or later**. Most of the npm
`.npmrc` settings have a pnpm equivalent, but pnpm reads them from `pnpm-workspace.yaml`, not
`.npmrc`.

---

The following tasks make sure the same Node version is used locally, in CI and in deployment, and
add several other deployment safeguards.

## .nvmrc

`.nvmrc` is a plain text file in the root of a repository that declares which version of Node.js
the project uses. It contains a single line, which should be a valid `semver` version.

<https://nodejs.org/en/blog/vulnerability/october-2026-security-releases>

```
24.22.1
```

## pnpm-workspace.yaml

pnpm reads its security settings from `pnpm-workspace.yaml` in the repository root. Put them there
even if the project is not a monorepo: pnpm reads settings from this file in single-package projects
too.

This table shows the pnpm setting for each npm setting:

| npm (`.npmrc`)                        | pnpm (`pnpm-workspace.yaml`)                |
| ------------------------------------- | ------------------------------------------- |
| `min-release-age=3`                   | `minimumReleaseAge: 4320`                   |
| `min-release-age-exclude=@homelync/*` | `minimumReleaseAgeExclude: ['@homelync/*']` |
| `strict-allow-scripts=true`           | `strictDepBuilds: true`                     |
| `allowScripts` in `package.json`      | `allowBuilds`                               |
| `allow-git=none`                      | `blockExoticSubdeps: true`                  |
| `engine-strict=true`                  | `engineStrict: true`                        |

A complete example:

```yaml
strictDepBuilds: true

allowBuilds:
  esbuild@0.28.2: true
  msw@2.15.0: false

blockExoticSubdeps: true

engineStrict: true

# 3 days, in minutes
minimumReleaseAge: 4320
minimumReleaseAgeExclude:
  - '@homelync/*'
```

### minimumReleaseAge

`minimumReleaseAge: 4320` is the "cooldown" setting. pnpm measures it in **minutes**, so 4320 is 3
days. pnpm treats any package version published less than 3 days ago as not installable. When you
run `pnpm install` or `pnpm update`, pnpm picks the newest version that is at least 3 days old
rather than the absolute latest.

Why: most malicious npm supply-chain incidents (compromised maintainer accounts, hijacked publish
tokens) are found and unpublished within hours to a couple of days. A cooldown means you're never in
the first wave of installs for a bad release. pnpm enforces it at install time, so it applies in the
same way in CI and local development.

This is an install-time control. It has no effect on versions already resolved in `pnpm-lock.yaml`.
That's where the Dependabot `cooldown` block or Renovate `minimumReleaseAge` comes in (see below).
If the two aren't aligned, the bot can open a PR for a version that pnpm will then refuse to install
in CI.

**Emergencies.** If an urgent fix can't wait 3 days, add that exact version to
`minimumReleaseAgeExclude` (for example `- 'some-package@1.2.3'`) and remove the entry once the
version is older than 3 days. Pin the version so the exception covers only the release you checked.

### minimumReleaseAgeExclude

`'@homelync/*'` exempts our internal packages from the cooldown. They are published often, and it's
safe because those packages are built under the same settings.

### strictDepBuilds and allowBuilds

Lifecycle scripts (`preinstall`, `install`, `postinstall`) are a common supply-chain attack vector:
a compromised package can run any code the moment it's installed.

pnpm checks each dependency's build scripts against the `allowBuilds` list. With
`strictDepBuilds: true`, a script that isn't listed fails the install, so nothing starts running, or
silently stops running, without someone reviewing it. This is pnpm's default from version 11, but
set it explicitly so the policy is visible in the file.

`allowBuilds` is committed with the code, so the same policy applies locally and in CI.

- `pkg@x.y.z: true` - the build script for this exact version has been reviewed and may run.
- `pkg@x.y.z || x.y.w: true` - more than one reviewed version.
- `pkg@x.y.z: false` or `pkg: false` - the script is skipped and the install continues.
- Use the package's registry name, not an alias.

**Only approve scripts the project needs.** Approve a script only if the package breaks without it.
To check, deny it, delete `node_modules`, run `pnpm install`, and confirm the app still builds and
its tests pass.

**Pin every approval.** A name-only approval (`pkg: true`) lets every future version's script run,
so a compromised release would run without review and only `minimumReleaseAge` would stand in the
way. A pinned approval (`pkg@1.2.3: true`) covers only the version that was reviewed.

**Managing the list.**

```
pnpm ignored-builds              # list packages whose build scripts were blocked
pnpm approve-builds <pkg>        # approve a package
pnpm approve-builds '!<pkg>'     # deny a package
```

Check the result rather than trusting it. `pnpm approve-builds`, and pnpm itself when it finds an
unlisted script, write **name-only** entries. Change each one to the exact version from
`pnpm-lock.yaml` by hand. A clean `pnpm install` is the real test.

**Dependency bot PRs.** When Renovate or Dependabot bumps a package with a pinned approval,
`pnpm install` fails in CI until the new version is approved. To unblock it, check out the PR branch,
review the new version's build script, update the version in `allowBuilds`, and push. This manual
step is intended. Keep it rare by approving as few packages as possible.

### blockExoticSubdeps

`blockExoticSubdeps: true` stops transitive dependencies from installing from a git repository or a
tarball URL. Such a dependency pulls code straight from a git ref, which skips the registry and
therefore skips `minimumReleaseAge`, registry malware scanning and the registry's audit trail.

It applies to dependencies of dependencies. pnpm has no setting that blocks git specifiers in your
own `package.json` files, so reviewers should reject any `git+https://...` or `github:` dependency
there. (The `repository.url` field is fine: it's metadata, not a dependency.)

### engineStrict

By default pnpm only warns when the running Node version doesn't match `engines`. `engineStrict: true`
makes it fail the install instead. pnpm always fails when its own version doesn't match
`engines.pnpm`.

### overrides

`pnpm audit --fix` (see below) writes `overrides` to `pnpm-workspace.yaml` to force patched versions
of transitive dependencies. It often writes several overlapping entries for the same package. Keep
only the one with the highest floor, and remove entries once nothing in the lockfile needs them.

## package.json settings

The `engines` field declares which Node version the project supports. pnpm checks it against the
running Node version when installing dependencies.

```json
"packageManager": "pnpm@12.3.4",
"engines": {
  "node": ">=24.22.0 <25",
  "pnpm": ">=12.3.4 <13"
}
```

- CI fails if `.nvmrc` is moved outside the supported range, such as an accidental major bump.

This keeps `engines` and `.nvmrc` in step.

`engines.pnpm` makes installs use a pnpm version that supports every setting in
`pnpm-workspace.yaml`. Older pnpm versions ignore settings they don't know without warning.

`packageManager` pins the exact pnpm version. Corepack and the `pnpm/action-setup` GitHub Action read
it, so CI uses the same version as local development.

**Published packages.** In a package that other projects install, `engines` describes what
_consumers_ need. Don't add an upper limit (such as `<25`) there unless the package really fails on
newer Node versions. Set the strict range in the private root `package.json` only.

TLDR; When upgrading Node, update `.nvmrc` and `engines` in the same change.

---

## Pulumi and other sub-projects

Where these settings go depends on whether the sub-project is a pnpm workspace package or a separate
project.

**Workspace package** (matched by `packages` in the root `pnpm-workspace.yaml`, one root
`pnpm-lock.yaml`):

- Put the settings, `engines` and `packageManager` in the root only.
- `pnpm install` at the root installs every workspace package under the root settings.

**Separate project** (has its own `package.json` and `pnpm-lock.yaml`, installed with something like
`cd pulumi && pnpm install --frozen-lockfile`):

- It needs its own `pnpm-workspace.yaml` settings, `engines` and `packageManager`, because the root
  settings don't apply to it.
- Its CI workflow should also use `node-version-file` pointing at the root `.nvmrc`.

Not sure which you have? If the sub-folder has its own `pnpm-lock.yaml`, it's a separate project.

---

## Dependency audit

Once the Node version has been updated in `.nvmrc`, run the following:

```
nvm install
pnpm install
pnpm audit --fix
pnpm install
```

`pnpm audit --fix` adds `overrides` to `pnpm-workspace.yaml`; the second `pnpm install` applies them
to the lockfile. Run `pnpm audit` afterwards to confirm nothing is left.

Why run the audit after a version upgrade?

- Catch any `critical` or `high` package vulnerabilities.
- A Node upgrade is already a dependency change, so it is the right moment to clear outstanding
  vulnerabilities in one reviewable change.
- Some packages behave differently or need newer releases on a new Node version. Reinstalling shows
  these issues locally rather than in CI or production.
- Committing the regenerated `pnpm-lock.yaml` makes CI install exactly what was tested locally.

## GitHub workflows

Install pnpm first, then Node. `actions/setup-node` can only cache pnpm's store once pnpm is
installed.

```yaml
# No `version`: the action reads `packageManager` from package.json.
- uses: pnpm/action-setup@v6

- uses: actions/setup-node@v7
  with:
    node-version-file: '.nvmrc'
    cache: pnpm

- run: pnpm install --frozen-lockfile
```

`node-version-file` replaces any `node-version: '24'` (or similar) hard-coded in the workflow. Every
workflow that installs Node - build, test, lint, release - should use it, so a change to `.nvmrc`
applies everywhere without editing workflow files. Leaving `version` off `pnpm/action-setup` does
the same for pnpm.

`cache: pnpm` caches pnpm's package store between workflow runs. The cache key is a hash of
`pnpm-lock.yaml`. It caches the downloaded packages, not `node_modules`, which speeds up builds even
when the lockfile changes.

`--frozen-lockfile` makes CI fail if `pnpm-lock.yaml` is out of date, instead of quietly resolving
new versions. pnpm uses it by default in CI, but write it out so the intent is clear.

## Vulnerability handling - Dependabot / Renovate

First, turn on `dependency graph` and `dependabot alerts` for the repository if they aren't already
on.

`https://github.com/homelync/[your-repo]/settings/security_analysis`

This lets Vanta, our auditing software, see which vulnerabilities a repository has.

Then choose either Dependabot or Renovate to create package update PRs, which prompt teams to
maintain the repository and patch vulnerabilities. Both support pnpm and update `pnpm-lock.yaml`.

---

### Dependabot settings

#### `dependabot.yml`

Use `package-ecosystem: "npm"` - Dependabot detects pnpm from `pnpm-lock.yaml`. Dependabot should run
at least once a week.

`cooldown.default-days: 3` is the Dependabot equivalent of `minimumReleaseAge`. It's a _separate_
mechanism from pnpm's: Dependabot's cooldown delays when it _opens a PR_ for a new version (measured
from that version's publish date), whereas pnpm's `minimumReleaseAge` delays when pnpm will
_install_ a version. Setting both to 3 days keeps them in step - Dependabot won't propose a bump
until pnpm would install it.

#### Stop upgrading Node types beyond the installed Node version

Add the following to `dependabot.yml` so Dependabot ignores major version updates for the Node types
package. This keeps the Node typings aligned with the Node version the repository uses. You will
have to do major version updates yourself, together with a Node upgrade.

```yaml
ignore:
  - dependency-name: '@types/node'
    update-types: ['version-update:semver-major']
```

Other notes:

- Dependabot's cooldown accepts finer-grained keys (`semver-major-days`, `semver-minor-days`,
  `semver-patch-days`) that override `default-days` per bump type. We don't use these, so all bump
  types get the same 3-day wait.
- Security-update PRs from Dependabot are not delayed by the cooldown, so vulnerability patches
  still arrive immediately. That's why the 3-day wait doesn't leave known vulnerabilities unpatched.
  To install a patched version that is less than 3 days old, add it to `minimumReleaseAgeExclude`
  (see above).

#### `dependabot.test.ts` - Dependabot unit tests

Only needed if your `dependabot.yml` uses `groups`.

Without groups, Dependabot opens a separate PR for each dependency and picks up new dependencies
automatically, so there's nothing to drift and no test is needed.

With groups, the configuration can easily drift as packages are added and removed. This unit test
checks that every dependency is covered by a Dependabot group pattern, and that no pattern is stale.

For an example, see this [config](https://github.com/homelync/kafka-consumer-alerts/blob/master/.github/dependabot.yaml)
and [unit test](https://github.com/homelync/kafka-consumer-alerts/blob/master/dependabot.test.ts),
which keep `package.json` and the Dependabot groups aligned.

### Renovate

For a Renovate example, see this
[config](https://github.com/homelync/homelink-component-library/blob/master/renovate.json).

Add these to `renovate.json`:

```json
"minimumReleaseAge": "3 days",
"packageRules": [
  {
    "matchPackageNames": ["@types/node"],
    "matchUpdateTypes": ["major"],
    "enabled": false
  }
]
```

- `minimumReleaseAge` does the same job as Dependabot's `cooldown.default-days`. Keep it equal to
  `minimumReleaseAge` in `pnpm-workspace.yaml` (Renovate uses days; pnpm uses minutes).
- The `@types/node` rule does the same job as the Dependabot `ignore` block above.

The main benefits of self-hosted Renovate over Dependabot:

- **More configuration:** detailed control over grouping, schedules, versioning, automerge and
  update behaviour.
- **Smarter PR grouping:** combine updates by dependency type, package, scope or custom rules.
- **Flexible scheduling:** run updates at specific times, including outside working hours.
- **More package managers:** broader support for ecosystems and custom managers.
- **Custom automerge rules:** automate patch and minor updates selectively, with checks and
  safeguards.
- **Release visibility:** one place for the team to see pending dependency updates and upcoming
  releases.
- **Update control:** users can approve, pause or trigger updates directly from the dashboard issue.
- **Visibility into blocked updates:** shows updates waiting on schedules, constraints or other
  conditions.

---

The tasks below are work in progress and can be ignored for now.

## Linting

\[WIP\] - [Linting](https://homelync.atlassian.net/wiki/spaces/TV/pages/4308467724/Linting)

## Knip

\[WIP\] - [Knip](https://homelync.atlassian.net/wiki/spaces/TV/pages/4308893707/Knip)

## Build spec workflows (for Cloud Build projects)

\[Older repos - TODO\]
