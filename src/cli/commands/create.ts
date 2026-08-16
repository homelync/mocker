/**
 * The argumentless path.
 *
 * `damp` with no arguments lands here. Flags are the right interface once you
 * know the shape of the data; this is the one for when you do not, and want a
 * fixture on disk without learning five of them first.
 */

import {
  autocomplete,
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  note,
  outro,
  select,
  spinner,
  text,
} from '@clack/prompts'
import { defineCommand } from 'citty'
import { SEED, rooms } from '#/lib/gen/params.ts'
import { getWorld } from '#/lib/gen/entities.ts'
import { queryDataset } from '#/lib/gen/query.ts'
import { createDirectorySearch } from '../directories.ts'
import {
  defaultDirectory,
  defaultExportName,
  defaultFileName,
  formatBytes,
  validateExportName,
  writeResult,
} from '../output.ts'
import { style } from '../render/terminal.ts'

import type { Dataset, OutputFormat } from '../output.ts'
import type { Query } from '#/lib/gen/schema.ts'

/**
 * Let the process exit once prompting is done.
 *
 * Clack leaves its stdin reader attached after the last prompt resolves, and
 * that handle keeps the event loop alive — the CLI would print its outro and
 * then hang, in a pipe and in a real terminal alike. Unreffing rather than
 * calling `process.exit` lets buffered stdout flush first.
 */
function releaseStdin(): void {
  process.stdin.pause()
  process.stdin.unref()
}

/** Every prompt can be cancelled; bail the same way from all of them. */
function unwrap<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel('Nothing written.')
    releaseStdin()
    process.exit(0)
  }
  return value
}

const DATASETS: Array<{ value: Dataset; label: string; hint: string }> = [
  {
    value: 'readings',
    label: 'readings',
    hint: 'sensor samples — temp, RH, dewpoint, CO₂',
  },
  {
    value: 'risk',
    label: 'risk',
    hint: 'daily mould risk index and band, per unit',
  },
  {
    value: 'work-orders',
    label: 'work-orders',
    hint: 'repairs raised, with SLA outcome',
  },
  {
    value: 'units',
    label: 'units',
    hint: 'dwellings and household attributes',
  },
  {
    value: 'buildings',
    label: 'buildings',
    hint: 'blocks, archetypes and fabric',
  },
]

const SCOPES = [
  { value: 'all', label: 'Whole portfolio', hint: 'no filter' },
  { value: 'units', label: 'By unit', hint: 'e.g. u-0001' },
  { value: 'buildings', label: 'By building', hint: 'e.g. b-0001' },
  { value: 'sites', label: 'By site', hint: 'e.g. s-01' },
] as const

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Clack validates the raw input, and applies `defaultValue` only afterwards —
 * so an empty field has to pass, or pressing Enter would reject the very
 * default the placeholder is offering.
 */
function validateDate(value: string | undefined): string | undefined {
  if (!value) return undefined
  if (!ISO_DATE.test(value)) return 'Use YYYY-MM-DD'
  if (Number.isNaN(Date.parse(`${value}T00:00:00Z`))) return 'Not a real date'
  return undefined
}

function required(value: string | undefined): string | undefined {
  return value?.trim() ? undefined : 'Required'
}

const SAMPLES_PER_DAY: Record<string, number> = { '15m': 96, '1h': 24, '1d': 1 }

const DAY_MS = 86_400_000

/**
 * How many rows this query will generate, before any cap.
 *
 * Walking the world costs milliseconds; generating the readings it implies can
 * cost half a minute. Counting first means the wizard can say so before you
 * commit to waiting.
 */
