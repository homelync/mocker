import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The claim this adapter makes that nothing else can check.
 *
 * **Playwright is type-only, everywhere, tests included.** `mockerTest()` returns
 * a plain object of fixture functions the *consumer* passes to `base.extend`, and
 * `mockerRoutes()` calls methods on a `BrowserContext` it is handed — so nothing
 * here ever has to evaluate Playwright's own module.
 *
 * That is worth asserting rather than intending, because every way of breaking it
 * fails quietly. One runtime `import { test } from "@playwright/test"` in the
 * imperative core and anyone driving `playwright-core` from a script gets a
 * resolution failure or a second copy of Playwright's fixture registry — the
 * fixtures register against one copy and the runner reads the other, so nothing
 * throws and no mock is installed. It would also make both peers real rather than
 * optional, and start breaking this package whenever the runner API moves.
 *
 * This is the direct analogue of `mocker-storybook`'s no-`storybook` rule, and it
 * covers the tests for the same reason: a test that imported `@playwright/test`
 * would prove the coupling is available and make adopting it in `src/` look
 * harmless. The unit tests drive a stub context instead, which is what keeps them
 * running in plain Vitest with no browser.
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

/** Whether a specifier names Playwright, by any of the names it ships under. */
function isPlaywright(specifier: string): boolean {
  return (
    specifier === 'playwright' ||
    specifier === 'playwright-core' ||
    specifier.startsWith('@playwright/') ||
    specifier.startsWith('playwright/') ||
    specifier.startsWith('playwright-core/')
  )
}

describe("the Playwright adapter's boundaries", () => {
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

  it('never reaches Playwright at a runtime edge, tests included', () => {
    const offenders = files.flatMap((file) =>
      referencesIn(file)
        .filter(({ runtime }) => runtime)
        .filter(({ specifier }) => isPlaywright(specifier))
        .map(({ specifier }) => `${path.relative(root, file)} → ${specifier}`),
    )

    expect(offenders).toEqual([])
  })

  it('ships an entry that loads with Playwright absent', () => {
    // The narrower statement behind the assertion above, over the published
    // entry's closure alone: both peers are declared optional, so a consumer
    // driving `playwright-core` from a script may have neither installed.
    const allowed = new Set(['@homelync/mocker'])
    const closure = runtimeClosure(path.join(root, 'index.ts'))

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
})
