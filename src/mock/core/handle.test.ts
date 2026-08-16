import { describe, expect, it } from "vitest";
import { z } from "zod";
import { handle } from "./handle";

/**
 * Synthetic schemas only. The handler against this application's real API
 * surface is exercised in `src/mocks/verify`, keeping `mock/core` free of any
 * dependency on the host app.
 */

const pageSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      serialNumber: z.string(),
      installationDate: z.string(),
    })
  ),
  count: z.number().nullish(),
  totalPages: z.number().nullish(),
});

const detailSchema = z.object({
  reference: z.string(),
  city: z.string(),
  floors: z.number(),
});

const listSchema = z.array(z.object({ id: z.string(), name: z.string() }));

const get = (url: string, headers: Record<string, string> = {}): Request =>
  new Request(url, { headers });

const body = async (response: Response): Promise<unknown> => response.json();

describe("determinism", () => {
  it("returns byte-identical bodies for the same request", async () => {
    const url = "http://localhost/api/devices?limit=5&page=1";

    const [first, second] = await Promise.all([
      handle(get(url), { output: pageSchema }).then((r) => r.text()),
      handle(get(url), { output: pageSchema }).then((r) => r.text()),
    ]);

    expect(first).toBe(second);
  });

  it("ignores query parameter order", async () => {
    // The same request written two ways must return the same data, or a test
    // that builds its query differently from the UI sees different rows.
    const [first, second] = await Promise.all([
      handle(get("http://localhost/api/devices?limit=5&page=1"), {
        output: pageSchema,
      }).then((r) => r.text()),
      handle(get("http://localhost/api/devices?page=1&limit=5"), {
        output: pageSchema,
      }).then((r) => r.text()),
    ]);

    expect(first).toBe(second);
  });

  it("gives a different path different data", async () => {
    const [devices, alerts] = await Promise.all([
      handle(get("http://localhost/api/devices"), { output: pageSchema }).then(
        (r) => r.text()
      ),
      handle(get("http://localhost/api/alerts"), { output: pageSchema }).then(
        (r) => r.text()
      ),
    ]);

    expect(devices).not.toBe(alerts);
  });
});

describe("pagination", () => {
  const page = async (n: number): Promise<z.infer<typeof pageSchema>> => {
    const response = await handle(
      get(`http://localhost/api/devices?limit=10&page=${String(n)}`),
      { output: pageSchema }
    );
    return pageSchema.parse(await body(response));
  };

  it("sizes the collection by limit", async () => {
    expect((await page(1)).results).toHaveLength(10);
  });

  it("keeps count and totalPages consistent with the page size", async () => {
    const { count, totalPages } = await page(1);

    expect(count).toBeGreaterThan(0);
    expect(totalPages).toBe(Math.ceil((count ?? 0) / 10));
  });

  it("reports the same total on every page", async () => {
    // The total is a property of the data, not of how it is being paged
    // through; a total that moved between pages would break every paging
    // control that trusts it.
    const [first, second] = await Promise.all([page(1), page(2)]);

    expect(second.count).toBe(first.count);
    expect(second.totalPages).toBe(first.totalPages);
  });

  it("gives adjacent pages unrelated rows", async () => {
    const [first, second] = await Promise.all([page(1), page(2)]);
    const seen = new Set(first.results.map((row) => row.id));

    expect(second.results.filter((row) => seen.has(row.id))).toEqual([]);
  });

  it("returns a partial last page and an empty page past the end", async () => {
    const first = await page(1);
    const count = first.count ?? 0;
    const totalPages = first.totalPages ?? 1;
    const last = await page(totalPages);

    expect(last.results).toHaveLength(count - (totalPages - 1) * 10);
    expect((await page(totalPages + 1)).results).toEqual([]);
  });

  it("leaves a root-level list unpaged", async () => {
    // A lookup or a search returns its whole list; only an explicit limit
    // should shorten it.
    const whole = listSchema.parse(
      await body(
        await handle(get("http://localhost/api/lookup"), { output: listSchema })
      )
    );
    const limited = listSchema.parse(
      await body(
        await handle(get("http://localhost/api/lookup?limit=3"), {
          output: listSchema,
        })
      )
    );

    expect(whole.length).toBeGreaterThan(0);
    expect(limited).toHaveLength(3);
  });
});

