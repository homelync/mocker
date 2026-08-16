import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The claims that make this folder a package, asserted rather than asserted-in-
 * comments.
 *
 * Three of these were once eslint zones in the host application's
 * `eslint.config.mjs`. They did not survive extraction into this repo — which is
 * the whole argument for this file. A test travels with the code it constrains;
 * repo lint config does not, and a rule that is dropped, disabled or
 * misconfigured fails silently, in the one direction that matters (faker in a
 * production bundle).
 *
 * The claims:
 *
 * 1. Nothing here imports the host application.
 * 2. `core/` depends on nothing but `zod` and `@faker-js/faker`.
 * 3. `core/` does not reach the rest of the package — it must not know what an
 *    HTTP route, an environment variable or a console is.
 * 4. Nothing reachable from `config.ts` at runtime imports `zod` or
 *    `@faker-js/faker`. This is the guarantee a `next.config.ts` rests on.
 */

const root = import.meta.dirname

/** Source, with comments removed so prose cannot look like an import. */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/\/\/[^\n]*/g, '')
}

/** `import ... from "x"` / `export ... from "x"`, capturing the `type` marker. */
const FROM =
  /\b(import|export)\s+(type\s+)?(?:[^;]*?)\bfrom\s*["']([^"']+)["']/g
/** `import "x"` — a side-effect import, always runtime. */
const BARE = /\bimport\s*["']([^"']+)["']/g
/** `import("x")` — always runtime. */
const DYNAMIC = /\bimport\s*\(\s*["']([^"']+)["']/g

interface Reference {
  readonly specifier: string
  /**
   * Whether the import survives compilation.
   *
   * Only `import type` / `export type` are erased. `import { type X } from "y"`
   * is *not*: under `verbatimModuleSyntax` it still emits a side-effect import
   * of `y`, so for the purposes of claim 4 it counts as reaching the module.
   */
  readonly runtime: boolean
}

function referencesIn(file: string): Reference[] {
  const text = code(file)

  return [
    // Non-null: the specifier group is not optional, so it participates in
    // every match. The `type` group is, which is exactly what is being read.
    ...[...text.matchAll(FROM)].map(([, , typeMarker, specifier]) => ({
      specifier: specifier!,
      runtime: !typeMarker,
    })),
    ...[...text.matchAll(BARE)].map(([, specifier]) => ({
      specifier: specifier!,
      runtime: true,
    })),
    ...[...text.matchAll(DYNAMIC)].map(([, specifier]) => ({
      specifier: specifier!,
      runtime: true,
    })),
  ]
}

/** Every `.ts` file under a directory, tests included. */
function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) return sources(full)
    return entry.name.endsWith('.ts') ? [full] : []
  })
}

/**
 * Whether a specifier reaches the host application.
 *
 * A relative path is judged by where it *lands*, not by how many `../` it has:
 * `../../core` from an adapter is this package, while the same string from
 * `core/` would be the repo. Only resolving tells the two apart.
 */
function escapesPackage(file: string, specifier: string): boolean {
  if (specifier.startsWith('@/')) return true
  if (!specifier.startsWith('.')) return false

  const resolved = path.resolve(path.dirname(file), specifier)
  return resolved !== root && !resolved.startsWith(`${root}${path.sep}`)
}

/** A relative specifier as a file on disk, or null if it is external. */
function resolveLocal(file: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null

  const base = path.resolve(path.dirname(file), specifier)
  for (const candidate of [`${base}.ts`, path.join(base, 'index.ts')]) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

/**
 * Every module reachable from an entry by following *runtime* imports.
 *
 * Type-only edges are not followed: they are erased, so a type that mentions a
 * zod schema does not put zod in a bundle. That distinction is exactly what lets
 * the registry vocabulary appear on the config surface at all.
 */
function runtimeClosure(entry: string): Map<string, Reference[]> {
  const seen = new Map<string, Reference[]>()
  const queue = [entry]

  while (queue.length > 0) {
    const file = queue.pop()!
    if (seen.has(file)) continue

    const references = referencesIn(file)
    seen.set(file, references)

    for (const reference of references) {
      if (!reference.runtime) continue
      const next = resolveLocal(file, reference.specifier)
      if (next !== null) queue.push(next)
    }
  }

  return seen
}

describe('mocker is extractable as a package', () => {
  const files = sources(root)

  it('reads more than a handful of files', () => {
    // Guard against the walk silently finding nothing and passing everything.
    expect(files.length).toBeGreaterThan(10)
  })

  it('imports nothing from the host application', () => {
    const offenders = files.flatMap((file) =>
      referencesIn(file)
        .filter(({ specifier }) => escapesPackage(file, specifier))
        .map(({ specifier }) => `${path.relative(root, file)} → ${specifier}`),
    )

    expect(offenders).toEqual([])
  })

  it('keeps core free of every dependency but zod and faker', () => {
    // The generator is the part with the widest possible reuse — a Nest test, a
    // Storybook decorator, a node script — so its dependency list is the one
    // that must not grow by accident. `vitest` is allowed, in the test files.
    const allowed = new Set(['zod', '@faker-js/faker', 'vitest'])

    const offenders = sources(path.join(root, 'core')).flatMap((file) =>
      referencesIn(file)
        .filter(({ specifier }) => !specifier.startsWith('.'))
        .filter(({ specifier }) => !specifier.startsWith('node:'))
        .filter(({ specifier }) => !allowed.has(specifier))
        .map(({ specifier }) => `${path.relative(root, file)} → ${specifier}`),
    )

    expect(offenders).toEqual([])
  })

  it('keeps core from reaching the rest of the package', () => {
    // Was an eslint zone in the host app, and did not travel. `core` must not
    // know what an HTTP route is (`registry/`), what an environment variable is
    // (`flag.ts`) or that a console exists (`log.ts`) — those are host
    // conventions, and the moment `core` depends on one it stops being usable as
    // a plain fixture factory in a runtime that has none of them.
    const core = path.join(root, 'core')

    const offenders = sources(core).flatMap((file) =>
      referencesIn(file)
        .map(({ specifier }) => ({
          specifier,
          resolved: resolveLocal(file, specifier),
        }))
        .filter(
          ({ resolved }) => resolved !== null && !resolved.startsWith(core),
        )
        .map(({ specifier }) => `${path.relative(root, file)} → ${specifier}`),
    )

    expect(offenders).toEqual([])
  })

  it('keeps the config entry free of zod and faker at runtime', () => {
    // The claim `next.config.ts` rests on. Next evaluates its config with its own
    // loader, unbundled, so tree-shaking cannot protect it: a runtime edge to
    // faker from here means faker loads on every `next dev`, and can be emitted
    // into a production build that must not contain it.
    const forbidden = ['zod', '@faker-js/faker']
    const closure = runtimeClosure(path.join(root, 'config.ts'))

    const offenders = [...closure].flatMap(([file, references]) =>
      references
        .filter(({ runtime }) => runtime)
        .filter(({ specifier }) =>
          forbidden.some(
            (name) => specifier === name || specifier.startsWith(`${name}/`),
          ),
        )
        .map(({ specifier }) => `${path.relative(root, file)} → ${specifier}`),
    )

    expect(offenders).toEqual([])
  })
})
