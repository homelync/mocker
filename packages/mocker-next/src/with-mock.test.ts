import { NextRequest, NextResponse } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { withMock } from './with-mock'

const detailSchema = z.object({
  reference: z.string(),
  city: z.string(),
})

const realHandler = vi.fn(async (): Promise<NextResponse> =>
  NextResponse.json({ real: true }),
)

const request = (path: string): NextRequest =>
  new NextRequest(`http://localhost${path}`)

afterEach(() => {
  vi.unstubAllEnvs()
  realHandler.mockClear()
})

describe('when MOCK_API is unset', () => {
  it('returns the handler untouched', () => {
    vi.stubEnv('MOCK_API', undefined)

    // Identity, not a pass-through wrapper: a production route must be the
    // exact function it was before, with no per-request work at all.
    expect(withMock(detailSchema, realHandler)).toBe(realHandler)
  })

  it('treats an empty or zero flag as unset', () => {
    vi.stubEnv('MOCK_API', '')
    expect(withMock(detailSchema, realHandler)).toBe(realHandler)

    vi.stubEnv('MOCK_API', '0')
    expect(withMock(detailSchema, realHandler)).toBe(realHandler)
  })
})

describe('in a production build', () => {
  it('refuses to mock even when the flag is set', () => {
    // Fabricated data reaching a real landlord is a worse failure than a demo
    // environment that cannot be mocked.
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('MOCK_API', '1')

    expect(withMock(detailSchema, realHandler)).toBe(realHandler)
  })
})

describe('when MOCK_API is on', () => {
  it('answers from the schema without calling the handler', async () => {
    vi.stubEnv('MOCK_API', '1')

    const response = await withMock(
      detailSchema,
      realHandler,
    )(request('/api/property'))

    expect(realHandler).not.toHaveBeenCalled()
    expect(response.headers.get('x-mock')).toBe('1')
    expect(detailSchema.parse(await response.json())).toBeDefined()
  })

  it("honours the endpoint's success status", async () => {
    vi.stubEnv('MOCK_API', '1')

    const response = await withMock(detailSchema, realHandler, {
      status: 201,
    })(request('/api/note'))

    expect(response.status).toBe(201)
  })

  it('echoes a dynamic segment into the response', async () => {
    vi.stubEnv('MOCK_API', '1')

    const handler = withMock<[{ params: Promise<{ reference: string }> }]>(
      detailSchema,
      realHandler,
    )
    const response = await handler(request('/api/property/ABC123'), {
      params: Promise.resolve({ reference: 'ABC123' }),
    })

    expect(detailSchema.parse(await response.json()).reference).toBe('ABC123')
  })
})

describe('when MOCK_API names specific routes', () => {
  it('mocks a matching path and leaves the rest real', async () => {
    vi.stubEnv('MOCK_API', 'reports/devices, property/search')

    const handler = withMock(detailSchema, realHandler)

    const mocked = await handler(request('/api/portfolio/reports/devices'))
    expect(mocked.headers.get('x-mock')).toBe('1')
    expect(realHandler).not.toHaveBeenCalled()

    const real = await handler(request('/api/portfolio/reports/alerts'))
    expect(real.headers.get('x-mock')).toBeNull()
    expect(realHandler).toHaveBeenCalledTimes(1)
  })
})
