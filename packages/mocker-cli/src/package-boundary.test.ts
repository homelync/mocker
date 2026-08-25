import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The claim this package makes that nothing else can check.
 *
 * **It reaches no adapter.** The tree it writes is `fixturePath`'s, and the
 * whole value of that is that *two* adapters replay it — Playwright through
 * `node:fs`, Storybook through a Vite plugin and an HTTP hop. A CLI that
 * imported either would be seeding one of them, and the first person to run it
 * for the other would find out by getting no fixtures and no explanation.
 *
 * Nothing enforces it but this test. The two adapters are not dependencies, so
 * the mistake is one `pnpm add` away and would look, in a diff, like reuse.
 *
 * The other half is the one the *siblings* rely on: this package is node-only,
 * with a filesystem in half its files, and its published entry must therefore
 * never end up in any of theirs. That direction cannot be asserted from here —
 * it is asserted by each of them refusing to import outside itself — so what is
 * checked here is the near side: this package imports only the library, faker,
 * and node.
 *
 * The import-graph walker below is copied from the sibling packages on purpose.
 * Each must travel with the package it constrains; a shared helper would be
 * exactly the repo-level thing that did not survive the last extraction.
 * `.fallowrc.jsonc` whitelists the duplication.
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

/** Whether a specifier names one of the runtime adapters. */
function isAdapter(specifier: string): boolean {
  return (
    specifier.startsWith('@homelync/mocker-next') ||
    specifier.startsWith('@homelync/mocker-storybook') ||
    specifier.startsWith('@homelync/mocker-playwright')
  )
}

describe("the CLI's boundaries", () => {
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

  it('never reaches an adapter, tests included', () => {
    const offenders = files.flatMap((file) =>
      referencesIn(file)
        .filter(({ specifier }) => isAdapter(specifier))
        .map(({ specifier }) => `${path.relative(root, file)} → ${specifier}`),
    )

    expect(offenders).toEqual([])
  })

  it.each(['index.ts', 'cli.ts'])(
    '%s reaches only the library, faker and node',
    (entry) => {
      const allowed = new Set(['@homelync/mocker', '@faker-js/faker'])
      const closure = runtimeClosure(path.join(root, entry))

      const offenders = [...closure].flatMap(([file, references]) =>
        references
          .filter(({ runtime }) => runtime)
          .filter(({ specifier }) => !specifier.startsWith('.'))
          .filter(({ specifier }) => !specifier.startsWith('node:'))
          .filter(({ specifier }) => !allowed.has(specifier))
          .map(
            ({ specifier }) => `${path.relative(root, file)} → ${specifier}`,
          ),
      )

      expect(offenders).toEqual([])
    },
  )

  /**
   * zod is a peer, and it is the host's copy that matters: the registry's
   * schemas carry `_zod.def`, and a second copy cannot read them. Nothing here
   * needs zod at a runtime edge, so nothing here should have one.
   */
  it('never reaches zod outside a test', () => {
    const offenders = files
      .filter((file) => !file.endsWith('.test.ts'))
      .flatMap((file) =>
        referencesIn(file)
          .filter(({ runtime }) => runtime)
          .filter(({ specifier }) => specifier === 'zod')
          .map(
            ({ specifier }) => `${path.relative(root, file)} → ${specifier}`,
          ),
      )

    expect(offenders).toEqual([])
  })
})
