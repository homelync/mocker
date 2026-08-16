import type { NameRule } from "./types";

/**
 * Default field-name rules.
 *
 * These exist because zod schemas describe shape, not intent. `z.string()` is
 * all the schema says about `installationDate`, but the UI feeds it to
 * `DateTime.fromISO` — so a lorem word renders "Invalid DateTime" in every date
 * cell. A name is weaker evidence than a type, but it is the only evidence
 * available, and it is right often enough that a schema with no configuration
 * at all still produces a usable response.
 *
 * Ordering matters: the first rule whose pattern matches the field name *and*
 * whose `types` include the leaf's kind wins. More specific patterns come
 * first.
 *
 * Case-sensitivity is load-bearing. `/At$/` matches `createdAt` but not
 * `format`; the lowercase-insensitive form would claim both.
 */
export const DEFAULT_RULES: readonly NameRule[] = [
  {
    name: "iso-date",
    // camelCase suffixes only: `installationDate`, `raisedDate`, `createdAt`.
    // Deliberately not /date/i, which would also claim `dateFormat`.
    match: /(Date|At)$|^(date|timestamp)$/,
    types: ["string"],
    gen: ({ faker }) =>
      faker.date
        .between({ from: "2023-01-01T00:00:00Z", to: "2026-06-01T00:00:00Z" })
        .toISOString(),
  },
  {
    name: "epoch-milliseconds",
    match: /(Date|At)$|^(date|timestamp)$/,
    types: ["number"],
    gen: ({ faker }) =>
      faker.date
        .between({ from: "2023-01-01T00:00:00Z", to: "2026-06-01T00:00:00Z" })
        .getTime(),
  },
  {
    name: "postcode",
    match: /postcode|postal.?code|zip.?code|^zip$/i,
    types: ["string"],
    gen: ({ faker }) => faker.location.zipCode(),
  },
  {
    name: "email",
    match: /email/i,
    types: ["string"],
    gen: ({ faker }) => faker.internet.email(),
  },
  {
    name: "phone",
    match: /phone|mobile|telephone/i,
    types: ["string"],
    gen: ({ faker }) => faker.phone.number(),
  },
  {
    name: "url",
    match: /url$|uri$|href$|^link$|imageUrl/i,
    types: ["string"],
    gen: ({ faker }) => faker.internet.url(),
  },
  {
    name: "person-name",
    // Only the unambiguous person-name fields. A bare `name` is far more often
    // a device model or an event type in this kind of API, so it is left to
    // the generic string generator.
    match:
      /(firstName|lastName|fullName|userName|username|createdBy|updatedBy|installedBy)$/i,
    types: ["string"],
    gen: ({ faker }) => faker.person.fullName(),
  },
  {
    name: "street",
    match: /street|addressLine|^line1$/i,
    types: ["string"],
    gen: ({ faker }) => faker.location.street(),
  },
  {
    name: "city",
    match: /^city$|City$|^town$|^locality$/i,
    types: ["string"],
    gen: ({ faker }) => faker.location.city(),
  },
  {
    name: "county",
    // Anchored so it cannot also claim `country` or `count`.
    match: /^county$|County$/,
    types: ["string"],
    gen: ({ faker }) => faker.location.county(),
  },
  {
    name: "country",
    match: /^country$|Country$/,
    types: ["string"],
    gen: ({ faker }) => faker.location.country(),
  },
  {
    name: "reference",
    // Business references in this domain are short uppercase codes, not lorem.
    match: /reference$/i,
    types: ["string"],
    gen: ({ faker }) =>
      faker.string.alphanumeric({ length: 8, casing: "upper" }),
  },
  {
    name: "identifier",
    // `id`, `deviceId`, `propertyId` — stable-looking opaque handles.
    match: /^id$|Id$/,
    types: ["string"],
    gen: ({ faker }) => faker.string.hexadecimal({ length: 8, prefix: "" }),
  },
  {
    name: "identifier-numeric",
    // Same names, number-typed. This pair is the reason rules carry `types`:
    // `deviceRow.id` is a string while `address.id` is a number.
    match: /^id$|Id$/,
    types: ["number"],
    gen: ({ faker }) => faker.number.int({ min: 1, max: 999_999 }),
  },
  {
    name: "serial",
    match: /serial/i,
    types: ["string"],
    gen: ({ faker }) =>
      faker.string.alphanumeric({ length: 12, casing: "upper" }),
  },
  {
    name: "percentage",
    match: /percent|percentage|Rate$/i,
    types: ["number"],
    gen: ({ faker }) => faker.number.int({ min: 0, max: 100 }),
  },
  {
    name: "latitude",
    match: /^lat$|latitude/i,
    types: ["number"],
    gen: ({ faker }) => faker.location.latitude(),
  },
  {
    name: "longitude",
    match: /^lng$|^lon$|longitude/i,
    types: ["number"],
    gen: ({ faker }) => faker.location.longitude(),
  },
  {
    name: "tally",
    // Counts and totals should read as plausible small tallies rather than
    // arbitrary integers, and must never be negative.
    match: /^count$|Count$|^total$|Total$|^quantity$/,
    types: ["number"],
    gen: ({ faker }) => faker.number.int({ min: 0, max: 500 }),
  },
];
