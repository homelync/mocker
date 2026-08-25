import type { z } from 'zod'
import { generate } from '@homelync/mocker'
import type { GenerateOptions } from '@homelync/mocker'

/**
 * Fake data for a story's props, for the components that never touch the
 * network.
 *
 * The registry half of this package serves a component that fetches. Plenty do
 * not: they take the data as props, and the story has to supply it. `generate`
 * already does that — what a story additionally needs is a *seed*, and picking
 * one by hand for every story is exactly the boilerplate this exists to remove.
 *
 * A loader rather than an `args` value because generation is then deferred to
 * render, and Storybook hands a loader the story's identity. Seeding from the
 * story id gives the two properties a story wants at once: the same data every
 * reload, so a visual snapshot is stable, and different data per story, so two
 * stories of one component are not indistinguishable.
 */

/**
 * The part of Storybook's story context this reads.
 *
 * Declared structurally rather than imported, which is what keeps this package
 * free of a `storybook` dependency: Storybook's own `StoryContext` satisfies it,
 * and so does `{ id: "anything" }` in a test.
 */
export interface StoryIdentity {
  /** The story's generated id, e.g. `"components-devicecard--default"`. */
  readonly id: string
}

/** What a {@link mockLoader} puts on the story's `loaded`. */
export type MockLoaderResult<Schemas extends Record<string, z.ZodType>> = {
  readonly [Key in keyof Schemas]: z.infer<Schemas[Key]>
}

/**
 * Generate one value per schema, seeded from the story.
 *
 * ```ts
 * export const Default = meta.story({
 *   loaders: [mockLoader({ device: deviceSchema })],
 *   render: (_args, { loaded }) => <DeviceCard {...loaded.device} />,
 * });
 * ```
 *
 * Each schema is seeded from the story id *and its own name*, so two schemas of
 * the same shape in one story do not come back identical — which reads as the
 * loader having generated one value twice.
 *
 * Pass `seed` in `options` to pin the data to something other than the story
 * id: a story that is renamed keeps its data, at the cost of two stories
 * sharing a seed showing the same rows.
 *
 * @param schemas the values to generate, by the name each will be loaded under
 * @param options generation options applied to every schema
 */
export function mockLoader<Schemas extends Record<string, z.ZodType>>(
  schemas: Schemas,
  options: GenerateOptions = {},
): (context: StoryIdentity) => Promise<MockLoaderResult<Schemas>> {
  return (context: StoryIdentity): Promise<MockLoaderResult<Schemas>> => {
    const base = options.seed ?? context.id

    const loaded: Record<string, unknown> = {}
    for (const [name, schema] of Object.entries(schemas)) {
      loaded[name] = generate(schema, {
        ...options,
        seed: `${String(base)}:${name}`,
      })
    }

    // Typed at the edge, untyped inside — the same trade `generate` itself
    // makes. The loop addresses the schemas by runtime key and cannot carry the
    // proof that every one of them was visited; the mapped type states it, and
    // `Object.entries` over that very object is what makes it true.
    return Promise.resolve(loaded as MockLoaderResult<Schemas>)
  }
}
