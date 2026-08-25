import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ServerResponse } from 'node:http'
import type { Connect, Plugin, PreviewServer, ViteDevServer } from 'vite'
import { FIXTURE_ROUTE } from './route'

/**
 * The node half of fixed responses: a directory of JSON, over HTTP.
 *
 * This is the one module in the package that a browser must never load, and the
 * only reason it exists. Storybook bundles `index.ts` into the preview, where
 * there is no filesystem; a fixture store needs one. Vite's dev server is the
 * only process in a Storybook run that has both a filesystem and an origin the
 * preview can reach, so the store lives here and the preview talks to it.
 *
 * Deliberately dumb. It does not know what a registry is, what zod is, or what a
 * fixture contains — it reads bytes at a path and writes bytes at a path. That
 * is what keeps `main.ts` cheap to evaluate: nothing reachable from this file
 * imports `@homelync/mocker`, so adding fixtures to a project does not pull the
 * generator, and faker with it, into Storybook's config load.
 * `package-boundary.test.ts` asserts it.
 */

/** How a project points the store at a directory. */
export interface MockerFixturesOptions {
  /**
   * Where fixtures are kept, relative to the Vite root.
   *
   * Committed rather than ignored, in the general case: a fixture is
   * reviewable test data, and the point of the feature is that the same story shows
   * the same rows to everyone. A project that wants them local can gitignore the
   * directory and let each checkout regenerate.
   *
   * @default "mocks"
   */
  readonly dir?: string
}

/** Refuse a body larger than this; a mocked response has no business being one. */
const MAX_BODY_BYTES = 5_000_000

const OK = 200
const NO_CONTENT = 204
const BAD_REQUEST = 400
const NOT_FOUND = 404
const TOO_LARGE = 413
const SERVER_ERROR = 500

/** Path segments a request may not name, whatever it percent-encodes them as. */
const RELATIVE = new Set(['.', '..'])

function send(response: ServerResponse, status: number, body?: string): void {
  response.statusCode = status
  if (body === undefined) {
    response.end()
    return
  }
  response.setHeader('content-type', 'application/json')
  response.end(body)
}

/**
 * A request path as a file inside the store, or `null` if it is not one.
 *
 * `fixturePath` already percent-encodes every segment, so a name it produced
 * cannot contain a `..` to begin with. This checks anyway, because the plugin's
 * contract is with whatever reaches the port rather than with its sibling
 * module, and a dev server that will write an arbitrary file for anything that
 * can talk to localhost is a worse bug than a broken fixture.
 *
 * The `.json` requirement is part of that: the store holds one kind of file, so
 * the only paths it needs to accept are the ones it could have written.
 */
function resolveFixture(root: string, url: string): string | null {
  const [pathname = ''] = url.split('?')
  const segments = pathname.split('/').filter((segment) => segment !== '')

  if (segments.length === 0) return null
  if (segments.some((segment) => RELATIVE.has(segment))) return null
  // Non-null: `segments` is non-empty, so it has a last element.
  if (!segments[segments.length - 1]!.endsWith('.json')) return null

  const file = path.resolve(root, ...segments)
  // Belt and braces. `path.resolve` has already normalised, so this can only
  // fire on something the checks above missed — which is exactly when it matters.
  return file.startsWith(`${root}${path.sep}`) ? file : null
}

/** The whole request body, or `null` if it ran past the cap. */
async function readBody(
  request: Connect.IncomingMessage,
): Promise<string | null> {
  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of request) {
    const buffer = chunk as Buffer
    size += buffer.byteLength
    if (size > MAX_BODY_BYTES) return null
    chunks.push(buffer)
  }

  return Buffer.concat(chunks).toString('utf8')
}

/**
 * The store itself.
 *
 * A miss is a 404 rather than an empty 200, because the preview treats the two
 * differently: 404 means "write one", anything else means "the store is not
 * answering, generate and warn". Collapsing them would have a first run silently
 * pin nothing.
 */
function middleware(root: string): Connect.NextHandleFunction {
  return (request, response, next) => {
    const method = request.method ?? 'GET'
    if (method !== 'GET' && method !== 'PUT') {
      next()
      return
    }

    const file = resolveFixture(root, request.url ?? '')
    if (file === null) {
      send(response, BAD_REQUEST, '{"error":"Not a fixture path"}')
      return
    }

    const done =
      method === 'GET'
        ? serveFixture(response, file)
        : storeFixture(request, response, file)

    void done.catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      send(response, SERVER_ERROR, JSON.stringify({ error: message }))
    })
  }
}

async function serveFixture(
  response: ServerResponse,
  file: string,
): Promise<void> {
  let contents: string
  try {
    contents = await readFile(file, 'utf8')
  } catch {
    // Any failure to read is a miss as far as the preview is concerned: it will
    // generate and try to write, and a genuine permissions problem surfaces
    // there, where there is something to say about it.
    send(response, NOT_FOUND, '{"error":"No fixture"}')
    return
  }

  response.statusCode = OK
  response.setHeader('content-type', 'application/json')
  response.setHeader('cache-control', 'no-store')
  response.end(contents)
}

async function storeFixture(
  request: Connect.IncomingMessage,
  response: ServerResponse,
  file: string,
): Promise<void> {
  const body = await readBody(request)
  if (body === null) {
    send(response, TOO_LARGE, '{"error":"Fixture too large"}')
    return
  }

  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, body, 'utf8')
  send(response, NO_CONTENT)
}

/**
 * Serve and record fixed mock responses from a directory on disk.
 *
 * ```ts
 * // .storybook/main.ts
 * import { mockerFixtures } from "@homelync/mocker-storybook/vite";
 *
 * export default defineMain({
 *   framework: "@storybook/react-vite",
 *   stories: ["../src/**\/*.stories.@(ts|tsx)"],
 *   addons: ["msw-storybook-addon"],
 *   viteFinal: (config) => ({
 *     ...config,
 *     plugins: [...(config.plugins ?? []), mockerFixtures()],
 *   }),
 * });
 * ```
 *
 * Only then does `mockerHandlers(registry, { fixed: true })` have anywhere to
 * read from. Without it the preview says so once in the console and carries on
 * generating, because a missing plugin should cost you fixtures, not Storybook.
 *
 * Dev and `vite preview` only. A built Storybook deployed as static files has no
 * server to ask; a project that wants its fixtures in the build should add the
 * directory to `staticDirs`, which makes them readable — and, being static,
 * permanently unwritable.
 *
 * @param options where the store lives; see {@link MockerFixturesOptions}
 */
export function mockerFixtures(options: MockerFixturesOptions = {}): Plugin {
  const directory = options.dir ?? 'mocks'

  const mount = (server: ViteDevServer | PreviewServer): void => {
    const root = path.resolve(server.config.root, directory)
    server.middlewares.use(FIXTURE_ROUTE, middleware(root))
  }

  return {
    name: 'mocker:fixtures',
    // `pre` so the store answers before Vite's own catch-all does. Its route is
    // namespaced out of any real file's way, but the SPA fallback is not fussy.
    enforce: 'pre',
    configureServer: mount,
    configurePreviewServer: mount,
  }
}
