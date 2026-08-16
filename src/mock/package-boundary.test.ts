import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The claim that makes this folder a package: it imports nothing from the host.
 *
 * An eslint zone says the same thing, and this test is not redundant with it.
 * The zone is host configuration — it lives in the application's
 * `eslint.config.mjs` and will not travel when this folder is lifted out, and a
 * rule that is disabled or misconfigured fails silently. This test travels with
 * the code it constrains, and reads the imports rather than trusting a resolver.
 *
 * "Imports nothing from the host" means, concretely: no `@/` alias, no path that
 * climbs out of `mock/`, and no runtime dependency beyond `zod`, `faker` and
 * whatever an adapter's own runtime is.
 */

const root = import.meta.dirname;

/** Every `from "..."` specifier in a source file, static and dynamic alike. */
const SPECIFIER = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;

/** Every `.ts` file under `mock/`, tests included. */
function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return sources(full);
    return entry.name.endsWith(".ts") ? [full] : [];
  });
}

function specifiersIn(file: string): string[] {
  return [...readFileSync(file, "utf8").matchAll(SPECIFIER)].map(
    ([, specifier]) => specifier
  );
}

/**
 * Whether a specifier reaches the host application.
 *
 * A relative path is judged by where it *lands*, not by how many `../` it has:
 * `../../core` from `adapters/next/` is this package, while the same string from
 * `core/` would be the repo. Only resolving tells the two apart.
 */
function escapesPackage(file: string, specifier: string): boolean {
  if (specifier.startsWith("@/")) return true;
  if (!specifier.startsWith(".")) return false;

  const resolved = path.resolve(path.dirname(file), specifier);
  return resolved !== root && !resolved.startsWith(`${root}${path.sep}`);
}

describe("mock/ is extractable as a package", () => {
  const files = sources(root);

  it("reads more than a handful of files", () => {
    // Guard against the walk silently finding nothing and passing everything.
    expect(files.length).toBeGreaterThan(10);
  });

  it("imports nothing from the host application", () => {
    const offenders = files.flatMap((file) =>
      specifiersIn(file)
        .filter((specifier) => escapesPackage(file, specifier))
        .map((specifier) => `${path.relative(root, file)} → ${specifier}`)
    );

    expect(offenders).toEqual([]);
  });

  it("keeps core free of every dependency but zod and faker", () => {
    // The generator is the part with the widest possible reuse — a Nest test, a
    // Storybook decorator, a node script — so its dependency list is the one
    // that must not grow by accident. `vitest` is allowed, in the test files.
    const allowed = new Set(["zod", "@faker-js/faker", "vitest"]);

    const offenders = sources(path.join(root, "core")).flatMap((file) =>
      specifiersIn(file)
        .filter((specifier) => !specifier.startsWith("."))
        .filter((specifier) => !specifier.startsWith("node:"))
        .filter((specifier) => !allowed.has(specifier))
        .map((specifier) => `${path.relative(root, file)} → ${specifier}`)
    );

    expect(offenders).toEqual([]);
  });
});
