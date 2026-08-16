import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatMockLog, isMockLogEnabled, logMock } from './log'

/**
 * The log line is the whole feature, so it is asserted as text.
 *
 * `formatMockLog` exists to make that possible without capturing a console: the
 * thing worth pinning is the message a developer reads, not the fact that
 * something was written somewhere.
 */

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('the line a developer reads', () => {
  it('names the method, the path and the status', () => {
    expect(
      formatMockLog({
        method: 'GET',
        target: '/api/portfolio/reports/devices?page=1&limit=20',
        status: 200,
        durationMs: 4,
      }),
    ).toBe('[mock] 200 GET /api/portfolio/reports/devices?page=1&limit=20 4ms')
  })

  it('carries the reason when there is one', () => {
    expect(
      formatMockLog({
        method: 'DELETE',
        target: '/api/property/ABC123',
        status: 404,
        durationMs: 1,
        note: 'No mock declared for DELETE /api/property/ABC123',
      }),
    ).toBe(
      '[mock] 404 DELETE /api/property/ABC123 1ms — No mock declared for DELETE /api/property/ABC123',
    )
  })

  it('rounds the duration, since sub-millisecond precision is noise', () => {
    const line = formatMockLog({
      method: 'GET',
      target: '/api/health',
      status: 200,
      durationMs: 3.7261,
    })

    expect(line).toContain(' 4ms')
  })
})

describe('which stream it writes to', () => {
  it('warns for a failure, so a miss stands out in a scrolling log', () => {
    vi.stubEnv('MOCK_LOG', '')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    logMock({
      method: 'GET',
      target: '/api/nope',
      status: 404,
      durationMs: 1,
    })

    expect(warn).toHaveBeenCalledTimes(1)
    expect(log).not.toHaveBeenCalled()
  })

  it('logs a served response normally', () => {
    vi.stubEnv('MOCK_LOG', '')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    logMock({
      method: 'GET',
      target: '/api/property/search',
      status: 200,
      durationMs: 2,
    })

    expect(log).toHaveBeenCalledTimes(1)
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('MOCK_LOG', () => {
  it('is on by default, because a mock nobody can see is the problem', () => {
    vi.stubEnv('MOCK_LOG', '')
    expect(isMockLogEnabled()).toBe(true)
  })

  it.each(['0', 'false', 'off', 'no', 'OFF'])('is silenced by %s', (value) => {
    vi.stubEnv('MOCK_LOG', value)
    expect(isMockLogEnabled()).toBe(false)
  })

  it('writes nothing at all when silenced', () => {
    vi.stubEnv('MOCK_LOG', '0')
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    logMock({ method: 'GET', target: '/api/x', status: 200, durationMs: 1 })
    logMock({ method: 'GET', target: '/api/x', status: 500, durationMs: 1 })

    expect(log).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
  })
})
