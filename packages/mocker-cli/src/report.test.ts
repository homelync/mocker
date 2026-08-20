import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { EmitResult } from './emit'
import { formatJsonReport, formatReport, summarise } from './report'

const root = path.resolve('/mocks')

const results: readonly EmitResult[] = [
  {
    key: 'GET /api/property/[reference]',
    status: 'written',
    request: 'GET /api/property/ABC123',
    file: path.join(root, 'GET/api/property/ABC123/cb472436.json'),
  },
  {
    key: 'GET /api/devices',
    status: 'kept',
    request: 'GET /api/devices',
    file: path.join(root, 'GET/api/devices/19fc3dad.json'),
  },
  {
    key: 'GET /api/timeline',
    status: 'skipped',
    request: 'GET /api/timeline',
    reason: 'planned (WP-101)',
  },
  {
    key: 'POST /api/notes',
    status: 'failed',
    request: 'POST /api/notes',
    reason: 'Mock generation failed: unsupported schema',
  },
]

const context = { root, dryRun: false }

describe('summarise', () => {
  it('counts every state, including the empty ones', () => {
    expect(summarise(results)).toEqual({
      written: 1,
      kept: 1,
      skipped: 1,
      failed: 1,
    })
  })

  it('counts nothing for no results', () => {
    expect(summarise([])).toEqual({
      written: 0,
      kept: 0,
      skipped: 0,
      failed: 0,
    })
  })
})

describe('formatReport', () => {
  const report = formatReport(results, context)

  it('names the root once, at the top', () => {
    expect(report.split('\n')[0]).toBe(`Writing into ${root}`)
  })

  it('says "would write" on a dry run', () => {
    expect(formatReport(results, { root, dryRun: true })).toContain(
      `Would write into ${root}`,
    )
  })

  it('shows a fixture relative to the root', () => {
    expect(report).toContain('GET /api/property/ABC123 → GET/api/property')
    expect(report).not.toContain(path.join(root, 'GET'))
  })

  it('shows a reason instead of a file when there is one', () => {
    expect(report).toContain('GET /api/timeline — planned (WP-101)')
  })

  it('tallies only the states something landed in', () => {
    const tally = formatReport(results.slice(0, 1), context).split('\n').pop()
    expect(tally).toBe('1 endpoint: 1 written')
  })

  it('tallies every state that has a count', () => {
    expect(report.split('\n').pop()).toBe(
      '4 endpoints: 1 written, 1 kept, 1 skipped, 1 failed',
    )
  })
})

describe('formatJsonReport', () => {
  it('carries the summary and the root', () => {
    expect(JSON.parse(formatJsonReport(results, context))).toMatchObject({
      out: root,
      dryRun: false,
      summary: { written: 1, kept: 1, skipped: 1, failed: 1 },
    })
  })

  it('carries every result, unchanged', () => {
    const parsed: unknown = JSON.parse(formatJsonReport(results, context))
    expect(parsed).toHaveProperty('results', [...results])
  })
})
