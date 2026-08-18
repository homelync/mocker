import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The two claims this adapter makes that nothing else can check.
 *
 * 1. **It runs in a browser.** Storybook bundles this into the preview, which
 *    has no `node:fs` and no `process`. A node builtin acquired here does not
 *    fail a build — Vite resolves it and the preview dies on load, in a
 *    consumer's app, with a stack trace pointing at a dependency.
 *
 * 2. **It does not depend on Storybook.** These are plain MSW handlers, which
 *    is what lets the same call answer a Vitest browser test or a bare
 *    `setupWorker`, and what keeps this package still building when Storybook's
 *    addon API moves. The loader reads `{ id }` structurally rather than
 *    importing `StoryContext` for exactly this reason — a single convenience
 *    import would quietly turn a peer-free package into a coupled one.
 *
 * Asserted here rather than in lint config for the reason the sibling packages
 * give: a test travels with the code it constrains, and a lint rule that is
 * dropped or misconfigured fails silently.
 */

const root = import.meta.dirname

/** Source, with comments removed so prose cannot look like an import. */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/\/\/[^\n]*/g, '')
}

const FROM =
  /\b(import|export)\s+(type\s+)?(?:[^;]*?)\bfrom\s*["']([^"']+)["']/g
const BARE = /\bimport\s*["']([^"']+)["']/g
const DYNAMIC = /\bimport\s*\(\s*["']([^"']+)["']/g

interface Reference {
  readonly specifier: string
  /**
   * Only `import type` / `export type` are erased. `import { type X } from "y"`
   * still emits a side-effect import of `y` under `verbatimModuleSyntax`, so it
   * counts as reaching the module.
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

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) return sources(full)
    return entry.name.endsWith('.ts') ? [full] : []
  })
}

/**
 * Whether a specifier reaches outside this package.
 *
 * Judged by where a relative path *lands*, not by how many `../` it carries.
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

/** Every module reachable from an entry by following runtime imports only. */
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

describe("the Storybook adapter's boundaries", () => {
  const files = sources(root)

  it('reads the files it means to', () => {
    // Guard against a rename silently turning every assertion below into a
    // no-op over an empty set.
    expect(files.length).toBeGreaterThan(4)
  })

  it('imports nothing from outside the package', () => {
    const offenders = files.flatMap((file) =>
      referencesIn(file)
        .filter(({ specifier }) => escapesPackage(file, specifier))
        .map(({ specifier }) => `${path.relative(root, file)} → ${specifier}`),
    )

    expect(offenders).toEqual([])
  })

  it('keeps the published entry loadable in a browser', () => {
    // Everything the preview bundle is allowed to contain. `msw` is the runtime;
    // `@magicspon/mocker` carries the generator and the registry; `zod` appears
    // type-only, so it never reaches this list.
    const allowed = new Set(['msw', '@magicspon/mocker'])
    const closure = runtimeClosure(path.join(root, 'index.ts'))

    const offenders = [...closure].flatMap(([file, references]) =>
      references
        .filter(({ runtime }) => runtime)
        .filter(({ specifier }) => !specifier.startsWith('.'))
        .filter(({ specifier }) => !allowed.has(specifier))
        .map(({ specifier }) => `${path.relative(root, file)} → ${specifier}`),
    )

    expect(offenders).toEqual([])
  })

  it('depends on Storybook nowhere, tests included', () => {
    // Deliberately over the whole package rather than the entry's closure: a
    // test that imported `StoryContext` would prove the coupling is available
    // and make adopting it in `src/` look harmless.
    const offenders = files.flatMap((file) =>
      referencesIn(file)
        .filter(
          ({ specifier }) =>
            specifier === 'storybook' ||
            specifier.startsWith('storybook/') ||
            specifier.startsWith('@storybook/'),
        )
        .map(({ specifier }) => `${path.relative(root, file)} → ${specifier}`),
    )

    expect(offenders).toEqual([])
  })
})
