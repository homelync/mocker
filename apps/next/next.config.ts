import { withMocker } from '@homelync/mocker-next/config'
import type { NextConfig } from 'next'
import { mockRegistry } from './src/mocks/registry'

/**
 * `@homelync/mocker-next/config`, never the package root: Next evaluates this
 * file with its own loader, unbundled, before any build graph exists, so
 * tree-shaking cannot protect it. Importing the root here would load
 * `@faker-js/faker` on every `next dev`.
 */
const nextConfig: NextConfig = {
  // The workspace packages resolve to their TypeScript sources during
  // development (`exports` points at `src/*.ts`; `publishConfig.exports` swaps
  // in `dist/*.js` at publish time), so Next has to compile them. A consumer
  // installing from npm needs neither of these lines.
  transpilePackages: ['@homelync/mocker', '@homelync/mocker-next'],
}

/**
 * Installs both halves of the mock: the `beforeFiles` rewrites that intercept
 * registered routes, and — in a production build — the `turbopack.resolveAlias`
 * that makes the adapter resolve to a stub containing no generator.
 *
 * Inert with `MOCK_API` unset, and inert in production whatever it says.
 */
export default withMocker({ registry: mockRegistry }, nextConfig)
