Welcome to your new TanStack Start app!

# Getting Started

To run this application:

```bash
npm install
npm run dev
```

# Data CLI

`damp` generates and inspects the simulated damp/mould dataset in the terminal — sparklines,
summary stats and distribution bars, so the tuning loop for the physics model is "change a constant
in `src/lib/gen/params.ts`, look at the shape, repeat" without a browser round-trip.

There is no build step and no bundler. The CLI runs on bare Node (v24+ strips the types) and
resolves `#/*` through the `imports` map in `package.json`, so it shares the generator with the app
directly from source:

```bash
pnpm damp inspect risk
```

Three ways to invoke it, all equivalent:

| Invocation                     | Notes                                          |
| ------------------------------ | ---------------------------------------------- |
| `pnpm damp <args>`             | The `damp` script. Flags pass straight through |
| `./src/cli/index.ts <args>`    | Direct execution via the shebang               |
| `node src/cli/index.ts <args>` | Explicit, and what the other two reduce to     |

The `bin` entry in `package.json` maps `damp` to the CLI, so `pnpm link --global` puts `damp` on
your `PATH` if you want it outside the repo. It also registers the CLI as an entry point for
`fallow`, which otherwise reports the whole generator as dead code.

Two commands: `inspect` renders a dataset in the terminal, and `create` writes one to a file by
asking questions. Running `damp` with no arguments goes straight to `create`.

## Guided mode

Flags are the right interface once you know the shape of the data. When you do not, run it with no
arguments:

```bash
pnpm damp          # or: pnpm damp create
```

It walks through dataset, scope, date range, resolution and seed, then asks where the file should
go — directory, file name, format, and the named export if you pick TypeScript:

```
◆  Output format
│  ● JSON                (rows and meta — interchange, load tests, notebooks)
│  ○ TypeScript module   (a typed named export you can import as a fixture)
└

◆  Directory
│  Search: src/fixtures
│  ● src/fixtures (default)
│  ○ src
│  ○ src/cli
│  ...
└

◆  Named export
│  riskFixture
└
```

Every field is pre-filled with a default you can accept with Enter, and every prompt can be
cancelled with Ctrl-C without writing anything.

**It counts the rows before generating them.** Walking the world costs milliseconds; generating the
readings it implies can cost half a minute. Accepting every default on `readings` across the whole
portfolio would be 4.3 million rows, so the wizard stops and asks first:

```
▲  This query generates about 4,320,000 rows. Expect tens of seconds and a large file.

◆  Generate anyway?
│  ○ Yes / ● No
└
```

Prompts that only affect one dataset are skipped for the others — resolution and room are asked for
`readings` only, and the named export only when the format is TypeScript.

### Picking a directory

The directory prompt searches the real tree under `src/` rather than asking you to remember it — a
typo there is the one step of `create` that silently succeeds, writing a fixture into a directory
nobody imports from.

Matching is fuzzy, on a subsequence rather than a substring, so `slgen` finds `src/lib/gen`. Runs
of adjacent characters and matches at a segment boundary rank highest, which is what a person
typing an abbreviation means:

```
◆  Directory
│  Search: stor
│  ● src/stories
│  ○ src/stories/assets
│  ○ src/stories/stor
└
```

The last row is the escape hatch: **a name that matches nothing is created inside the row currently
highlighted.** Type `comp` to land on `src/components`, arrow down to the child you want, and keep
typing — the suggestion follows the highlight:

```
◆  Directory
│  Search: compx
│  ● src/components/ui/compx   (new — inside src/components/ui)
└
```

Anything containing a `/` is taken literally instead, which is how you get out of the highlighted
location — `fixtures/raw` is `fixtures/raw`, wherever the cursor happens to be. Either way the
directory is created when the file is written, so abandoning the wizard at a later prompt leaves
nothing behind.

## Datasets

`inspect` takes the dataset as a positional argument. It defaults to `readings`.

| Dataset       | Rows                             | Rendered as                                                 |
| ------------- | -------------------------------- | ----------------------------------------------------------- |
| `readings`    | Sensor samples at the resolution | Sparklines for temp, RH, dewpoint and CO₂                   |
| `risk`        | One row per unit per day         | Risk index and germination-hours sparklines, band breakdown |
| `work-orders` | Repairs raised in the window     | State and category breakdowns, SLA breach rate              |
| `units`       | Dwellings matching the filters   | Tenure breakdown                                            |
| `buildings`   | Blocks matching the filters      | Archetype breakdown, U-value and year-built sparklines      |

## Options

