import { InvalidControlError } from '@magicspon/mocker'
import { UsageError } from './args'
import { ConfigError } from './config'
import { RegistryLoadError } from './load'

/**
 * What an escaped error is worth, as a value.
 *
 * Separated from `cli.ts` for the reason argument parsing is: this is the one
 * decision the executable makes, every mistake in it is silent — a misuse
 * reported as a failure sends CI looking for a schema to fix, a failure reported
 * as a misuse sends someone re-reading a command line that was fine — and none
 * of it needs a process to exercise. `cli.ts` writes the lines and sets the
 * code; this decides what they are.
 */

/** At least one endpoint could not be generated. */
export const FAILED: number = 1

/** The invocation itself was wrong. */
const MISUSED = 2

/** An escaped error, as an exit code and the lines that explain it. */
export interface Failure {
  /** {@link FAILED}, or `2` for a command line the run could not act on. */
  readonly code: number
  /** What to write to stderr. */
  readonly message: string
  /** The stack, present only when the fault is this command's own. */
  readonly stack?: string
}

/**
 * Which exit code an escaped error deserves, and what to say about it.
 *
 * Only the four named kinds are the *caller's* fault, and each already carries
 * a message naming what it choked on. Anything else is a bug here, so it keeps
 * the failure code, says where the fault lies, and hands back the stack that
 * makes it fixable.
 *
 * @param error whatever escaped the run
 * @returns the exit code and the stderr lines to go with it
 */
export function describeFailure(error: unknown): Failure {
  if (error instanceof UsageError) {
    return {
      code: MISUSED,
      message: `${error.message}\nRun \`mocker --help\`.`,
    }
  }

  // A malformed `--seed` / `--count`: the library's own message already names
  // the header and the range it wanted. A bad config file is the same kind of
  // fault as a bad flag — the invocation, not the registry.
  if (
    error instanceof RegistryLoadError ||
    error instanceof ConfigError ||
    error instanceof InvalidControlError
  ) {
    return { code: MISUSED, message: error.message }
  }

  const reason = error instanceof Error ? error.message : String(error)
  return {
    code: FAILED,
    message: `[mocker] ${reason}`,
    stack: error instanceof Error ? error.stack : undefined,
  }
}
