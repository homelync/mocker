---
"@homelync/mocker-storybook": minor
---

Add fixed responses: `mockerHandlers(registry, { fixed: true })` answers from a JSON
file on disk instead of generating per request, writing the file from the
generated data the first time an endpoint is asked for.

Generation was already deterministic, so this is not about stability — it is
about being able to **edit** the answer and commit it. The generator gives you
plausible data; a fixture gives you the specific data the story is about,
reviewable in a diff and identical for everyone who checks the repo out.

The filename is derived from the request — method, path, sorted query, and the
`seed` / `count` / `status` the story set — as a mirrored tree,
`mocks/GET/api/devices/3f9a1c2d.json`. It is the same on every machine, does not
move when a registry key is renamed, and gives two stories of one endpoint two
files rather than one they fight over. A fixture that no longer parses against
its schema is a 500 naming the file, never a silent regeneration over the edit.

Distinct from an `overrides` entry, which pins one _field_ while the rest is
still generated; `fixed` freezes the whole response, as a file.

A preview is a browser and has no disk, so this adds a second entry,
`@homelync/mocker-storybook/vite`, holding the store itself:

```ts
// .storybook/main.ts
import { mockerFixtures } from "@homelync/mocker-storybook/vite";

export default defineMain({
  // …
  viteFinal: (config) => ({
    ...config,
    plugins: [...(config.plugins ?? []), mockerFixtures()],
  }),
});
```

`vite` is a new **optional** peer dependency, needed only for this. Without the
plugin the preview says so once in the console and generates as usual, so an
existing setup is unaffected and a statically built Storybook still works.
