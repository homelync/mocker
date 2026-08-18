import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'

/**
 * The app under test: one HTML file, served by twelve lines of node.
 *
 * Deliberately not `apps/next`. That example makes no client-side requests at
 * all — its four API routes exist and nothing in its UI calls them — so a
 * Playwright run against it would intercept exactly zero requests, and making it
 * work means building a client-fetching UI first. It would also have to run
 * under `MOCK_API=1 next dev`, because `withMocker` aliases itself out of a
 * production build, and dev-mode first-request compilation is a real source of
 * CI flake.
 *
 * A bundler would add nothing either: what is under test is the adapter's
 * interception, and a `fetch` is a `fetch` however it was built. This boots in
 * milliseconds, has no build step to keep in step with anything, and every byte
 * of it is readable in one file.
 */

const PORT = Number(process.env.PORT ?? 5175)
const root = path.join(import.meta.dirname, 'public')

const server = createServer((request, response) => {
  // Everything is the same page: the app has one route, and the API paths are
  // answered by the mock before they ever reach this process.
  void readFile(path.join(root, 'index.html'), 'utf8')
    .then((html) => {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      response.end(html)
    })
    .catch((error) => {
      response.writeHead(500, { 'content-type': 'text/plain' })
      response.end(String(error))
    })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`e2e app on http://127.0.0.1:${String(PORT)}`)
})