function estimateRows(query: Query): number {
  const world = getWorld(query.seed ?? SEED)

  const units = query.units
    ? query.units.flatMap((id) => {
        const unit = world.byId.unit.get(id)
        return unit ? [unit] : []
      })
    : query.buildings
      ? world.units.filter((unit) =>
          new Set(query.buildings).has(unit.buildingId),
        )
      : query.sites
        ? (() => {
            const wanted = new Set(query.sites)
            const ids = new Set(
              world.buildings
                .filter((b) => wanted.has(b.siteId))
                .map((b) => b.id),
            )
            return world.units.filter((unit) => ids.has(unit.buildingId))
          })()
        : world.units

  const from = Date.parse(`${query.from}T00:00:00Z`)
  const to = Date.parse(`${query.to}T00:00:00Z`)
  const days = Math.max(0, Math.round((to - from) / DAY_MS))

  switch (query.dataset) {
    case 'risk':
      return units.length * days
    case 'readings': {
      const wanted = query.rooms ? new Set(query.rooms) : null
      const sensors = units.reduce((total, unit) => {
        const all = world.sensorsByUnit.get(unit.id) ?? []
        return (
          total +
          (wanted ? all.filter((s) => wanted.has(s.room)).length : all.length)
        )
      }, 0)
      return sensors * (SAMPLES_PER_DAY[query.resolution ?? '1h'] ?? 24) * days
    }
    case 'units':
      return units.length
    case 'buildings':
    case 'work-orders':
      // Work orders are driven by episode rates rather than a row-per-day
      // shape, so this is the building count — an order of magnitude, not a
      // prediction. It only ever gates the "this is expensive" warning.
      return new Set(units.map((unit) => unit.buildingId)).size
  }
}

/** Above this, generating is slow enough to be worth warning about. */
const EXPENSIVE_ROWS = 50_000

async function askQuery(): Promise<Query> {
  const dataset = unwrap(
    await select({ message: 'Which dataset?', options: DATASETS }),
  )

  const scope = unwrap(
    await select({
      message: 'How much of the portfolio?',
      options: [...SCOPES],
    }),
  )

  let ids: Array<string> | undefined
  if (scope !== 'all') {
    const raw = unwrap(
      await text({
        message: `Which ${scope.slice(0, -1)} ids?`,
        placeholder: SCOPES.find((s) => s.value === scope)?.hint.replace(
          'e.g. ',
          '',
        ),
        // The only prompt with no sensible default — there is nothing to fall
        // back to when you have said you want a subset.
        validate: required,
      }),
    )
    ids = raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  }

  // A 30-day window, matching the CLI's own default. The full heating season
  // across the whole portfolio is 422,000 rows and over half a minute — not
  // what the guided path should hand you before you have asked for it.
  const from = unwrap(
    await text({
      message: 'From date',
      placeholder: '2026-03-01',
      defaultValue: '2026-03-01',
      validate: validateDate,
    }),
  )

  const to = unwrap(
    await text({
      message: 'To date',
      placeholder: '2026-03-31',
      defaultValue: '2026-03-31',
      validate: validateDate,
    }),
  )

  // Resolution and room only change the shape of `readings`.
  let resolution = '1h'
  let room: string | undefined
  if (dataset === 'readings') {
    resolution = unwrap(
      await select({
        message: 'Sampling resolution',
        initialValue: '1h',
        options: [
          {
            value: '15m',
            label: '15m',
            hint: 'dense — good for stress-testing a renderer',
          },
          { value: '1h', label: '1h', hint: 'the usual choice' },
          { value: '1d', label: '1d', hint: 'coarse — daily means' },
        ],
      }),
    )

    room = unwrap(
      await select({
        message: 'Which room?',
        initialValue: 'all',
        options: [
          { value: 'all', label: 'All rooms' },
          ...Object.entries(rooms).map(([value, meta]) => ({
            value,
            label: meta.label,
          })),
        ],
      }),
    )
  }

  const limitRaw = unwrap(
    await text({
      message: 'Row cap',
      placeholder: 'blank for no cap',
      defaultValue: '',
      validate: (value) =>
        !value || /^\d+$/.test(value) ? undefined : 'Whole number, or blank',
    }),
  )

  const seed = unwrap(
    await text({ message: 'Seed', placeholder: SEED, defaultValue: SEED }),
  )

  return {
    dataset,
    units: scope === 'units' ? ids : undefined,
    buildings: scope === 'buildings' ? ids : undefined,
    sites: scope === 'sites' ? ids : undefined,
    rooms: room && room !== 'all' ? [room] : undefined,
    from,
    to,
    resolution,
    limit: limitRaw ? Number(limitRaw) : undefined,
    seed,
  } as Query
}

