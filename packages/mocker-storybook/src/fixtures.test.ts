import { createServer as createHttpServer } from 'node:http'
import type { Server } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer } from 'vite'
import type { ViteDevServer } from 'vite'
import { readFixture, writeFixture } from './fixtures'
import { mockerFixtures } from './vite'

/**
 * The seam itself: the preview's two fetches, against the real plugin.
 *
 * `fixed.test.ts` stubs this module to assert policy and `vite.test.ts` drives
 * the store over HTTP, so what neither of them covers is the join between
 * them — which is where the failures would be silent. A relative URL resolved
 * against the wrong origin, or MSW's `bypass` omitted so the mock intercepts its
 * own fixture lookups, both look exactly like "the store never had that file".
 *
 * `location` is repointed at the test server because that is precisely what is
 * under test: these functions address the store relatively, the way a preview
 * reaches its own dev server.
 */

let root: string
let vite: ViteDevServer
let http: Server

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'mocker-transport-'))
  vite = await createServer({
    root,
    configFile: false,
    logLevel: 'silent',
    server: { middlewareMode: true },
    plugins: [mockerFixtures()],
  })

  http = createHttpServer(vite.middlewares)
  await new Promise<void>((resolve) => {
    http.listen(0, '127.0.0.1', resolve)
  })

  const address = http.address()
  if (address === null || typeof address === 'string') {
    throw new Error('The test server did not report a port.')
  }

  const origin = `http://127.0.0.1:${String(address.port)}`
  globalThis.location = { href: `${origin}/`, origin } as Location
})

afterAll(async () => {
  await new Promise<void>((resolve) => {
    http.close(() => {
      resolve()
    })
  })
  await vite.close()
  await rm(root, { recursive: true, force: true })
})

describe('the preview talking to its store', () => {
  it('reports a fixture that has never been written as a miss', async () => {
    expect(await readFixture('GET/api/absent/00000000.json')).toEqual({
      kind: 'miss',
    })
  })

  it('reads back what it wrote', async () => {
    const name = 'GET/api/devices/1a2b3c4d.json'
    await writeFixture(name, '{\n  "results": []\n}\n')

    expect(await readFixture(name)).toEqual({
      kind: 'hit',
      body: '{\n  "results": []\n}\n',
    })
  })

  it('addresses a nested path the same way the store files it', async () => {
    // The one thing a relative URL can get wrong without saying so: joining the
    // route to a multi-segment name.
    const name = 'GET/api/property/ABC123/notes/5c0d9e11.json'
    await writeFixture(name, '{"ok":true}')

    expect(await readFixture(name)).toEqual({
      kind: 'hit',
      body: '{"ok":true}',
    })
  })
})

describe('when nothing is listening', () => {
  it('says so rather than throwing into the story', async () => {
    // A preview built to static files, or a project that forgot the plugin.
    // Either way the story should still render generated data.
    globalThis.location = {
      href: 'http://127.0.0.1:1/',
      origin: 'http://127.0.0.1:1',
    } as Location

    expect(await readFixture('GET/api/devices/1a2b3c4d.json')).toEqual({
      kind: 'unavailable',
    })
    await expect(
      writeFixture('GET/api/devices/1a2b3c4d.json', '{}'),
    ).resolves.toBeUndefined()
  })
})