| Flag           | Default              | Notes                                                         |
| -------------- | -------------------- | ------------------------------------------------------------- |
| `--unit`       | —                    | Unit ids, comma separated (`u-0001`)                          |
| `--building`   | —                    | Building ids, comma separated (`b-0001`)                      |
| `--site`       | —                    | Site ids, comma separated (`s-01`)                            |
| `--room`       | —                    | `living` \| `bedroom` \| `bathroom` \| `kitchen`              |
| `--from`       | `--to` minus 30 days | ISO date, inclusive                                           |
| `--to`         | `2026-03-31`         | ISO date, exclusive                                           |
| `--resolution` | `1h`                 | `15m` \| `1h` \| `1d`                                         |
| `--limit`      | —                    | Cap rows returned                                             |
| `--seed`       | `damp-portfolio-v1`  | Any string; the whole world is derived from it                |
| `--json`       | `false`              | Emit raw JSON (rows plus meta) to stdout instead of rendering |
| `--out`        | —                    | Write the result to a file, creating parent directories       |
| `--format`     | `json`               | Format for `--out`: `json` \| `ts`                            |
| `--export`     | `<dataset>Fixture`   | Named export for `--format ts`                                |
| `--pretty`     | `false`              | Indent the output written by `--out`                          |

`--resolution` sets the sampling interval for `readings` only. `risk` is always daily, and the
entity datasets ignore it.

## Examples

Sensor traces for one bathroom over January:

```bash
pnpm damp inspect readings --unit u-0001 --room bathroom \
  --from 2026-01-01 --to 2026-02-01
```

```
readings · 2026-01-01 → 2026-02-01 · 1h · seed damp-portfolio-v1
744 rows in 34.1ms

tempC     ▂▄█▂▇▇▃▄▅▄▆▄▄▆▁▅▇▁▂▆▁▄▆▃▆▄▃▅▄▅█▃▄▇▃▅▇▁▅▆▂▆▄▃▇▁▅█   min    4.0   max   16.4   mean   10.9   p95   15.0
rh%       ██▁▇█▃█▆▃█▅▅▇▄▆▇▁▇▇▁█▆▂█▆▄▇▄▆▇▃▆▇▁██▁█▆▃█▅▄█▄▅█▄   min   71.9   max  100.0   mean   87.6   p95  100.0
dewpoint  ▃▆▇▃█▆▅▄▄▅▆▄▅▆▁▇▆▂▃▄▂▅▅▅▇▄▄▅▄▆█▄▅▆▄▇▅▂▆▆▃▆▄▅▇▁▇█   min    4.0   max   14.1   mean    8.8   p95   12.1
co2ppm    ▃▇▁▄▇▂▆▄▁▇▄▂█▂▂▇▁▄▇▂▅▅▁▆▄▂█▂▂█▁▂█▁▄▆▁▅▅▁▇▄▁█▂▂█▁   min    533   max   1037   mean    824   p95   1000
```

A heating season of risk for one unit. Filtering by `--unit` also prints the episodes overlaid on
that unit's building — boiler failures, leaks, fan failures and cold snaps — which is usually what
explains a step in the sparkline:

```bash
pnpm damp inspect risk --unit u-0001 --from 2025-09-01 --to 2026-03-31
```

```
risk · 2025-09-01 → 2026-03-31 · 1h · seed damp-portfolio-v1
211 rows in 55.7ms

risk      ████████▇▇▇▇▆▅▄▄▄▄▄▃▃▃▃▂▂▂▂▂▂▂▂▂▂▂▂▃▃▃▁▁▁▂▂▂▂▂▂▂   min   96.4   max   99.2   mean   97.6   p95   99.1
rh hours  ███████████████▇▆▆▅▅▅▄▄▂▃▃▃▃▂▁▁▁▁▁▂▃▃▃▂▁▁▂▂▂▃▃▄▄   min    288   max    336   mean    313   p95    336

critical ████████████████████████████████    211  100.0%

  episodes · b-0001 180 Murazik-Heidenreich Meadow
  ! boiler-failure         2025-11-18 → 2025-11-18  (0.4d)
```

Repairs and SLA performance across two blocks:

```bash
pnpm damp inspect work-orders --building b-0001,b-0002 \
  --from 2025-09-01 --to 2026-03-31
```

Pipe the rows somewhere else:

```bash
pnpm damp inspect units --site s-01 --json | jq '.rows[] | select(.rationsHeat)'
```

## Writing to disk

`--out` writes the full result — `rows` plus `meta` — to a JSON file. Parent directories are
created, so you can drop a fixture straight into a nested path:

```bash
pnpm damp inspect risk --unit u-0001 \
  --from 2025-09-01 --to 2026-03-31 --out fixtures/risk/u-0001.json
```

```
wrote /path/to/fixtures/risk/u-0001.json · 211 rows · 32.2 kB
```

