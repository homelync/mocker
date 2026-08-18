/**
 * The requests that must fail the test, and the one message that says so.
 *
 * This module exists because of where the failures happen. A route handler runs
 * outside the test body, so throwing in it rejects a floating promise that
 * nobody awaits — the request hangs, the assertion runs against whatever the
 * page did next, and the test passes. Everything worth failing over is therefore
 * *recorded* during the test and reported in the test fixture's teardown, which
 * is the only place with an after-phase.
 *
 * That is also why the reporting is one error rather than one per request: a
 * page that fetches six undeclared endpoints should say six lines, not fail six
 * times over.
 */

/** A request that was answered but should not have gone unnoticed. */
export interface MockerMiss {
  /**
   * - `fixture-written` — no fixture existed, so one was generated and saved.
   * - `fixture-missing` — the same, but `write: 'none'` meant nothing was saved.
   * - `unmatched` — an in-scope request the registry does not declare.
   * - `error` — the adapter itself threw while answering.
   */
  readonly kind: 'fixture-written' | 'fixture-missing' | 'unmatched' | 'error'
  readonly method: string
  readonly url: string
  /** The fixture file, relative to the store, for the two fixture kinds. */
  readonly file?: string
  /** Why, in the terms the developer can act on. `explainMiss`, or a throw. */
  readonly reason?: string
}

function lines(
  misses: readonly MockerMiss[],
  kind: MockerMiss['kind'],
): string[] {
  return misses
    .filter((miss) => miss.kind === kind)
    .map((miss) => {
      const detail = miss.file ?? miss.reason ?? ''
      return `  ${miss.method} ${miss.url}\n    → ${detail}`
    })
}

function section(heading: string, body: readonly string[]): string[] {
  return body.length === 0 ? [] : ['', heading, ...body]
}

/**
 * Everything recorded during a test, as one error message, or `null` if the run
 * was clean.
 *
 * Exported because the test fixture is not the only way to use this package: an
 * imperative `mockerRoutes()` caller has a `misses` array and no teardown to
 * read it in, and asking them to invent this message themselves would mean two
 * versions of what "the fixture was written, so this run does not count" means.
 *
 * @param misses the controller's ledger, in the order the requests arrived
 * @returns the message to fail with, or `null`
 */
export function describeMisses(misses: readonly MockerMiss[]): string | null {
  if (misses.length === 0) return null

  const report = [
    `[mocker] ${String(misses.length)} request${misses.length === 1 ? '' : 's'} in this test need attention.`,
    ...section(
      // The snapshot rule, and the reason this is not merely a warning: a
      // fixture written by CI lives and dies inside the container, so a test
      // that passed on a generated file asserted on faker output and said
      // nothing. Failing once, here, is what puts the file in the diff.
      'Fixtures were written. Review them, commit them, and run again:',
      lines(misses, 'fixture-written'),
    ),
    ...section(
      'Fixtures are missing and `write: "none"` forbade writing them:',
      lines(misses, 'fixture-missing'),
    ),
    ...section(
      "Requests the registry does not declare. Add them, or set `unmatched: 'passthrough'`:",
      lines(misses, 'unmatched'),
    ),
    ...section(
      'The mock adapter failed while answering these:',
      lines(misses, 'error'),
    ),
  ]

  return report.join('\n')
}
