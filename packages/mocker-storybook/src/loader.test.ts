import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { mockLoader } from './loader'

const deviceSchema = z.object({
  id: z.string(),
  room: z.string(),
  lastSeenAt: z.string().nullish(),
})

const propertySchema = z.object({
  id: z.string(),
  room: z.string(),
  lastSeenAt: z.string().nullish(),
})

describe('mockLoader', () => {
  it('generates one value per schema', async () => {
    const loaded = await mockLoader({ device: deviceSchema })({
      id: 'components-devicecard--default',
    })

    expect(deviceSchema.parse(loaded.device)).toBeDefined()
  })

  it('gives a story the same data every time', async () => {
    const load = mockLoader({ device: deviceSchema })
    const context = { id: 'components-devicecard--default' }

    expect(await load(context)).toEqual(await load(context))
  })

  it('gives two stories different data', async () => {
    const load = mockLoader({ device: deviceSchema })

    const first = await load({ id: 'components-devicecard--default' })
    const second = await load({ id: 'components-devicecard--offline' })

    expect(first.device).not.toEqual(second.device)
  })

  it('gives two schemas of one shape different data', async () => {
    // Seeded from the story id alone, these would be identical — which reads as
    // the loader having generated one value and copied it.
    const loaded = await mockLoader({
      device: deviceSchema,
      property: propertySchema,
    })({ id: 'components-devicecard--default' })

    expect(loaded.device).not.toEqual(loaded.property)
  })

  it('pins the data to an explicit seed instead of the story', async () => {
    const load = mockLoader({ device: deviceSchema }, { seed: 'pinned' })

    const before = await load({ id: 'components-devicecard--default' })
    const after = await load({ id: 'components-devicecard--renamed' })

    expect(before).toEqual(after)
  })

  it('applies generation options to every schema', async () => {
    const loaded = await mockLoader(
      { device: deviceSchema },
      { nullishRate: 0 },
    )({ id: 'components-devicecard--default' })

    expect(loaded.device.lastSeenAt).toEqual(expect.any(String))
  })
})
