import { describe, expect, it } from 'vitest'
import { UnknownOverridePathError, UnsupportedSchemaError } from './errors'

/**
 * Both errors carry structured fields because a caller — the registration-time
 * validator, an adapter's 500 handler — needs the path, not just the prose.
 */

describe('UnsupportedSchemaError', () => {
  it('names the zod type and the path', () => {
    const error = new UnsupportedSchemaError('map', 'results[].readings')

    expect(error.message).toContain('"map"')
    expect(error.message).toContain('results[].readings')
    expect(error.zodType).toBe('map')
    expect(error.path).toBe('results[].readings')
  })

  it('spells the root path as <root> rather than an empty quote', () => {
    expect(new UnsupportedSchemaError('date', '').message).toContain('<root>')
  })

  it('is an Error with a stable name', () => {
    const error = new UnsupportedSchemaError('date', '')

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('UnsupportedSchemaError')
  })
})

describe('UnknownOverridePathError', () => {
  const known = ['', 'results', 'results[]', 'results[].statusId']

  it('names the offending path and keeps the known set', () => {
    const error = new UnknownOverridePathError('results[].statusID', known)

    expect(error.message).toContain('"results[].statusID"')
    expect(error.path).toBe('results[].statusID')
    expect(error.knownPaths).toEqual(known)
    expect(error.name).toBe('UnknownOverridePathError')
  })

  it('suggests the intended path on a case mismatch', () => {
    // The overwhelmingly common typo, and the one that is otherwise silent.
    const error = new UnknownOverridePathError('results[].statusID', known)

    expect(error.message).toContain('Did you mean "results[].statusId"?')
  })

  it('lists the known paths when there is nothing close', () => {
    const error = new UnknownOverridePathError('nope', known)

    expect(error.message).not.toContain('Did you mean')
    expect(error.message).toContain('Known paths: , results, results[]')
  })

  it('truncates a long known-path list rather than printing a schema', () => {
    const many = Array.from({ length: 20 }, (_unused, i) => `f${String(i)}`)
    const error = new UnknownOverridePathError('nope', many)

    expect(error.message).toContain('Known paths include: f0, f1')
    expect(error.message).toContain('f7, ...')
    expect(error.message).not.toContain('f8')
  })

  it('keeps the full list at exactly the truncation threshold', () => {
    const eight = Array.from({ length: 8 }, (_unused, i) => `f${String(i)}`)
    const error = new UnknownOverridePathError('nope', eight)

    expect(error.message).toContain(
      'Known paths: f0, f1, f2, f3, f4, f5, f6, f7',
    )
    expect(error.message).not.toContain('...')
  })
})
