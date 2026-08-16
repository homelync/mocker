import { Faker, en, en_GB } from "@faker-js/faker";
import type { z } from "zod";
import { UnknownOverridePathError, UnsupportedSchemaError } from "./errors";
import { hashSeed } from "./hash";
import {
  childPath,
  collectPaths,
  elementPath,
  findArrayPaths,
  pathKey,
} from "./paths";
import { DEFAULT_RULES } from "./rules";
import type {
  GenContext,
  GenerateOptions,
  Generator,
  LeafKind,
  NameRule,
} from "./types";
import { classify, type AnySchema, type Bounds } from "./zod-def";

/** Absent-value probability for `.optional()` / `.nullable()` fields. */
const DEFAULT_NULLISH_RATE = 0.3;

/** Length range for arrays that are not the primary collection. */
const DEFAULT_NESTED_ARRAY_LENGTH: readonly [number, number] = [0, 3];

/** Length of the primary collection when `count` is not given. */
const DEFAULT_PRIMARY_COUNT = 10;

/** Guards against a self-referential schema; recursion is not supported. */
const MAX_DEPTH = 20;

/**
 * Generate fake data satisfying a zod schema.
 *
 * Values are resolved per field in strict precedence order:
 *
 *   1. an explicit `overrides` entry for the field's canonical path
 *   2. a schema-declared format or closed value set (`z.email()`, enum, literal)
 *   3. a matching `NameRule` for the field's name *and* leaf kind
 *   4. a generic value derived from the zod type and its bounds
 *
 * Schema evidence outranks name guesses at step 2 because a declared format is
 * a fact while a name is an inference; an override outranks everything because
 * it is the caller stating intent the schema cannot express.
 *
 * The function is pure and re-entrant: all randomness comes from a Faker
 * instance created per call and seeded from `options.seed`, so concurrent calls
 * cannot interfere and the same seed always yields byte-identical output.
 *
 * @throws {UnsupportedSchemaError} on a zod node this walker cannot generate.
 * @throws {UnknownOverridePathError} on an override path absent from the schema.
 */
export function generate<T extends z.ZodType>(
  schema: T,
  options: GenerateOptions<z.infer<T>> = {}
): z.infer<T> {
  // Typed at the edge, untyped inside. Override paths are checked against
  // `z.infer<T>` in the signature, where a caller writes them by hand; the walk
  // below addresses the schema by runtime path and cannot carry that proof.
  const {
    seed = 0,
    count,
    counts = {},
    nestedArrayLength = DEFAULT_NESTED_ARRAY_LENGTH,
    nullishRate = DEFAULT_NULLISH_RATE,
    rules = DEFAULT_RULES,
    overrides = {},
    locale,
  } = options as GenerateOptions;

  const overrideEntries = new Map(Object.entries(overrides));
  const countEntries = new Map(Object.entries(counts));

  if (overrideEntries.size > 0) {
    assertOverridePathsExist(schema, overrideEntries);
  }

  // `en_GB` first so postcodes, counties and street names match the domain,
  // with `en` behind it to fill any gaps the GB locale does not define.
  const faker = new Faker({ locale: locale ? [locale] : [en_GB, en] });
  faker.seed(hashSeed(seed));

  // Only the shallowest array is the "primary collection"; everything deeper is
  // incidental (a row's tags, an alert's recommendations) and must stay small,
  // or a 20-row page would carry 20 × 137 nested entries.
  const primaryArrayPath = findArrayPaths(schema)[0];

  const arrayLength = (path: string): number => {
    const explicit = countEntries.get(path);
    if (explicit !== undefined) return explicit;
    if (path === primaryArrayPath) return count ?? DEFAULT_PRIMARY_COUNT;
    const [min, max] = nestedArrayLength;
    return faker.number.int({ min, max });
  };

  const walk = (node: AnySchema, path: string, depth: number): unknown => {
    if (depth > MAX_DEPTH) {
      throw new UnsupportedSchemaError("recursive schema", path);
    }

    const override = overrideEntries.get(path);
    if (override) return override(context(path, faker));

    const classified = classify(node);

    switch (classified.kind) {
      case "wrapper": {
        // `.default()` means the value may legitimately be omitted, but a
        // response that carries it is always valid and always more useful.
        const droppable = classified.optional || classified.nullable;
        if (
          droppable &&
          !classified.hasDefault &&
          faker.number.float() < nullishRate
        ) {
          return absentValue(classified.optional, classified.nullable, faker);
        }
        return walk(classified.inner, path, depth + 1);
      }

      case "object": {
        const result: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(classified.shape)) {
          const value = walk(child, childPath(path, key), depth + 1);
          // `undefined` models an omitted key, which is materially different
          // from `null` once the payload is serialised. Both occur in real
          // upstream responses, so both must be reachable here.
          if (value !== undefined) result[key] = value;
        }
        return result;
      }

      case "array": {
        const length = arrayLength(path);
        return Array.from({ length }, () =>
          walk(classified.element, elementPath(path), depth + 1)
        );
      }

      case "union": {
        if (classified.options.length === 0) {
          throw new UnsupportedSchemaError("union(no options)", path);
        }
        // Resolve the branch before any rule runs, so a name rule is matched
        // against the concrete leaf kind it will have to satisfy. This is what
        // keeps `uprn: union([number, string])` type-safe.
        const branch =
          classified.options[
            faker.number.int({ min: 0, max: classified.options.length - 1 })
          ];
        return walk(branch, path, depth + 1);
      }

      case "literal": {
        if (classified.values.length === 0) {
          throw new UnsupportedSchemaError("literal(no values)", path);
        }
        return classified.values[
          faker.number.int({ min: 0, max: classified.values.length - 1 })
        ];
      }

      case "enum": {
        if (classified.values.length === 0) {
          throw new UnsupportedSchemaError("enum(no values)", path);
        }
        return classified.values[
          faker.number.int({ min: 0, max: classified.values.length - 1 })
        ];
      }

      case "string":
        return generateString(
          classified.format,
          classified.bounds,
          path,
          faker,
          rules
        );

      case "number":
        return generateNumber(classified.bounds, path, faker, rules);

      case "boolean":
        return faker.datatype.boolean();

      case "unknown":
        // Nothing can be inferred, and inventing a shape would be a lie. `null`
        // is the one value every `z.unknown()` accepts.
        return null;

      case "unsupported":
        throw new UnsupportedSchemaError(classified.type, path);
    }
  };

  return walk(schema, "", 0) as z.infer<T>;
}

