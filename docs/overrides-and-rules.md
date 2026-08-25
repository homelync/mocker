# Overrides and rules

Generated data is plausible, but it is not _yours_. A device status comes back as
a lorem word when the grid only has labels for four codes; an `occurredAt` string
renders "Invalid DateTime" because nothing in `z.string()` says it is a date.

Two mechanisms fix that, and they answer different questions:

| You want                                    | Reach for       |
| ------------------------------------------- | --------------- |
| _this field, in this endpoint_ to hold this | an **override** |
| _every field called this_ to look like this | a **rule**      |

An override names one canonical path and wins outright. A rule names a field
_name_ and applies wherever that name appears in the schema. Everything below is
about writing both in a registry entry, where they are checked against the
schema the entry declares.

## Where the options live

`overrides` and `rules` are both `GenerateOptions`, and every layer that
generates takes the same set:

```ts
// A registry entry — every request to this endpoint.
'GET /api/devices': {
  schema: () => import('./schemas').then((m) => m.deviceListSchema),
  options: { /* here */ },
}

// A direct call — a fixture factory in a test.
generate(deviceListSchema, { /* here */ })

// One story, or one Playwright test — merged over the entry's own options.
msw.use(mockerHandler(registry, 'GET /api/devices', { generate: { /* here */ } }))
mocker.use('GET /api/devices', { generate: { /* here */ } })
```

An entry's `options` are read per request, so editing them hot-reloads. Adding
the _key_ does not — under Next, `rewrites()` is evaluated once at startup.

**The per-request merge is shallow.** A story or test that passes
`generate.overrides` replaces the entry's whole `overrides` object rather than
adding one key to it. Repeat the entry's pins if you still want them.

## Overrides

An override pins a canonical path to a generator function:

```ts
import type { MockOptions } from '@homelync/mocker'
import type { deviceListSchema } from '../app/api/devices/types'

'GET /api/devices?propertyReference=[reference]': {
  schema: () =>
    import('../app/api/devices/types').then((module) => module.deviceListSchema),
  options: {
    // Fill every nullable field rather than dropping 30% of them.
    nullishRate: 0,
    overrides: {
      // statusId is z.string() in the schema but a closed set in the domain,
      // and the grid only has labels for these four.
      'results[].statusId': ({ faker }): string =>
        faker.helpers.arrayElement(['GOOD', 'WARNING', 'FAULT', 'OFFLINE']),
      // Keep installations inside the window the chart renders.
      'results[].installedAt': ({ faker }): string =>
        faker.date.between({ from: '2024-01-01', to: '2026-01-01' }).toISOString(),
    },
    counts: { 'results[].tags': 2 },
  } satisfies MockOptions<typeof deviceListSchema>,
},
```

`import type` is erased, so naming the schema for the `satisfies` costs the table
nothing at load time — which is what keeps it importable from a bundler config.

### Canonical paths

A path addresses a position in the _schema_, not in the generated value, so array
indices collapse to `[]` and one line covers the whole page:

```
""                            the whole response
"results"                     a field of the root object
"results[]"                   any element of that array
"results[].address.postcode"  a field of any element
```

Container paths are addressable too. Pinning `results` replaces the entire array
— `count`, `counts` and every per-element override below it stop applying,
because nothing walks into a value the caller supplied. Pinning `""` replaces the
response.

The generator receives `{ path, key, faker }`: the full canonical path, the final
segment, and the seeded faker instance for this request. Use `faker` and nothing
else — `Math.random()` or `Date.now()` inside an override throws determinism
away, and with it the ability to reproduce what you saw.

### Type checking

Annotate `options` with `MockOptions<typeof schema>` and the editor offers the
schema's canonical paths as you type a key. A type only reaches a literal while
it is being written if it is contextual there, so a check applied afterwards —
however thorough — arrives too late to complete anything.

Both halves of the mistake are compile errors:

```ts
// override path not found in this schema: results[].statusID
'results[].statusID': ({ faker }): string => 'GOOD',
// Type 'number' is not assignable to type 'string'
'results[].serialNumber': (): number => 7,
```

Annotate `options` and not the whole entry: the `schema` thunk has to keep the
type it infers, which is how a `satisfies` naming the _wrong_ schema is still
caught by the table-wide check. That check is the second statement every registry
ends with:

```ts
const registry = {/* ... */} as const satisfies MockRegistryDraft;

export const mockRegistry = registry satisfies CheckedMockRegistry<
  typeof registry
>;
```

Two statements because the check has to name the table's own type, and a
declaration cannot refer to itself. Type information flows in opposite directions
through them: contextual types down into the literal, each entry's concrete
schema back up out of it.

At request time the same mistake throws `UnknownOverridePathError`, listing the
paths the schema does offer. That matters more than it looks — a mistyped path is
otherwise entirely silent, because the field falls through to the name rules,
produces a plausible string, and the output still validates.

### What an override outranks

Everything. It is the caller stating intent the schema cannot express, so it is
read before the schema node is even classified:

- **The nullish roll.** A pinned field is always present, even where the schema
  allows it to be dropped. If you are specifically testing null handling, pin
  nothing and set `nullishRate: 1`.
- **Declared formats, enums and literals.** An override is the only way to make
  `z.enum([...])` return the member a screen needs.
- **Length and range bounds.** Nothing clamps an override, so a value that
  violates `z.string().max(8)` reaches the output parse and comes back as a
  **500 carrying the zod issues**. Rules are clamped; overrides are trusted.

