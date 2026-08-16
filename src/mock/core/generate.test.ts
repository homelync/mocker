import { describe, expect, it } from "vitest";
import { z } from "zod";
import { UnknownOverridePathError, UnsupportedSchemaError } from "./errors";
import { generate } from "./generate";
import { DEFAULT_RULES } from "./rules";

/**
 * Synthetic schemas only. Tests against the application's real schemas live in
 * `src/mocks/verify`, keeping `mock/core` free of any dependency on the host app.
 */

describe("determinism", () => {
  const schema = z.object({
    id: z.string(),
    installationDate: z.string(),
    count: z.number(),
    active: z.boolean(),
    tags: z.array(z.string()),
  });

  it("returns byte-identical output for the same seed", () => {
    const a = generate(schema, { seed: "GET /devices?page=1" });
    const b = generate(schema, { seed: "GET /devices?page=1" });

    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("returns different output for a different seed", () => {
    const a = generate(schema, { seed: "GET /devices?page=1" });
    const b = generate(schema, { seed: "GET /devices?page=2" });

    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("accepts a numeric seed", () => {
    expect(JSON.stringify(generate(schema, { seed: 42 }))).toBe(
      JSON.stringify(generate(schema, { seed: 42 }))
    );
  });

  it("does not leak state between calls", () => {
    // Interleaving a differently-seeded call must not disturb the sequence —
    // this is the property a module-global faker instance would break.
    const first = generate(schema, { seed: 1 });
    generate(schema, { seed: 999 });
    const second = generate(schema, { seed: 1 });

    expect(second).toEqual(first);
  });
});

describe("output validity", () => {
  it("produces data its own schema accepts", () => {
    const schema = z.object({
      name: z.string(),
      score: z.number(),
      flag: z.boolean(),
      literal: z.literal("ALARM"),
      choice: z.enum(["A", "B", "C"]),
      maybe: z.string().nullish(),
      list: z.array(z.object({ inner: z.number() })),
    });

    for (let seed = 0; seed < 50; seed++) {
      expect(() => schema.parse(generate(schema, { seed }))).not.toThrow();
    }
  });

  it("respects string length bounds", () => {
    const schema = z.object({ code: z.string().min(6).max(8) });

    for (let seed = 0; seed < 25; seed++) {
      const { code } = generate(schema, { seed });
      expect(code.length).toBeGreaterThanOrEqual(6);
      expect(code.length).toBeLessThanOrEqual(8);
    }
  });

  it("respects numeric bounds", () => {
    const schema = z.object({ score: z.number().min(10).max(20) });

    for (let seed = 0; seed < 25; seed++) {
      const { score } = generate(schema, { seed });
      expect(score).toBeGreaterThanOrEqual(10);
      expect(score).toBeLessThanOrEqual(20);
    }
  });

  it("honours a declared string format over a misleading field name", () => {
    // The name says date, the schema says email. The schema is a fact and the
    // name is a guess, so the schema wins.
    const schema = z.object({ contactDate: z.email() });

    expect(() => schema.parse(generate(schema, { seed: 3 }))).not.toThrow();
  });
});

describe("name rules", () => {
  it("generates parseable ISO dates for camelCase date suffixes", () => {
    const schema = z.object({
      installationDate: z.string(),
      lastTestedDate: z.string(),
      createdAt: z.string(),
    });

    const result = generate(schema, { seed: 7, nullishRate: 0 });

    for (const value of Object.values(result)) {
      expect(Number.isNaN(Date.parse(value))).toBe(false);
    }
  });

  it("does not claim names that merely contain 'at' or 'date'", () => {
    // `/At$/` is case-sensitive precisely so `format` and `dateFormat` fall
    // through to the generic string generator.
    const schema = z.object({ format: z.string(), dateFormat: z.string() });
    const result = generate(schema, { seed: 7 });

    expect(Number.isNaN(Date.parse(result.format))).toBe(true);
    expect(Number.isNaN(Date.parse(result.dateFormat))).toBe(true);
  });

  it("distinguishes county from country from count", () => {
    const schema = z.object({
      county: z.string(),
      country: z.string(),
      count: z.number(),
    });
    const result = generate(schema, { seed: 11, nullishRate: 0 });

    expect(result.county).not.toBe(result.country);
    expect(Number.isInteger(result.count)).toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(0);
  });

  it("applies a name rule only to the leaf kinds it declares", () => {
    // The whole reason rules carry `types`: `id` is a string here and a number
    // there, and a string generator must not claim the number.
    const schema = z.object({
      id: z.string(),
      address: z.object({ id: z.number() }),
    });

    const result = generate(schema, { seed: 5, nullishRate: 0 });

    expect(typeof result.id).toBe("string");
    expect(typeof result.address.id).toBe("number");
    expect(() => schema.parse(result)).not.toThrow();
  });

  it("lets a caller prepend rules without losing the defaults", () => {
    const schema = z.object({ model: z.string(), createdAt: z.string() });

    const result = generate(schema, {
      seed: 1,
      nullishRate: 0,
      rules: [
        {
          name: "model",
          match: /^model$/,
          types: ["string"],
          gen: (): string => "Aico Ei3016",
        },
        ...DEFAULT_RULES,
      ],
    });

    expect(result.model).toBe("Aico Ei3016");
    expect(Number.isNaN(Date.parse(result.createdAt))).toBe(false);
  });
});

describe("nullish handling", () => {
  const schema = z.object({
    always: z.string(),
    maybe: z.string().nullish(),
  });

  it("never drops a required field", () => {
    for (let seed = 0; seed < 30; seed++) {
      expect(generate(schema, { seed }).always).toBeTypeOf("string");
    }
  });

  it("populates everything at rate 0", () => {
    for (let seed = 0; seed < 30; seed++) {
      expect(generate(schema, { seed, nullishRate: 0 }).maybe).toBeTypeOf(
        "string"
      );
    }
  });

  it("drops everything droppable at rate 1", () => {
    for (let seed = 0; seed < 30; seed++) {
      expect(
        generate(schema, { seed, nullishRate: 1 }).maybe ?? null
      ).toBeNull();
    }
  });

  it("produces both an omitted key and an explicit null for .nullish()", () => {
    // Both forms occur in real upstream payloads and serialise differently, so
    // neither may be the only one a consumer ever sees.
    const outcomes = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      const result = generate(schema, { seed, nullishRate: 1 });
      outcomes.add(
        "maybe" in result
          ? result.maybe === null
            ? "null"
            : "value"
          : "absent"
      );
    }

    expect(outcomes).toContain("null");
    expect(outcomes).toContain("absent");
  });

  it("uses null only for .nullable() and omission only for .optional()", () => {
    const split = z.object({
      nullableOnly: z.string().nullable(),
      optionalOnly: z.string().optional(),
    });

    for (let seed = 0; seed < 20; seed++) {
      const result = generate(split, { seed, nullishRate: 1 });
      expect(result.nullableOnly).toBeNull();
      expect("optionalOnly" in result).toBe(false);
    }
  });

  it("always populates a field with a default", () => {
    const withDefault = z.object({ page: z.number().default(1) });

    for (let seed = 0; seed < 20; seed++) {
      expect(generate(withDefault, { seed, nullishRate: 1 }).page).toBeTypeOf(
        "number"
      );
    }
  });

  it("lands near the requested rate over many fields", () => {
    const wide = z.object(
      Object.fromEntries(
        Array.from({ length: 40 }, (_unused, i) => [
          `f${String(i)}`,
          z.string().nullish(),
        ])
      )
    );

    const result = generate(wide, { seed: 3, nullishRate: 0.3 });
    const present = Object.values(result).filter(
      (v) => typeof v === "string"
    ).length;

    // Wide tolerance: this asserts the rate is applied at all, not that 40
    // samples hit the mean.
    expect(present).toBeGreaterThan(15);
    expect(present).toBeLessThan(38);
  });
});

describe("array sizing", () => {
  const envelope = z.object({
    results: z.array(z.object({ id: z.string(), tags: z.array(z.string()) })),
    count: z.number().nullish(),
  });

  it("sizes the shallowest array with `count`", () => {
    expect(generate(envelope, { seed: 1, count: 20 }).results).toHaveLength(20);
  });

  it("keeps nested arrays small rather than applying `count` to them", () => {
    const { results } = generate(envelope, {
      seed: 1,
      count: 20,
      nullishRate: 0,
    });

    for (const row of results) {
      expect(row.tags.length).toBeLessThanOrEqual(3);
    }
  });

  it("treats a root array as the primary collection", () => {
    const list = z.array(z.object({ id: z.string() }));

    expect(generate(list, { seed: 1, count: 12 })).toHaveLength(12);
  });

  it("sizes a specific array by path", () => {
    const { results } = generate(envelope, {
      seed: 1,
      count: 3,
      nullishRate: 0,
      counts: { "results[].tags": 5 },
    });

    expect(results).toHaveLength(3);
    for (const row of results) {
      expect(row.tags).toHaveLength(5);
    }
  });

  it("supports an empty collection", () => {
    expect(generate(envelope, { seed: 1, count: 0 }).results).toHaveLength(0);
  });
});

describe("overrides", () => {
  const schema = z.object({
    results: z.array(z.object({ statusId: z.string().nullish() })),
  });

  it("pins every element of a collection through one path", () => {
    const result = generate(schema, {
      seed: 1,
      count: 15,
      overrides: { "results[].statusId": () => "GOOD" },
    });

    expect(result.results).toHaveLength(15);
    for (const row of result.results) {
      expect(row.statusId).toBe("GOOD");
    }
  });

  it("beats the nullish roll", () => {
    // An override is the caller stating intent; it must not be silently
    // discarded by the absence roll.
    const result = generate(schema, {
      seed: 1,
      count: 10,
      nullishRate: 1,
      overrides: { "results[].statusId": () => "FAULT" },
    });

    for (const row of result.results) {
      expect(row.statusId).toBe("FAULT");
    }
  });

  it("receives the path and a seeded faker", () => {
    const result = generate(schema, {
      seed: 1,
      count: 1,
      overrides: {
        "results[].statusId": ({ path, key, faker }) => {
          expect(path).toBe("results[].statusId");
          expect(key).toBe("statusId");
          return faker.string.alpha(4);
        },
      },
    });

    expect(result.results[0].statusId).toHaveLength(4);
  });

  // The `@ts-expect-error`s below are half the assertion: a wrong path is now a
  // compile error, and these lines fail to build the day it stops being one. The
  // runtime guard still has to exist, because the layers that assemble overrides
  // from a request — `shapeRequest` — address the schema by computed path.
  it("rejects a path that matches nothing", () => {
    expect(() =>
      // Wrong case: the exact failure that is otherwise completely silent.
      generate(schema, {
        seed: 1,
        // @ts-expect-error — `statusID` is not a path in this schema
        overrides: { "results[].statusID": () => "GOOD" },
      })
    ).toThrow(UnknownOverridePathError);
  });

  it("suggests the intended path on a case mismatch", () => {
    expect(() =>
      generate(schema, {
        seed: 1,
        // @ts-expect-error — `statusID` is not a path in this schema
        overrides: { "results[].statusID": () => "GOOD" },
      })
    ).toThrow(/Did you mean "results\[\]\.statusId"\?/);
  });
});

describe("unsupported schemas", () => {
  it("throws naming the zod type and the path", () => {
    const schema = z.object({
      results: z.array(z.object({ readings: z.map(z.string(), z.number()) })),
    });

    expect(() => generate(schema, { seed: 1, count: 1 })).toThrow(
      UnsupportedSchemaError
    );
    expect(() => generate(schema, { seed: 1, count: 1 })).toThrow(
      /"map" at results\[\]\.readings/
    );
  });

  it("does not silently emit a placeholder", () => {
    const schema = z.object({ when: z.date() });

    expect(() => generate(schema, { seed: 1 })).toThrow(UnsupportedSchemaError);
  });
});

describe("supported node coverage", () => {
  it("handles every zod construct the target API uses", () => {
    // string, object, number, array, boolean, literal, union, unknown plus
    // nullish / nullable / optional / default — the complete set measured
    // across the application's API schemas.
    const schema = z.object({
      str: z.string(),
      num: z.number(),
      bool: z.boolean(),
      lit: z.literal("TEC"),
      arr: z.array(z.string()),
      obj: z.object({ nested: z.string() }),
      uni: z.union([z.number(), z.string()]),
      unk: z.array(z.unknown()).nullish(),
      opt: z.string().optional(),
      nul: z.string().nullable(),
      nsh: z.string().nullish(),
      def: z.string().default("d"),
    });

    for (let seed = 0; seed < 30; seed++) {
      expect(() => schema.parse(generate(schema, { seed }))).not.toThrow();
    }
  });

  it("picks a union branch before matching a rule against it", () => {
    // `uprn` is number-or-string upstream; whichever branch is chosen, the
    // value must satisfy it.
    const schema = z.object({ uprn: z.union([z.number(), z.string()]) });

    for (let seed = 0; seed < 30; seed++) {
      expect(() => schema.parse(generate(schema, { seed }))).not.toThrow();
    }
  });
});
