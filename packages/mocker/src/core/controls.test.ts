import { describe, expect, it } from 'vitest'
import {
  InvalidControlError,
  MOCK_COUNT_HEADER,
  MOCK_DELAY_HEADER,
  MOCK_SEED_HEADER,
  MOCK_STATUS_HEADER,
  readControls,
} from './controls'

/**
 * A control header is rejected rather than ignored. `x-mock-count: twenty` that
 * quietly does nothing is indistinguishable from a mock that never supported
 * counts, and the only symptom is a page that looks subtly wrong.
 */

const headers = (init: Record<string, string> = {}): Headers =>
  new Headers(init)

describe('absent controls', () => {
  it('reads nothing from a bare request', () => {
    expect(readControls(headers())).toEqual({
      status: undefined,
      delayMs: undefined,
      count: undefined,
      seed: undefined,
    })
  })

  it('treats an empty or whitespace-only header as absent', () => {
    // A header set from an empty environment variable is the common case, and
    // it means "no opinion", not "invalid".
    const controls = readControls(
      headers({
        [MOCK_STATUS_HEADER]: '',
        [MOCK_DELAY_HEADER]: '   ',
        [MOCK_COUNT_HEADER]: '',
        [MOCK_SEED_HEADER]: '  ',
      }),
    )

    expect(controls).toEqual({
      status: undefined,
      delayMs: undefined,
      count: undefined,
      seed: undefined,
    })
  })
})

describe('reading controls', () => {
  it('reads every control from one request', () => {
    expect(
      readControls(
        headers({
          [MOCK_STATUS_HEADER]: '503',
          [MOCK_DELAY_HEADER]: '3000',
          [MOCK_COUNT_HEADER]: '5',
          [MOCK_SEED_HEADER]: 'alternate',
        }),
      ),
    ).toEqual({
      status: 503,
      delayMs: 3000,
      count: 5,
      seed: 'alternate',
    })
  })

  it('trims a seed rather than seeding on the whitespace', () => {
    // A seed is hashed verbatim, so a stray space would silently produce a
    // different dataset than the same seed typed without one.
    expect(readControls(headers({ [MOCK_SEED_HEADER]: '  abc  ' })).seed).toBe(
      'abc',
    )
  })

  it('tolerates whitespace around a number', () => {
    expect(readControls(headers({ [MOCK_COUNT_HEADER]: ' 12 ' })).count).toBe(
      12,
    )
  })

  it('accepts a non-standard status, which is a legitimate thing to test', () => {
    expect(readControls(headers({ [MOCK_STATUS_HEADER]: '599' })).status).toBe(
      599,
    )
  })

  it('accepts zero for the controls whose range includes it', () => {
    const controls = readControls(
      headers({ [MOCK_DELAY_HEADER]: '0', [MOCK_COUNT_HEADER]: '0' }),
    )

    // A count of zero is the empty-collection case, not an absent control.
    expect(controls.delayMs).toBe(0)
    expect(controls.count).toBe(0)
  })
})

describe('rejecting malformed controls', () => {
  it('rejects a value that is not a number', () => {
    expect(() =>
      readControls(headers({ [MOCK_COUNT_HEADER]: 'twenty' })),
    ).toThrow(InvalidControlError)
  })

  it('rejects a fractional value', () => {
    expect(() => readControls(headers({ [MOCK_DELAY_HEADER]: '1.5' }))).toThrow(
      InvalidControlError,
    )
  })

  it('names the header, the value and the expected range', () => {
    try {
      readControls(headers({ [MOCK_COUNT_HEADER]: 'twenty' }))
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidControlError)
      const invalid = error as InvalidControlError
      expect(invalid.header).toBe(MOCK_COUNT_HEADER)
      expect(invalid.name).toBe('InvalidControlError')
      expect(invalid.message).toBe(
        `Invalid ${MOCK_COUNT_HEADER}: "twenty". Expected a whole number between 0 and 10000.`,
      )
    }
  })

  it.each([
    [MOCK_STATUS_HEADER, '99'],
    [MOCK_STATUS_HEADER, '600'],
    [MOCK_DELAY_HEADER, '-1'],
    [MOCK_DELAY_HEADER, '30001'],
    [MOCK_COUNT_HEADER, '-1'],
    [MOCK_COUNT_HEADER, '10001'],
  ])('rejects %s outside its range: %s', (header, value) => {
    expect(() => readControls(headers({ [header]: value }))).toThrow(
      InvalidControlError,
    )
  })

  it.each([
    [MOCK_STATUS_HEADER, '100'],
    [MOCK_STATUS_HEADER, '599'],
    [MOCK_DELAY_HEADER, '0'],
    [MOCK_DELAY_HEADER, '30000'],
    [MOCK_COUNT_HEADER, '0'],
    [MOCK_COUNT_HEADER, '10000'],
  ])('accepts %s at its boundary: %s', (header, value) => {
    expect(() => readControls(headers({ [header]: value }))).not.toThrow()
  })

  it('rejects a bad control even when the others are fine', () => {
    expect(() =>
      readControls(
        headers({ [MOCK_STATUS_HEADER]: '200', [MOCK_DELAY_HEADER]: 'slow' }),
      ),
    ).toThrow(/x-mock-delay/)
  })
})
