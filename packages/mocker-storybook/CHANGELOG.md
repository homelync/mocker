# @homelync/mocker-storybook

## 2.0.0

### Major Changes

- [#60](https://github.com/homelync/mocker/pull/60) [`7c8e83f`](https://github.com/homelync/mocker/commit/7c8e83f29b416aece48acb81e390d93d9fde7125) Thanks [@magicspon](https://github.com/magicspon)! - Require msw 3. The `msw` peer range is now `^3.0.0`, and msw 2 is no longer supported. Upgrade msw and regenerate your service worker with `npx msw init <public dir>`. If your tests call `server.listen({ onUnhandledRequest })`, rename the option to `onUnhandledFrame`, as msw 3 requires.

## 1.0.0

### Major Changes

- [#31](https://github.com/homelync/mocker/pull/31) [`e91bcdb`](https://github.com/homelync/mocker/commit/e91bcdbfb9ec39d104eb9c898b7143113d6af096) Thanks [@magicspon](https://github.com/magicspon)! - First release. One endpoint registry of zod schemas, served four ways: Next.js
  App Router routes, Storybook handlers over MSW, Playwright fixtures over
  `context.route`, and a `mocker` command that writes the whole registry to disk.

### Patch Changes

- Updated dependencies [[`e91bcdb`](https://github.com/homelync/mocker/commit/e91bcdbfb9ec39d104eb9c898b7143113d6af096)]:
  - @homelync/mocker@1.0.0
