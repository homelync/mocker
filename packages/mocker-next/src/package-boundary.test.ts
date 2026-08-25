import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The two claims the Next adapter makes that nothing else can check.
 *
 * 1. **`config.ts` never reaches the generator.** Next evaluates `next.config.ts`
 *    with its own loader, unbundled, before any build graph exists — so
 *    tree-shaking cannot protect it. A runtime edge to the generator from here
 *    means faker loads on every `next dev`, and can be emitted into a production
 *    build that must not contain it.
 *
 *    This test proves only the *local* half: that nothing reachable from
 *    `config.ts` imports `zod`, `@faker-js/faker`, or any `@homelync/mocker`
 *    entry other than `/config`. The other half — that `@homelync/mocker/config`
 *    is itself pure — is asserted by that package's own boundary test. Composed,
 *    the two give the whole guarantee, and each travels with the code it
 *    constrains.
 *
 * 2. **`index.prod.ts` exports exactly what `index.ts` exports.** The stub is
 *    swapped in by resolution, not by a flag, so a name that exists in one and
 *    not the other is a build error in a consumer's app and nowhere else. Drift
 *    here fails in the same silent direction as claim 1.
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

/** Names a module exports: re-export lists and declarations alike. */
function exportedNames(file: string): Set<string> {
  const text = code(file)
  const names = new Set<string>()

  // `export { a, b as c }` and `export type { d }`, with or without `from`.
  for (const [, clause] of text.matchAll(
    /\bexport\s+(?:type\s+)?\{([^}]*)\}/g,
  )) {
    for (const entry of clause!.split(',')) {
      // `a as b` is exported as `b`; a bare `a` is exported as `a`.
      const name = entry
        .replace(/^\s*type\s+/, '')
        .split(/\s+as\s+/)
        .pop()
        ?.trim()
      if (name !== undefined && name !== '') names.add(name)
    }
  }

  // `export function x`, `export const x`, `export interface x`, `export type x`.
  for (const [, name] of text.matchAll(
    /\bexport\s+(?:declare\s+)?(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g,
  )) {
    names.add(name!)
  }

  return names
}

describe("the Next adapter's boundaries", () => {
  it('reads the files it means to', () => {
    // Guard against a rename silently turning every assertion below into a
    // no-op over an empty set.
    expect(sources(root).length).toBeGreaterThan(5)
  })

  it('keeps the config entry away from the generator', () => {
    // Anything the config surface may touch. `@homelync/mocker/config` carries
    // the same guarantee one level down; the bare package root does not, which
    // is the entire reason the `/config` entry exists.
    const allowed = new Set(['@homelync/mocker/config'])
    const closure = runtimeClosure(path.join(root, 'config.ts'))

    const offenders = [...closure].flatMap(([file, references]) =>
      references
        .filter(({ runtime }) => runtime)
        .filter(({ specifier }) => !specifier.startsWith('.'))
        .filter(({ specifier }) => !specifier.startsWith('node:'))
        .filter(({ specifier }) => !allowed.has(specifier))
        .map(({ specifier }) => `${path.relative(root, file)} → ${specifier}`),
    )

    expect(offenders).toEqual([])
  })

  it('keeps the production stub in step with the real adapter', () => {
    const real = exportedNames(path.join(root, 'index.ts'))
    const stub = exportedNames(path.join(root, 'index.prod.ts'))

    // Sorted arrays rather than set equality: on failure the diff names the
    // export that drifted, which is the only thing anyone wants to know here.
    expect([...stub].sort()).toEqual([...real].sort())
  })
})