/** A field's absence, as either an omitted key or an explicit null. */
function absentValue(
  optional: boolean,
  nullable: boolean,
  faker: Faker
): undefined | null {
  if (optional && nullable) {
    // `.nullish()` permits both, and real payloads contain both, so neither
    // form should be the only one a consumer ever sees.
    return faker.datatype.boolean() ? undefined : null;
  }
  return optional ? undefined : null;
}

function context(path: string, faker: Faker): GenContext {
  return { path, key: pathKey(path), faker };
}

/** First rule matching both the field name and the leaf's kind. */
function matchRule(
  rules: readonly NameRule[],
  key: string,
  kind: LeafKind
): NameRule | undefined {
  return rules.find(
    (rule) => rule.types.includes(kind) && rule.match.test(key)
  );
}

/**
 * Faker generators for zod's declared string formats. Consulted before name
 * rules: `z.email()` is a stated fact about the value, whereas a field called
 * `email` is only a strong hint.
 */
const FORMAT_GENERATORS: Readonly<Record<string, Generator>> = {
  email: ({ faker }) => faker.internet.email(),
  url: ({ faker }) => faker.internet.url(),
  uuid: ({ faker }) => faker.string.uuid(),
  guid: ({ faker }) => faker.string.uuid(),
  datetime: ({ faker }) => faker.date.recent().toISOString(),
  date: ({ faker }) => faker.date.recent().toISOString().slice(0, 10),
  time: ({ faker }) => faker.date.recent().toISOString().slice(11, 19),
  duration: () => "PT1H",
  ipv4: ({ faker }) => faker.internet.ipv4(),
  ipv6: ({ faker }) => faker.internet.ipv6(),
  emoji: () => "🏠",
  cuid: ({ faker }) => faker.string.nanoid(),
  cuid2: ({ faker }) => faker.string.nanoid(),
  ulid: ({ faker }) => faker.string.nanoid(26),
  nanoid: ({ faker }) => faker.string.nanoid(),
};

function generateString(
  format: string | undefined,
  bounds: Bounds,
  path: string,
  faker: Faker,
  rules: readonly NameRule[]
): string {
  const ctx = context(path, faker);

  const byFormat = format ? FORMAT_GENERATORS[format] : undefined;
  if (byFormat) return clampString(String(byFormat(ctx)), bounds, faker);

  const rule = matchRule(rules, ctx.key, "string");
  if (rule) return clampString(String(rule.gen(ctx)), bounds, faker);

  return clampString(faker.lorem.words({ min: 1, max: 3 }), bounds, faker);
}

/**
 * Bring a generated string within the schema's length bounds.
 *
 * Padding rather than regenerating keeps the value recognisable — a truncated
 * ISO date is still obviously a date — and keeps faker consumption stable,
 * which determinism depends on.
 */
function clampString(value: string, bounds: Bounds, faker: Faker): string {
  if (bounds.exact !== undefined) {
    return value.length >= bounds.exact
      ? value.slice(0, bounds.exact)
      : value.padEnd(bounds.exact, faker.string.alpha(1));
  }
  let result = value;
  if (bounds.min !== undefined && result.length < bounds.min) {
    result = result.padEnd(bounds.min, "x");
  }
  if (bounds.max !== undefined && result.length > bounds.max) {
    result = result.slice(0, bounds.max);
  }
  return result;
}

function generateNumber(
  bounds: Bounds,
  path: string,
  faker: Faker,
  rules: readonly NameRule[]
): number {
  const ctx = context(path, faker);
  const rule = matchRule(rules, ctx.key, "number");

  if (rule) {
    const value = Number(rule.gen(ctx));
    return clampNumber(value, bounds);
  }

  const min = bounds.min ?? 0;
  const max = bounds.max ?? 1000;
  return bounds.int === false
    ? faker.number.float({ min, max, fractionDigits: 2 })
    : faker.number.int({ min, max });
}

function clampNumber(value: number, bounds: Bounds): number {
  let result = value;
  if (bounds.min !== undefined) result = Math.max(result, bounds.min);
  if (bounds.max !== undefined) result = Math.min(result, bounds.max);
  return bounds.int ? Math.round(result) : result;
}

/**
 * Reject override paths that address nothing.
 *
 * Without this an override is silently inert — the field falls through to the
 * name rules, produces a plausible value, and the output still parses. A
 * mistyped path would only ever be noticed by someone squinting at a column.
 */
function assertOverridePathsExist(
  schema: AnySchema,
  overrides: ReadonlyMap<string, Generator>
): void {
  const known = collectPaths(schema);
  const knownSet = new Set(known);

  for (const path of overrides.keys()) {
    if (!knownSet.has(path)) {
      throw new UnknownOverridePathError(path, known);
    }
  }
}
