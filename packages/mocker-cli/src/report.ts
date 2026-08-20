import path from 'node:path'
import type { EmitResult, EmitStatus } from './emit'

/**
 * What the run did, in the two forms anyone asks for it.
 *
 * A person reads one line per endpoint and a count at the end; a script reads
 * JSON. Neither is the "real" one — the results array is — which is why this
 * module only formats and never decides anything.
 *
 * No colour, deliberately. This command's most useful home is a `predev` script
 * or a CI step, where its output is a log file rather than a terminal, and ANSI
 * escapes in a log are noise that has to be stripped before it can be read.
 */

/** How many entries ended in each state. */
export type Summary = Readonly<Record<EmitStatus, number>>

/** Tally the results. */
export function summarise(results: readonly EmitResult[]): Summary {
  const summary: Record<EmitStatus, number> = {
    written: 0,
    kept: 0,
    skipped: 0,
    failed: 0,
  }

  for (const result of results) summary[result.status] += 1
  return summary
}

/** Widest status word, so the request column lines up. */
const STATUS_WIDTH = 'written'.length

/** One result, as a line. */
function line(result: EmitResult, root: string): string {
  const status = result.status.padEnd(STATUS_WIDTH)

  const detail =
    result.reason !== undefined
      ? ` — ${result.reason}`
      : result.file === undefined
        ? ''
        : ` → ${path.relative(root, result.file)}`

  return `  ${status}  ${result.request}${detail}`
}

/** The counts, as a sentence, leaving out the states nothing landed in. */
function tally(summary: Summary, total: number): string {
  const parts = (Object.entries(summary) as [EmitStatus, number][])
    .filter(([, count]) => count > 0)
    .map(([status, count]) => `${String(count)} ${status}`)

  const endpoints = `${String(total)} endpoint${total === 1 ? '' : 's'}`
  return parts.length === 0 ? endpoints : `${endpoints}: ${parts.join(', ')}`
}

/** How a run is described, beyond its results. */
export interface ReportContext {
  /** Absolute path to the fixture tree's root. */
  readonly root: string
  /** Whether the files were only described. */
  readonly dryRun: boolean
}

/** The whole report, for a person. */
export function formatReport(
  results: readonly EmitResult[],
  context: ReportContext,
): string {
  const summary = summarise(results)
  const heading = context.dryRun
    ? `Would write into ${context.root}`
    : `Writing into ${context.root}`

  return [
    heading,
    '',
    ...results.map((result) => line(result, context.root)),
    '',
    tally(summary, results.length),
  ].join('\n')
}

/** The whole report, for a script. */
export function formatJsonReport(
  results: readonly EmitResult[],
  context: ReportContext,
): string {
  return JSON.stringify(
    {
      out: context.root,
      dryRun: context.dryRun,
      summary: summarise(results),
      results,
    },
    null,
    2,
  )
}
