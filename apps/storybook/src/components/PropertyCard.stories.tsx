import { mockLoader } from '@homelync/mocker-storybook'
import preview from '#.storybook/preview'
import { propertySchema } from '../api/property'
import { PropertyCard } from './PropertyCard'

/**
 * A component that takes props, so nothing is intercepted here at all.
 *
 * `mockLoader` generates from the same schema the API answers with, seeded from
 * the story id: the data is the same on every reload — so a snapshot is stable —
 * and different in every story, so two of them are not the same picture.
 */

const meta = preview.meta({
  component: PropertyCard,
  loaders: [mockLoader({ property: propertySchema })],
  render: (_args, { loaded }) => <PropertyCard property={loaded.property} />,
})

export const Default = meta.story({})

/** A second story, and a second property, from the same three lines. */
export const AnotherProperty = meta.story({})

/**
 * Every optional field present.
 *
 * `nullishRate: 0` fills what would otherwise be dropped about a third of the
 * time — the case where a story about a full card keeps rendering a half-empty
 * one.
 */
export const FullyPopulated = meta.story({
  loaders: [mockLoader({ property: propertySchema }, { nullishRate: 0 })],
})
