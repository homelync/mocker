import {
  createServer as createHttpServer,
  request as httpRequest,
} from 'node:http'
import type { Server } from 'node:http'
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer } from 'vite'
import type { ViteDevServer } from 'vite'
import { FIXTURE_ROUTE } from './route'
import { mockerFixtures } from './vite'

/**
 * The store, against a real Vite server and a real directory.
 *
 * Driven through Vite rather than by calling the middleware directly, because
 * half of what is being asserted belongs to the mounting: connect strips the
 * route prefix before the handler sees a URL, and `enforce: "pre"` is what keeps
 * Vite's own catch-all from answering first. A hand-rolled harness would prove
 * the handler and re-implement the two things most likely to be wrong.
 */

let root: string
let vite: ViteDevServer
let http: Server
let port: number
let origin: string

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'mocker-fixtures-'))
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
  port = address.port
  origin = `http://127.0.0.1:${String(port)}`
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

const fixture = (name: string): string => `${origin}${FIXTURE_ROUTE}/${name}`

const put = (name: string, body: string): Promise<Response> =>
  fetch(fixture(name), { method: 'PUT', body })

/** Where the store puts a fixture, given the default `dir`. */
const onDisk = (name: string): string =>
  path.join(root, 'mocks', ...name.split('/'))

/** A request with the path sent exactly as written, and its status back. */
const raw = (method: string, requestPath: string): Promise<number> =>
  new Promise((resolve, reject) => {
    const request = httpRequest(
      { host: '127.0.0.1', port, path: requestPath, method },
      (response) => {
        response.resume()
        resolve(response.statusCode ?? 0)
      },
    )
    request.on('error', reject)
    request.end('{}')
  })

describe('the fixture store', () => {
  it('reports a fixture it has never been given as missing', async () => {
    const response = await fetch(fixture('GET/api/absent/00000000.json'))

    expect(response.status).toBe(404)
  })

  it('writes a fixture, creating the directories on the way', async () => {
    const name = 'GET/api/devices/1a2b3c4d.json'
    const response = await put(name, '{"ok":true}')

    expect(response.status).toBe(204)
    expect(await readFile(onDisk(name), 'utf8')).toBe('{"ok":true}')
  })

  it('serves back exactly what was written', async () => {
    const name = 'GET/api/devices/2b3c4d5e.json'
    await put(name, '{\n  "results": []\n}\n')

    const response = await fetch(fixture(name))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    // Verbatim, not re-serialised: the file is edited by hand, and reformatting
    // someone's edit on the way out would show up as noise in every diff.
    expect(await response.text()).toBe('{\n  "results": []\n}\n')
  })

  it('serves a file put there by hand, not only one it wrote', async () => {
    // The whole point of a directory of JSON: a fixture can be authored, not
    // just recorded.
    const name = 'GET/api/handmade/3c4d5e6f.json'
    await mkdir(path.dirname(onDisk(name)), { recursive: true })
    await writeFile(onDisk(name), '{"authored":true}', 'utf8')

    expect(await (await fetch(fixture(name))).json()).toEqual({
      authored: true,
    })
  })

  it('never answers stale, so an edit shows on the next reload', async () => {
    const name = 'GET/api/devices/4d5e6f70.json'
    await put(name, '{"v":1}')

    expect((await fetch(fixture(name))).headers.get('cache-control')).toBe(
      'no-store',
    )
  })
})

describe('a request the store should not honour', () => {
  it('refuses to climb out of the fixture directory', async () => {
    // Sent raw, because `fetch` resolves dot segments before they leave the
    // client and the guard would never be reached. Anything that can open a
    // socket to the dev server can send this, which is why the check exists at
    // all: a plugin that will write an arbitrary file on request is a worse bug
    // than a broken fixture.
    const response = await raw('PUT', `${FIXTURE_ROUTE}/../../escaped.json`)

    expect(response).toBe(400)
  })

  it('refuses a path that is not a fixture', async () => {
    // The store holds one kind of file, so the only paths it accepts are the
    // ones it could have written.
    const response = await fetch(`${origin}${FIXTURE_ROUTE}/GET/api/devices`)

    expect(response.status).toBe(400)
  })

  it('leaves a verb it does not implement to the rest of the server', async () => {
    const response = await fetch(fixture('GET/api/devices/1a2b3c4d.json'), {
      method: 'DELETE',
    })

    expect(response.status).not.toBe(204)
  })
})