The terminal render still happens, so you see the shape of what you just captured rather than
writing blind. The confirmation goes to **stderr**, which means `--out` composes with a piped
`--json` without corrupting the stream:

```bash
pnpm damp inspect units --site s-01 --json --out snapshot.json | jq '.meta.count'
```

Output is compact by default, because these files get large — a season of 15-minute readings is
7.9 MB across 60,768 rows. Use `--pretty` for the small pulls you actually intend to read:

```bash
pnpm damp inspect buildings --limit 5 --out sample.json --pretty
```

### TypeScript fixtures

`--format ts` writes a module with a typed named export instead of raw JSON. The row type comes
from `schema.ts`, so a fixture that drifts from the schema fails at `tsc` rather than at render
time:

```bash
pnpm damp inspect risk --unit u-0001 --from 2026-03-01 --to 2026-03-31 \
  --out src/fixtures/risk.ts --format ts --pretty
```

```ts
/**
 * Generated by `damp` — do not edit.
 *
 * risk · 2026-03-01 → 2026-03-31 · 1h
 * seed damp-portfolio-v1 · 30 rows
 *
 * Regenerate with the same seed and window to reproduce this file exactly.
 */

import type { RiskDay } from '#/lib/gen/schema.ts'

export const riskFixture: Array<RiskDay> = [
  {
    "unitId": "u-0001",
    ...
```

Import it through the same `#/*` alias as everything else:

```ts
import { riskFixture } from '#/fixtures/risk.ts'
```

`--export` renames the binding, and is validated — a reserved word or a non-identifier is rejected
before anything is written. The default is derived from the dataset, so `work-orders` becomes
`workOrdersFixture` typed as `Array<WorkOrder>`. Note that a `ts` fixture has to live under `src/`
for `#/*` to resolve; JSON has no such constraint.

Unlike JSON, the module carries `rows` only — the meta goes in the header comment, since a fixture
you import should be the data rather than a wrapper around it.

### Reproducibility

Since the generator is deterministic, the `rows` written for a given `--seed` and window are
byte-identical run to run. `meta` is not — it carries `elapsedMs`, which moves by a millisecond or
two each time. If you commit a snapshot as a fixture, either accept that one-line churn or strip
meta on the way in:

```bash
pnpm damp inspect risk --unit u-0001 --json | jq '.rows' > fixtures/risk.json
```

## Notes

- **Everything is deterministic.** The same `--seed` always produces the same world, readings,
  episodes and work orders. Change `--seed` to get a different portfolio with the same statistics.
- **The header reports cost.** `200 rows (from 60,000) in 6884.7ms` means the generator produced
  60,000 rows and `--limit` truncated them — the generation cost stays visible rather than hidden
  behind the cap.
- **The episodes block only appears** when `--unit` resolves to between one and four buildings.
  Filtering wider suppresses it, since a portfolio-scale episode list is noise.
- **Colour** is on for a TTY and off otherwise, so redirecting to a file gives clean text. `NO_COLOR`
  disables it explicitly.
- `maxPoints` (Largest-Triangle-Three-Buckets decimation) exists in the query schema but is not yet
  exposed as a flag. The CLI always returns raw rows.

# Building For Production

To build this application for production:

```bash
npm run build
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `src/routes/demo/`
2. Replace the Tailwind import in `src/styles.css` with your own styles
3. Remove `tailwindcss()` from the plugins array in `vite.config.ts`
4. Remove `@tailwindcss/vite` and `tailwindcss` from `package.json`

## Linting & Formatting

This project uses [eslint](https://eslint.org/) and [prettier](https://prettier.io/) for linting and formatting. Eslint is configured using [tanstack/eslint-config](https://tanstack.com/config/latest/docs/eslint). The following scripts are available:

```bash
npm run lint
npm run format
npm run check
```

## Deploy with Nitro

This project uses Nitro as a generic server adapter, so it can run on any Node-compatible host.

```bash
npm run build
node dist/server/index.mjs
```

The build output is a self-contained Node server. To deploy, push the `dist/` directory to your host (Render, Fly.io, your own VPS, etc.) and run the server command above.

For host-specific presets (Vercel, Netlify, Cloudflare, AWS Lambda, etc.) and tuning, see https://v3.nitro.build/deploy.

## T3Env

- You can use T3Env to add type safety to your environment variables.
- Add Environment variables to the `src/env.mjs` file.
- Use the environment variables in your code.

### Usage

```ts
import { env } from '#/env'

console.log(env.VITE_APP_TITLE)
```

## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from '@tanstack/react-router'
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
})
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})

// Use in a component
function MyComponent() {
  const [time, setTime] = useState('')

  useEffect(() => {
    getServerTime().then(setTime)
  }, [])

  return <div>Server time: {time}</div>
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Hello, World!' }),
    },
  },
})
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).
