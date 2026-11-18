---
'@homelync/mocker-storybook': major
---

Require msw 3. The `msw` peer range is now `^3.0.0`, and msw 2 is no longer supported. Upgrade msw and regenerate your service worker with `npx msw init <public dir>`. If your tests call `server.listen({ onUnhandledRequest })`, rename the option to `onUnhandledFrame`, as msw 3 requires.
