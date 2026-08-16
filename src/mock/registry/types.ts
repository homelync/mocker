import type { z } from "zod";
import type { CheckedCounts, CheckedOverrides, GenerateOptions } from "../core";

/**
 * The endpoint registry's vocabulary — the type a *host* declares its table in.
 *
 * The table itself lives in the host application (`src/mocks/registry.ts` in
 * this repo) and is passed to the mock as an argument. Only the shape is
 * library-owned, which is what keeps this folder free of any endpoint, schema
 * or path belonging to one particular app.
 *
 * Note what is *not* here: no zod schema value, only a function that resolves
 * one. That is what lets a build-time config (`next.config.ts`) import the
 * host's table to derive interception rules without pulling a single
 * application module — or zod, or faker — into config evaluation.
 */

/**
 * One declared mock, keyed in the registry by `"METHOD /api/path"` — with an
 * optional query string, `"METHOD /api/path?name=[param]"`.
 *
 * The query half states what a request must *carry*, not everything it may:
 * unlisted parameters (`page`, `limit`, filters) are ignored, so a key is not
 * invalidated by the UI adding a sort. Three forms of condition:
 *
 * | Written               | Matches                                            |
 * | --------------------- | -------------------------------------------------- |
 * | `?ref=[reference]`    | present and non-empty; value bound to `reference`   |
 * | `?mode=summary`       | present and exactly `summary`                       |
 * | `?ref`                | present, any value                                  |
 *
 * A bound value reaches generation as a route param, so it is echoed into a
 * response field of *its own* name — which is what lets `?propertyReference=X`
 * fill a schema whose field is called `reference`.
 */
export interface MockRegistryEntry<Schema extends z.ZodType = z.ZodType> {
  /**
   * Resolves the response schema, lazily.
   *
   * A thunk rather than a value so that importing the table costs nothing: a
   * build-time config reads only the keys and never calls this, and serving a
   * request calls only the one entry it matched.
   *
   * Laziness is a *runtime* property only: TypeScript resolves the type of a
   * dynamic `import()` statically, so `Schema` is known to the compiler even
   * though nothing is loaded until the entry is served. That is what lets
   * {@link CheckedMockRegistry} check an entry's overrides against its schema.
   */
  readonly schema: () => Promise<Schema>;
  /** Success status, for the endpoints that do not answer 200 (`POST` → 201). */
  readonly status?: number;
  /** Generation options for every request to this endpoint. */
  readonly options?: GenerateOptions<z.infer<Schema>>;
  /**
   * A ticket reference marking this as an endpoint that does **not exist yet**.
   *
   * A planned entry is a design sketch, not a contract: its schema is somebody's
   * guess at a shape nobody has built. The drift test asserts a planned key
   * resolves to *no* `route.ts`, so the day the real route lands the test fails
   * and forces the entry to be promoted or deleted — which is what stops a stale
   * mock silently shadowing a working endpoint.
   */
  readonly planned?: string;
}

/** The registry itself: `"GET /api/property?propertyReference=[reference]"` → entry. */
export type MockRegistry = Readonly<Record<string, MockRegistryEntry>>;

/**
 * What a host's table is declared *against*; {@link CheckedMockRegistry} is what
 * it is checked against.
 *
 * The two exist separately because of a conflict TypeScript cannot resolve in
 * one annotation. Annotating an entry supplies contextual types on the way in —
 * which is the only reason an override can be written `({ faker }) => ...`
 * rather than `({ faker }: GenContext) => ...`. But a contextual return type
 * also *drives* inference inside a generic call: annotate the thunk as
 * `() => Promise<z.ZodType>` and `import(…).then((m) => m.devicesResponseSchema)`
 * resolves its `.then` type parameter to `z.ZodType`, throwing away the concrete
 * schema before anything downstream can read it back. Every override check then
 * passes vacuously, against `unknown`.
 *
 * So `schema` is left untyped here — the thunk keeps whatever type it infers —
 * while `options` is typed, which is where contextual typing is actually wanted.
 * Nothing is lost: {@link CheckedMockRegistry} demands a real
 * {@link MockRegistryEntry} of every entry a moment later.
 */
export interface MockRegistryDraftEntry {
  /** Untyped on purpose — annotating it would erase the schema's type. */
  readonly schema: unknown;
  readonly status?: number;
  readonly options?: GenerateOptions;
  readonly planned?: string;
}

/** A host's table as declared. See {@link MockRegistryDraftEntry}. */
export type MockRegistryDraft = Readonly<
  Record<string, MockRegistryDraftEntry>
>;

/**
 * The registry with every entry's overrides checked against *its own* schema.
 *
 * {@link MockRegistry} deliberately forgets which schema an entry carries — it
 * is what every consumer that iterates the table wants, and what keeps
 * `serveFromRegistry` honest about handling any schema. But forgetting it also
 * throws away the only thing that could tell `"results[].statusId"` from
 * `"results[].statusID"`, so the host declares its table in two statements:
 *
 * ```ts
 * const registry = { ... } as const satisfies MockRegistryDraft;
 * export const mockRegistry = registry satisfies CheckedMockRegistry<typeof registry>;
 * ```
 *
 * Two statements rather than one because the check has to name the table's own
 * type, and a declaration cannot refer to itself. Type information flows in
 * opposite directions through them: contextual types flow *down* into the
 * literal from the draft, and each entry's concrete schema is read back *up* out
 * of the literal here. Neither statement alone does both.
 *
 * @typeParam Registry the declared table, as `typeof registry`
 */
export type CheckedMockRegistry<Registry> = {
  readonly [Key in keyof Registry]: CheckedEntry<Registry[Key]>;
};

/**
 * One entry, with its path-keyed options bound to the schema its thunk resolves
 * to.
 *
 * The intersection carries the two halves of the contract: `MockRegistryEntry`
 * checks every *declared* path's value type against the field it pins, and
 * `CheckedEntryOptions` checks that the path exists at all. An entry whose
 * schema cannot be inferred — a thunk typed as returning a bare `z.ZodType` —
 * falls back to the unchecked form rather than failing.
 */
type CheckedEntry<Entry> = Entry extends {
  readonly schema: () => Promise<infer Schema extends z.ZodType>;
}
  ? MockRegistryEntry<Schema> & CheckedEntryOptions<z.infer<Schema>, Entry>
  : MockRegistryEntry;

/** The `options` requirement, or nothing when an entry declares none. */
type CheckedEntryOptions<Output, Entry> = Entry extends {
  readonly options: infer Options;
}
  ? { readonly options: CheckedOptions<Output, Options> }
  : unknown;

/**
 * The two path-keyed options, each demanded only if the entry declares it.
 *
 * An intersection of requirements rather than one object type: an entry that
 * states `counts` and no `overrides` must not be told it is missing one.
 * Everything else in `options` — `count`, `nullishRate`, `locale` — is checked
 * by `MockRegistryEntry` and needs no mention here.
 */
type CheckedOptions<Output, Options> = (Options extends {
  readonly overrides: infer Declared;
}
  ? { readonly overrides: CheckedOverrides<Output, Declared> }
  : unknown) &
  (Options extends { readonly counts: infer Declared }
    ? { readonly counts: CheckedCounts<Output, Declared> }
    : unknown);
