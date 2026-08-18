import { describe, expect, it } from 'vitest'
import { describeMisses } from './miss'
import type { MockerMiss } from './miss'

/**
 * This message is the entire user interface of the strictness rules — it is what
 * someone reads at the moment their test went red for a reason they did not
 * expect. It has to name the file, name the request, and say what to do next.
 */

const written: MockerMiss = {
  kind: 'fixture-written',
  method: 'GET',
  url: 'http://localhost:3000/api/devices',
  file: '/repo/mocks/GET/api/devices/3f9a1c2d.json',
}

const unmatched: MockerMiss = {
  kind: 'unmatched',
  method: 'POST',
  url: 'http://localhost:3000/api/orders',
  reason: 'No mock registered for POST /api/orders',
}

describe('the teardown report', () => {
  it('says nothing about a clean run', () => {
    expect(describeMisses([])).toBeNull()
  })

  it('names the fixture that was written, and what to do with it', () => {
    const report = describeMisses([written]) ?? ''

    expect(report).toContain('/repo/mocks/GET/api/devices/3f9a1c2d.json')
    expect(report).toContain('GET http://localhost:3000/api/devices')
    expect(report).toContain('commit')
  })

  it('quotes the reason nothing matched', () => {
    // `explainMiss` already distinguishes "not registered" from "declared only
    // with these query constraints" — repeating it here would be a second, worse
    // explanation of the same thing.
    expect(describeMisses([unmatched])).toContain(
      'No mock registered for POST /api/orders',
    )
  })

  it('reports every request once, in one error', () => {
    // A page that fetches six undeclared endpoints should say six lines, not
    // fail six times over.
    const report = describeMisses([written, unmatched]) ?? ''

    expect(report.startsWith('[mocker] 2 requests')).toBe(true)
    expect(report).toContain('/repo/mocks/GET/api/devices/3f9a1c2d.json')
    expect(report).toContain('/api/orders')
  })

  it('keeps the four kinds under their own headings', () => {
    const report =
      describeMisses([
        written,
        { ...written, kind: 'fixture-missing' },
        unmatched,
        {
          kind: 'error',
          method: 'GET',
          url: 'http://localhost:3000/api/devices',
          reason: 'the schema module is broken',
        },
      ]) ?? ''

    expect(report).toContain('Fixtures were written')
    expect(report).toContain('write: "none"')
    expect(report).toContain('does not declare')
    expect(report).toContain('failed while answering')
  })

  it('counts one request in the singular', () => {
    expect(describeMisses([written])?.startsWith('[mocker] 1 request in')).toBe(
      true,
    )
  })
})
