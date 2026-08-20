import { InvalidControlError } from '@magicspon/mocker'
import { describe, expect, it } from 'vitest'
import { UsageError } from './args'
import { describeFailure, FAILED } from './exit'
import { RegistryLoadError } from './load'

const MISUSED = 2

describe('describeFailure', () => {
  it('calls a bad command line a misuse, and points at --help', () => {
    const failure = describeFailure(new UsageError('Missing <out>.'))

    expect(failure.code).toBe(MISUSED)
    expect(failure.message).toBe('Missing <out>.\nRun `mocker --help`.')
    expect(failure.stack).toBeUndefined()
  })

  it("calls an unloadable registry a misuse, in the loader's own words", () => {
    const failure = describeFailure(new RegistryLoadError('No such module.'))

    expect(failure.code).toBe(MISUSED)
    expect(failure.message).toBe('No such module.')
  })

  it('calls a bad control header a misuse', () => {
    const failure = describeFailure(
      new InvalidControlError('x-mock-count', 'many', 'a whole number'),
    )

    expect(failure.code).toBe(MISUSED)
    expect(failure.message).toContain('x-mock-count')
  })

  // The distinction the exit codes exist for: a bug here must not send anyone
  // off to re-read a command line that was correct.
  it('calls anything else a failure, and keeps the stack', () => {
    const failure = describeFailure(new TypeError('x is not a function'))

    expect(failure.code).toBe(FAILED)
    expect(failure.message).toBe('[mocker] x is not a function')
    expect(failure.stack).toContain('TypeError')
  })

  it('reports a thrown non-error as a failure too', () => {
    const failure = describeFailure('exploded')

    expect(failure.code).toBe(FAILED)
    expect(failure.message).toBe('[mocker] exploded')
    expect(failure.stack).toBeUndefined()
  })
})
