/**
 * `@magicspon/mocker-cli` — every endpoint in a registry, written to disk.
 *
 * The command is `mocker <registry> <out>`; this entry is the same work as
 * functions, for a repo that would rather call it from a `predev` script, a
 * Playwright `globalSetup` or a codegen step than shell out to a binary.
 *
 * What it produces is not a new format. It is `fixturePath`'s tree — the very
 * files `@magicspon/mocker-playwright` and `@magicspon/mocker-storybook` replay
 * — so this command *seeds a fixture store* rather than exporting a copy of one.
 * That is the whole reason it exists: a Playwright suite is strict about missing
 * fixtures, and a fixture first created by CI is one nobody reviewed.
 *
 * Node-only, and unapologetically: there is a filesystem in every line of it.
 * Nothing here is imported by the runtime packages, so their entry-point rules
 * are untouched.
 */

export { generateFixtures } from './emit'
export type { EmitOptions, EmitResult, EmitStatus } from './emit'

export { loadRegistry, RegistryLoadError } from './load'

// Filling a key's bindings, exported because it is the only *guess* this package
// makes: a caller who wants to know which URL an endpoint was recorded under —
// to request it, or to reproduce it — has to be able to ask.
export { bindingValue, declaredRequest } from './requests'

export { formatJsonReport, formatReport, summarise } from './report'
export type { ReportContext, Summary } from './report'

// Argument parsing is not here. `cli.ts` is the only thing that has arguments,
// and a caller of `generateFixtures` already has the options in hand.
