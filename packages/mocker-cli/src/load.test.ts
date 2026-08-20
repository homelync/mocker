import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadRegistry, RegistryLoadError } from './load'

/**
 * Real modules on disk, imported for real. A stubbed `import()` would prove
 * nothing about the part that actually goes wrong — what node will and will not
 * resolve — and the auto-detection rules are about the *shape* of a module's
 * exports, which needs a module to have some.
 *
 * Plain `.js`, deliberately. What a host's `.ts` registry needs is node's type
 * stripping, which is a property of node rather than of this package; asserting
 * it here would be asserting that node works.
 */

let directory: string

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'mocker-load-'))
})

afterEach(async () => {
  await rm(directory, { recursive: true, force: true })
})

/** Write a module and return its path. Uniquely named, to defeat the ESM cache. */
let counter = 0
async function module(source: string): Promise<string> {
  counter += 1
  const file = path.join(directory, `registry-${String(counter)}.mjs`)
  await writeFile(file, source, 'utf8')
  return file
}

const TABLE = `{ 'GET /api/devices': { schema: async () => ({}) } }`

describe('loadRegistry', () => {
  it.each(['mockRegistry', 'registry'])(
    'finds a table exported as %s',
    async (name) => {
      const file = await module(`export const ${name} = ${TABLE}`)
      expect(Object.keys(await loadRegistry(file))).toEqual([
        'GET /api/devices',
      ])
    },
  )

  it('finds a default export', async () => {
    const file = await module(`export default ${TABLE}`)
    expect(Object.keys(await loadRegistry(file))).toEqual(['GET /api/devices'])
  })

  /**
   * The checked-table idiom leaves both on the module, and the unchecked one is
   * the wrong answer: picking it would bypass the check the host wrote a second
   * statement to get.
   */
  it('prefers mockRegistry over registry', async () => {
    const file = await module(
      `export const registry = { 'GET /unchecked': { schema: async () => ({}) } }
       export const mockRegistry = { 'GET /checked': { schema: async () => ({}) } }`,
    )
    expect(Object.keys(await loadRegistry(file))).toEqual(['GET /checked'])
  })

  it('reads the export it is told to read', async () => {
    const file = await module(
      `export const mockRegistry = ${TABLE}
       export const other = { 'GET /other': { schema: async () => ({}) } }`,
    )
    expect(Object.keys(await loadRegistry(file, 'other'))).toEqual([
      'GET /other',
    ])
  })

  it('resolves a path relative to the working directory', async () => {
    const file = await module(`export const mockRegistry = ${TABLE}`)
    expect(
      Object.keys(await loadRegistry(path.relative(process.cwd(), file))),
    ).toEqual(['GET /api/devices'])
  })
})

describe('refusals', () => {
  it('names the file that will not load', async () => {
    const missing = path.join(directory, 'absent.mjs')
    await expect(loadRegistry(missing)).rejects.toThrow(RegistryLoadError)
    await expect(loadRegistry(missing)).rejects.toThrow(/absent\.mjs/)
  })

  /** Offering a loader for a path typo sends someone to install tsx over a typo. */
  it('does not blame the loader for a file that is simply absent', async () => {
    const missing = path.join(directory, 'absent.ts')
    await expect(loadRegistry(missing)).rejects.toThrow(RegistryLoadError)
    await expect(loadRegistry(missing)).rejects.not.toThrow(/--import=tsx/)
  })

  /**
   * The tsconfig-alias case, which is the one people actually hit.
   *
   * The specifier is assembled rather than written, so `package-boundary.test.ts`
   * — which reads this file as text — does not mistake the fixture for an import
   * this package actually makes.
   */
  it('points at a loader when a TypeScript module will not load', async () => {
    const alias = '@/nowhere'
    counter += 1
    const file = path.join(directory, `broken-${String(counter)}.ts`)
    await writeFile(
      file,
      `import x ${'from'} ${JSON.stringify(alias)}\nexport default x`,
      'utf8',
    )

    await expect(loadRegistry(file)).rejects.toThrow(/--import=tsx/)
  })

  it('lists what the module exports when the named one is absent', async () => {
    const file = await module(`export const table = ${TABLE}`)
    await expect(loadRegistry(file, 'nope')).rejects.toThrow(
      /has no export named "nope". It exports: table/,
    )
  })

  it('refuses a named export that is not a table', async () => {
    const file = await module(`export const table = { 'GET /x': {} }`)
    await expect(loadRegistry(file, 'table')).rejects.toThrow(
      /is not a mock registry/,
    )
  })

  it('says what it looked for when nothing matches', async () => {
    const file = await module(`export const table = ${TABLE}`)
    await expect(loadRegistry(file)).rejects.toThrow(
      /Looked for mockRegistry, registry, default; pass --export/,
    )
  })

  /** An empty table is not a table it can tell apart from any other object. */
  it('refuses an empty export', async () => {
    const file = await module(`export const mockRegistry = {}`)
    await expect(loadRegistry(file)).rejects.toThrow(RegistryLoadError)
  })
})