Request-derived options sit _underneath_ an entry's overrides: pagination pins
`count`, `page`, `totalPages` and `limit`, and a route param or query value is
echoed into a root field of its own name. An entry that pins one of those wins,
which is occasionally what you want and is also how a 20-row page ends up
reporting a total of 3. `seed` is the exception in the other direction — the
request's own seed always replaces an entry's, so a `seed` in `options` does
nothing at request time.

## Rules

Zod carries shape, not intent. A rule supplies the intent, by field name:

```ts
'GET /api/property/[reference]/timeline': {
  schema: () => import('./planned/timeline').then((m) => m.timelineSchema),
  options: {
    rules: [
      {
        name: 'timeline-occurred-at',
        match: /^occurredAt$/,
        types: ['string'],
        gen: ({ faker }): string =>
          faker.date
            .between({ from: '2021-01-01T00:00:00Z', to: '2026-06-01T00:00:00Z' })
            .toISOString(),
      },
    ],
  } satisfies MockOptions<typeof timelineSchema>,
},
```

Four fields, and each earns its place:

- **`name`** identifies the rule in errors, and lets a consumer replace one of the
  defaults by name rather than rebuilding the list.
- **`match`** is tested against the **final path segment** only — the field name,
  never the full path. `/^occurredAt$/` claims `events[].occurredAt` and
  `meta.occurredAt` alike. Case-sensitivity is load-bearing: `/At$/` matches
  `createdAt` but not `format`, where `/at$/i` would claim both.
- **`types`** declares which leaf kinds the rule may claim. Field names are not
  unique across types — `deviceRow.id` is a string while `address.id` is a number
  — and a name-only rule would put a string into the number field, which the
  output parse then rejects. This is what makes name-based generation safe.
- **`gen`** receives the same `{ path, key, faker }` an override does.

**The first rule matching both the name and the leaf kind wins,** so order the
list specific-first.

### Rules replace, they do not extend

`rules` is the whole list. Setting it drops the shipped defaults for that entry —
including the ISO date rule, which is the one most schemas quietly depend on. To
add to them:

```ts
import { DEFAULT_RULES } from "@homelync/mocker/core";

options: {
  rules: [...myRules, ...DEFAULT_RULES];
}
```

Set them per entry when the name is domain-specific to that endpoint, and per
`generate()` call when you are building fixtures directly. There is no global
registration point on purpose: a rule that applies everywhere is invisible from
the entry it changes.

The shipped set is in [`core/rules.ts`](../packages/mocker/src/core/rules.ts):
ISO dates, epoch milliseconds, postcodes, emails, phone numbers, URLs, person
names, streets, cities, counties, countries, business references, identifiers,
serials, percentages, coordinates and tallies.

### What a rule does not reach

- **Only string and number leaves consult rules.** Booleans are generated
  directly, so a rule declaring `types: ['boolean']` never fires — pin the field
  with an override instead. Enums and literals are closed sets and are never
  consulted either.
- **A declared format wins.** `z.email()`, `z.uuid()`, `z.iso.datetime()` and the
  rest are facts about the value, where a name is an inference, so the format
  generator runs and the rule does not.
- **Bounds clamp the result.** A string is padded or truncated to satisfy
  `min`/`max`/`length`; a number is clamped and rounded to satisfy its range and
  `.int()`. A rule cannot produce output its own schema rejects — which is
  exactly the guarantee an override gives up.

## The full precedence order

Per field, top to bottom:

1. an **override** for the field's canonical path
2. a **declared format or closed value set** — `z.email()`, enum, literal
3. a matching **name rule** for the field's name _and_ leaf kind
4. a **generic value** from the zod type and its bounds

Per layer, for a request served from a registry, strongest first:

1. **the entry's own `overrides` and `counts`** — path-keyed and explicit, so
   they beat both of the layers below
2. **request controls** — `x-mock-seed` replaces any seed, `x-mock-status` and
   `x-mock-delay` are answered before anything is generated, and `x-mock-count`
   sizes the primary collection unless the entry sized it by path
3. **request shaping** — the seed from the request signature, pagination tallies
   made to agree with the page, and inputs echoed into root fields of their name

The entry wins over shaping because it states intent where shaping infers it.
The headers are a live instruction from whoever is looking at the screen, so they
win over everything the entry left unstated — but an entry that pins a field pins
it for every request, headers included.

## When a pin does not appear

| Symptom                                              | Cause                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `UnknownOverridePathError`                           | mistyped path, or a path in a different schema               |
| `Mock output failed its own schema`, 500 with issues | an override returned a value the schema rejects              |
| Pin ignored in one story or test                     | the shallow merge replaced the entry's whole `overrides`     |
| Rule ignored                                         | boolean/enum leaf, a declared format, or an earlier rule won |
| Dates broke after adding `rules`                     | the list replaced `DEFAULT_RULES`; spread them back in       |
| `x-mock-count` does nothing                          | the entry sized that array by path in `counts`, and wins     |

`counts` is the one path-keyed option that does not fail loudly at request time,
so it is restricted at compile time to paths the schema declares as **arrays**:
`{ readings: 365 }` against a schema whose collection is called `results` is a
type error rather than a quiet no-op.

## Further reading

- [`docs/mocking-guide.md`](mocking-guide.md) — the long-form guide: recipes, the
  registry design, the supported zod surface, and why each decision went the way
  it did.
- [`packages/mocker/README.md`](../packages/mocker/README.md) — the generator and
  the handler, and the entry-point split the layout exists for.
