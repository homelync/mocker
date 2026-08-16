// Checks the claim the package layout is built around: after `next build`,
// nothing under `.next/server` reaches the generator or faker.
//
// Believing it is not the same as checking it. The mechanism is
// `turbopack.resolveAlias` swapping the adapter for its production stub, which
// fails in exactly one direction — silently, into a bundle — so this script is
// the thing that would notice.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const BUILD_DIR = '.next/server'

/**
 * Identifiers that must not appear in a production chunk.
 *
 * Deliberately *not* the bare word `faker`: a registry override is written
 * `({ faker }) => ...`, and that parameter name is bundled with the table — it
 * is a destructured argument, not the library.
 */
const FORBIDDEN = [
  '@faker-js/faker',
  'UnsupportedSchemaError',
  'MOCK_SEED_RESPONSE_HEADER',
  'x-mock-seed',
]

function* files(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) yield* files(path)
    else if (path.endsWith('.js')) yield path
  }
}

let scanned = 0
const offenders = []

for (const path of files(BUILD_DIR)) {
  scanned += 1
  const source = readFileSync(path, 'utf8')
  const found = FORBIDDEN.filter((needle) => source.includes(needle))
  if (found.length > 0) offenders.push({ path, found })
}

if (offenders.length > 0) {
  for (const { path, found } of offenders) {
    console.error(`✗ ${path} references ${found.join(', ')}`)
  }
  console.error(
    `\n${offenders.length} of ${scanned} server chunks contain the mock. The production alias is not doing its job.`,
  )
  process.exit(1)
}

console.log(`✓ no mock or faker references across ${scanned} server chunks`)
