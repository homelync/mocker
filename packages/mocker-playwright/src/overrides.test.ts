import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { CheckedMockRegistry, MockRegistryDraft } from '@magicspon/mocker'
import { findOverride, overrideRegistry } from './overrides'
import type { MockerOverride } from './overrides'

/**
 * Precedence, on its own.
 *
 * Worth a unit of its own because getting it wrong fails *silently*: an override
 * that does not win returns plausible global data, the page renders, and the
 * assertion fails looking like a component bug.
 */

const schema = z.object({ results: z.array(z.string()) })

const registry = {
  'GET /api/devices': { schema: () => Promise.resolve(schema) },
  'GET /api/devices?mode=full': { schema: () => Promise.resolve(schema) },
} as const satisfies MockRegistryDraft

const mockRegistry = registry satisfies CheckedMockRegistry<typeof registry>

const at = (key: string, options = {}): MockerOverride => ({ key, options })

const url = (search = ''): URL =>
  new URL(`http://localhost:3000/api/devices${search}`)

describe('choosing an override', () => {
  it('finds none in an empty list', () => {
    expect(findOverride([], 'GET', url())).toBeNull()
  })

  it('lets the last one win', () => {
    const first = at('GET /api/devices', { count: 5 })
    const second = at('GET /api/devices', { count: 1 })

    expect(findOverride([first, second], 'GET', url())).toBe(second)
  })

  it('skips one whose key is for another endpoint', () => {
    const other = at('GET /api/property/[reference]')
    const devices = at('GET /api/devices')

    expect(findOverride([devices, other], 'GET', url())).toBe(devices)
  })

  it('skips one whose query conditions this request does not meet', () => {
    // Overriding one of two keys on a shared path must leave the other alone.
    const full = at('GET /api/devices?mode=full')

    expect(findOverride([full], 'GET', url('?mode=summary'))).toBeNull()
    expect(findOverride([full], 'GET', url('?mode=full'))).toBe(full)
  })

  it('skips one written for another method', () => {
    expect(findOverride([at('POST /api/devices')], 'GET', url())).toBeNull()
  })
})

describe('the registry an override serves from', () => {
  it('holds that entry alone', () => {
    const one = overrideRegistry(mockRegistry, at('GET /api/devices'))

    expect(Object.keys(one)).toEqual(['GET /api/devices'])
  })

  it('merges generation options over the entry own', () => {
    const pin = (): string => 'FAULT'
    const one = overrideRegistry(
      mockRegistry,
      at('GET /api/devices', { generate: { overrides: { 'results[]': pin } } }),
    )

    expect(one['GET /api/devices']?.options?.overrides).toEqual({
      'results[]': pin,
    })
  })

  it('refuses a key the registry does not have', () => {
    expect(() => overrideRegistry(mockRegistry, at('GET /api/orders'))).toThrow(
      /No mock registered/,
    )
  })
})