/** Exported so the bare `damp` invocation can share it with `damp create`. */
export async function runCreate(): Promise<void> {
  intro(style.bold(' damp '))

  const query = await askQuery()
  const dataset = query.dataset

  const format = unwrap(
    await select({
      message: 'Output format',
      options: [
        {
          value: 'json' as OutputFormat,
          label: 'JSON',
          hint: 'rows and meta — interchange, load tests, notebooks',
        },
        {
          value: 'ts' as OutputFormat,
          label: 'TypeScript module',
          hint: 'a typed named export you can import as a fixture',
        },
      ],
    }),
  )

  // Search rather than recall: the existing tree is offered, fuzzy-matched as
  // you type, and a name that matches nothing becomes a new directory inside
  // whichever row is highlighted. `writeResult` creates it, so a run abandoned
  // at a later prompt leaves nothing behind.
  const fallback = defaultDirectory(format)
  const searchDirectories = createDirectorySearch(fallback)
  const directory = unwrap(
    await autocomplete<string>({
      message: 'Directory',
      placeholder: fallback,
      maxItems: 8,
      options() {
        return searchDirectories(this.userInput, this.focusedValue)
      },
      // The getter has already matched and ranked; clack's own filter is a
      // substring test that would drop the fuzzy hits before they are drawn.
      filter: () => true,
    }),
  )

  const fileName = unwrap(
    await text({
      message: 'File name',
      placeholder: defaultFileName(dataset, format),
      defaultValue: defaultFileName(dataset, format),
    }),
  )

  let exportName: string | undefined
  if (format === 'ts') {
    exportName = unwrap(
      await text({
        message: 'Named export',
        placeholder: defaultExportName(dataset),
        defaultValue: defaultExportName(dataset),
        // Empty is fine — `defaultValue` fills it in. See validateDate.
        validate: (value) =>
          value ? (validateExportName(value) ?? undefined) : undefined,
      }),
    )
  }

  const pretty = unwrap(
    await confirm({
      message: 'Indent the output?',
      // Source files get read by people; JSON snapshots get read by machines
      // and run to six figures of rows.
      initialValue: format === 'ts',
    }),
  )

  const estimate = estimateRows(query)
  if (estimate > EXPENSIVE_ROWS) {
    log.warn(
      `This query generates about ${estimate.toLocaleString()} rows. ` +
        'Expect tens of seconds and a large file.',
    )
    const proceed = unwrap(
      await confirm({ message: 'Generate anyway?', initialValue: false }),
    )
    if (!proceed) {
      cancel('Nothing written. Narrow the scope or the date range and retry.')
      releaseStdin()
      return
    }
  }

  // Every prompt is done by this point; nothing else needs stdin.
  releaseStdin()

  const progress = spinner()
  progress.start('Generating')
  const result = queryDataset(query)
  progress.stop(
    `Generated ${result.meta.count.toLocaleString()} rows in ${result.meta.elapsedMs}ms`,
  )

  if (result.meta.count === 0) {
    log.warn('That query matched no rows — check the ids and the date range.')
  }

  const written = writeResult(result, `${directory}/${fileName}`, {
    format,
    exportName,
    pretty,
  })

  note(
    [
      written.path,
      `${result.meta.count.toLocaleString()} rows · ${formatBytes(written.bytes)}`,
      format === 'ts'
        ? `import { ${exportName} } from '#/${directory.replace(/^src\//, '')}/${fileName}'`
        : `damp inspect ${dataset} --json`,
    ].join('\n'),
    format === 'ts' ? 'Written — import it with' : 'Written',
  )

  outro('Done.')
}

export const create = defineCommand({
  meta: {
    name: 'create',
    description: 'Build a dataset file by answering prompts',
  },
  run: () => runCreate(),
})