describe("echoing inputs", () => {
  it("reflects a path parameter into a field of the same name", async () => {
    const response = await handle(
      get("http://localhost/api/property/ABC123"),
      { output: detailSchema },
      { params: { reference: "ABC123" } }
    );

    expect(detailSchema.parse(await body(response)).reference).toBe("ABC123");
  });

  it("reflects a query parameter, coerced to the declared type", async () => {
    const response = await handle(
      get("http://localhost/api/property?floors=3&city=Bristol"),
      { output: detailSchema }
    );
    const parsed = detailSchema.parse(await body(response));

    expect(parsed.floors).toBe(3);
    expect(parsed.city).toBe("Bristol");
  });

  it("ignores an input that names no field", async () => {
    const response = await handle(
      get("http://localhost/api/property?unrelated=x"),
      { output: detailSchema }
    );

    expect(response.status).toBe(200);
  });

  it("lets the endpoint's own options outrank an echo", async () => {
    const response = await handle(
      get("http://localhost/api/property?city=Bristol"),
      {
        output: detailSchema,
        options: { overrides: { city: (): string => "Leeds" } },
      }
    );

    expect(detailSchema.parse(await body(response)).city).toBe("Leeds");
  });
});

describe("x-mock controls", () => {
  it("serves the requested status with an error body", async () => {
    const response = await handle(
      get("http://localhost/api/devices", { "x-mock-status": "503" }),
      { output: pageSchema }
    );

    expect(response.status).toBe(503);
    expect(await body(response)).toEqual({ error: "Mocked 503 response" });
  });

  it("sends no body for a status that forbids one", async () => {
    const response = await handle(
      get("http://localhost/api/devices", { "x-mock-status": "204" }),
      { output: pageSchema }
    );

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  it("uses the endpoint's own success status", async () => {
    const response = await handle(get("http://localhost/api/note"), {
      output: detailSchema,
      status: 201,
    });

    expect(response.status).toBe(201);
  });

  it("sizes the collection and collapses to one page", async () => {
    const response = await handle(
      get("http://localhost/api/devices?limit=10", { "x-mock-count": "3" }),
      { output: pageSchema }
    );
    const parsed = pageSchema.parse(await body(response));

    expect(parsed.results).toHaveLength(3);
    expect(parsed.count).toBe(3);
    expect(parsed.totalPages).toBe(1);
  });

  it("serves an empty collection for a count of zero", async () => {
    const response = await handle(
      get("http://localhost/api/devices", { "x-mock-count": "0" }),
      { output: pageSchema }
    );

    expect(pageSchema.parse(await body(response)).results).toEqual([]);
  });

  it("changes the data for the same request when the seed changes", async () => {
    const [a, b] = await Promise.all([
      handle(get("http://localhost/api/devices", { "x-mock-seed": "a" }), {
        output: pageSchema,
      }).then((r) => r.text()),
      handle(get("http://localhost/api/devices", { "x-mock-seed": "b" }), {
        output: pageSchema,
      }).then((r) => r.text()),
    ]);

    expect(a).not.toBe(b);
  });

  it("waits before responding", async () => {
    const started = Date.now();
    await handle(
      get("http://localhost/api/devices", { "x-mock-delay": "40" }),
      {
        output: pageSchema,
      }
    );

    expect(Date.now() - started).toBeGreaterThanOrEqual(35);
  });

  it("rejects a malformed control rather than ignoring it", async () => {
    // A silently ignored control is indistinguishable from a mock that does not
    // support it, and the only symptom is a page that looks subtly wrong.
    const response = await handle(
      get("http://localhost/api/devices", { "x-mock-count": "twenty" }),
      { output: pageSchema }
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toContain("x-mock-count");
  });

  it("rejects a control outside its range", async () => {
    const response = await handle(
      get("http://localhost/api/devices", { "x-mock-status": "42" }),
      { output: pageSchema }
    );

    expect(response.status).toBe(400);
  });
});

describe("response marking", () => {
  it("marks every mocked response and reports its seed", async () => {
    const response = await handle(get("http://localhost/api/devices?page=2"), {
      output: pageSchema,
    });

    expect(response.headers.get("x-mock")).toBe("1");
    expect(response.headers.get("x-mock-seed")).toBe("GET /api/devices?page=2");
  });
});

describe("failing loudly", () => {
  it("answers 500 when generation cannot satisfy the schema", async () => {
    const response = await handle(get("http://localhost/api/property"), {
      output: detailSchema,
      // A string where the schema declares a number: the sort of override that
      // otherwise reaches the browser and fails there instead. The type error is
      // the first line of defence — this test proves the second still holds for
      // callers who do not have the schema's type to hand.
      // @ts-expect-error — `floors` is a number field
      options: { overrides: { floors: (): string => "many" } },
    });

    expect(response.status).toBe(500);
    expect(await response.text()).toContain("failed its own schema");
  });

  it("answers 500 when an override names no field", async () => {
    const response = await handle(get("http://localhost/api/property"), {
      output: detailSchema,
      // @ts-expect-error — `cityName` is not a path in this schema
      options: { overrides: { cityName: (): string => "Leeds" } },
    });

    expect(response.status).toBe(500);
    expect(await response.text()).toContain("Mock generation failed");
  });
});
