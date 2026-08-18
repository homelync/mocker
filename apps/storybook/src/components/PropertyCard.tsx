import type { Property } from '../api/property'

/**
 * One property, rendered from props.
 *
 * The other half of the problem: this component never fetches, so no amount of
 * request interception helps a story about it. `mockLoader` generates the props
 * from the same schema instead — the story still writes no fixture, and the data
 * still cannot drift from the shape the API promises.
 */
export function PropertyCard({ property }: { property?: Property }) {
  if (property === undefined) return <p>No property selected.</p>

  return (
    <article>
      <h2>{property.reference}</h2>
      <address>
        {property.address.line1}
        <br />
        {property.address.city}
        {property.address.county === null ||
        property.address.county === undefined
          ? null
          : `, ${property.address.county}`}
        <br />
        {property.address.postcode}
      </address>
      <dl>
        <dt>Bedrooms</dt>
        <dd>{property.bedrooms}</dd>
        <dt>Tenure</dt>
        <dd>{property.tenure}</dd>
        <dt>EPC</dt>
        <dd>{property.epcRating}</dd>
      </dl>
    </article>
  )
}
