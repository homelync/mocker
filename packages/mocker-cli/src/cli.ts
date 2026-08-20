#!/usr/bin/env node
import { createRequire } from 'node:module'
import path from 'node:path'
import { parseCliArgs, USAGE } from './args'
import type { CliOptions } from './args'
import { generateFixtures } from './emit'
import { describeFailure, FAILED } from './exit'
import { loadRegistry } from './load'
import { formatJsonReport, formatReport, summarise } from './report'

/**
 * The executable: argv in, files on disk, a report and an exit code out.
 *
 * Thin on purpose. Everything decidable lives in a module that returns a value —
 * `parseCliArgs`, `loadRegistry`, `generateFixtures`, `formatReport`,
 * `describeFailure` — and this file owns only what a process owns: streams and
 * exit codes.
 *
 * The exit codes split "your registry has a problem" from "your command line
 * had a problem", because the two want different reactions in CI: a `1` is a
 * schema to go and fix, a `2` is a script to go and correct.
 */

/** The package's own version, for `--version`. */
function version(): string {
  // `../package.json` from `dist/cli.js` is this package's manifest, which is
  // the file `files` publishes alongside `dist` regardless.
  const manifest = createRequire(import.meta.url)('../package.json') as {
    version: string
  }
  return manifest.version
}

async function run(options: CliOptions): Promise<number> {
  const registry = await loadRegistry(options.registry, options.exportName)
  const results = await generateFixtures(registry, options)

  const context = { root: path.resolve(options.out), dryRun: options.dryRun }
  const report = options.json
    ? formatJsonReport(results, context)
    : formatReport(results, context)

  console.log(report)
  return summarise(results).failed > 0 ? FAILED : 0
}

async function main(argv: readonly string[]): Promise<number> {
  const parsed = parseCliArgs(argv)

  if (parsed.kind === 'help') {
    console.log(USAGE)
    return 0
  }
  if (parsed.kind === 'version') {
    console.log(version())
    return 0
  }

  return run(parsed.options)
}

try {
  process.exitCode = await main(process.argv.slice(2))
} catch (error) {
  const failure = describeFailure(error)
  console.error(failure.message)
  if (failure.stack !== undefined) console.error(failure.stack)
  process.exitCode = failure.code
}
