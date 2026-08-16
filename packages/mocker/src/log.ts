/**
 * What a mocked request looks like in the terminal.
 *
 * Deliberately outside `core/`, for the same reason as `flag.ts`: writing to a
 * console is a host convention, not part of the generator, and `core` is kept
 * free of side effects so it can be used as a fixture factory in a test without
 * narrating every call. The adapters are the runtime layer, and a terminal is a
 * runtime fact — so they call this and `core` does not.
 *
 * The line exists to answer one question at a glance: *is this response real?*
 * A mocked endpoint that silently works looks exactly like a real one that
 * silently works, right up until the data is wrong. `x-mock: 1` answers it in
 * devtools; this answers it in the terminal you already have open.
 */

/** Prefix every line carries, so `npm run dev | grep mock` works. */
const PREFIX = '[mock]'

/** `MOCK_LOG` values that silence the log. */
const DISABLED = ['0', 'false', 'off', 'no']

/** Statuses that mean the request was not served from a schema. */
const ERROR_STATUS = 400

/**
 * The environment, or an empty one.
 *
 * Guarded exactly as `flag.ts` guards it: a browser runtime has no `process` at
 * all, and a bare `process.env` there is a `ReferenceError` at import time.
 */
function environment(): Partial<Record<string, string>> {
  return typeof process === 'undefined' ? {} : process.env
}

/**
 * Whether to write anything.
 *
 * On by default whenever mocking is on, because a mock nobody can see is the
 * failure mode this exists to prevent. `MOCK_LOG=0` turns it off — which is what
 * the verify suites do, since a few hundred generated responses per run would
 * bury the assertions that matter.
 */
export function isMockLogEnabled(): boolean {
  const flag = environment().MOCK_LOG?.trim().toLowerCase() ?? ''
  return !DISABLED.includes(flag)
}

/** One served request, as the log describes it. */
export interface MockLogEntry {
  /** The verb, uppercase. */
  readonly method: string
  /** The path the **caller** asked for, query string included. */
  readonly target: string
  /** The status actually returned. */
  readonly status: number
  /** Wall time spent in the mock, including any `x-mock-delay`. */
  readonly durationMs: number
  /**
   * Why this was not a plain success — a registry miss, a generation failure.
   *
   * Carried separately rather than read back out of the response body, because
   * reading the body would consume the stream the caller is about to receive.
   */
  readonly note?: string
}

/**
 * Render one entry.
 *
 * Split from {@link logMock} so the format can be asserted without capturing a
 * console — the thing being tested is the message, not the side effect.
 */
export function formatMockLog(entry: MockLogEntry): string {
  const timing = `${String(Math.round(entry.durationMs))}ms`
  const head = `${PREFIX} ${String(entry.status)} ${entry.method} ${entry.target} ${timing}`

  return entry.note === undefined ? head : `${head} — ${entry.note}`
}

/**
 * Write one served request to the terminal.
 *
 * `console.warn` for anything from 400 up: a miss or a generation failure is the
 * case worth spotting in a scrolling dev log, and it is the case a developer is
 * usually looking for when they come to read this output at all.
 */
export function logMock(entry: MockLogEntry): void {
  if (!isMockLogEnabled()) return

  const line = formatMockLog(entry)
  if (entry.status >= ERROR_STATUS) {
    console.warn(line)
    return
  }
  console.log(line)
}
