import { defineCommand } from 'citty'
import { SEED } from '#/lib/gen/params.ts'
import { getWorld } from '#/lib/gen/entities.ts'
import { episodesBetween } from '#/lib/gen/episodes.ts'
import { queryDataset } from '#/lib/gen/query.ts'
import { formatBytes, validateExportName, writeResult } from '../output.ts'
import { bandColour, distribution, series, style } from '../render/terminal.ts'

import type {
  Building,
  Query,
  Reading,
  RiskDay,
  WorkOrder,
} from '#/lib/gen/schema.ts'

function toList(value: string | undefined): Array<string> | undefined {
  if (!value) return undefined
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function countBy<T>(rows: Array<T>, key: (row: T) => string) {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const k = key(row)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

function renderEpisodes(query: Query, seed: string) {
  const world = getWorld(seed)
  const units = query.units
    ? query.units.map((id) => world.byId.unit.get(id))
    : []
  const buildingIds = new Set(
    units.flatMap((unit) => (unit ? [unit.buildingId] : [])),
  )
  if (buildingIds.size === 0 || buildingIds.size > 4) return

  const from = Date.parse(`${query.from ?? '2025-09-01'}T00:00:00Z`)
  const to = Date.parse(`${query.to ?? '2026-03-31'}T00:00:00Z`)

  for (const buildingId of buildingIds) {
    const building = world.byId.building.get(buildingId)
    if (!building) continue
    const episodes = episodesBetween(seed, building, from, to)
    if (episodes.length === 0) continue
    console.log()
    console.log(style.dim(`  episodes · ${building.id} ${building.name}`))
    for (const episode of episodes) {
      const days = (episode.to - episode.from) / 86_400_000
      console.log(
        `  ${style.yellow('!')} ${style.bold(episode.kind.padEnd(23))}` +
          `${new Date(episode.from).toISOString().slice(0, 10)} ` +
          style.dim(`→ ${new Date(episode.to).toISOString().slice(0, 10)}`) +
          style.dim(`  (${days.toFixed(1)}d)`),
      )
    }
  }
}

function renderReadings(rows: Array<Reading>) {
  console.log(
    series(
      'tempC',
      rows.map((r) => r.tempC),
    ),
  )
  console.log(
    series(
      'rh%',
      rows.map((r) => r.relHumidity),
      { colour: style.magenta },
    ),
  )
  console.log(
    series(
      'dewpoint',
      rows.map((r) => r.dewPointC),
      { colour: style.green },
    ),
  )
  console.log(
    series(
      'co2ppm',
      rows.map((r) => r.co2ppm),
      {
        places: 0,
        colour: style.yellow,
      },
    ),
  )
}

function renderRisk(rows: Array<RiskDay>) {
  console.log(
    series(
      'risk',
      rows.map((r) => r.mouldRiskIndex),
      { colour: style.red },
    ),
  )
  console.log(
    series(
      'rh hours',
      rows.map((r) => r.hoursAboveGermination),
      {
        places: 0,
        colour: style.magenta,
      },
    ),
  )
  console.log()
  const order = ['low', 'medium', 'high', 'critical']
  const counts = countBy(rows, (row) => row.band).sort(
    (a, b) => order.indexOf(a[0]) - order.indexOf(b[0]),
  )
  console.log(distribution(counts, { colour: bandColour }))
}

function renderWorkOrders(rows: Array<WorkOrder>) {
  console.log(style.bold('  by state'))
  console.log(distribution(countBy(rows, (row) => row.state)))
  console.log()
  console.log(style.bold('  by category'))
  console.log(distribution(countBy(rows, (row) => row.category)))
  console.log()
  const breached = rows.filter((row) => row.breachedSla).length
  console.log(
    `  ${style.bold('SLA breached')} ${style.red(String(breached))} of ${rows.length}` +
      style.dim(` (${((breached / (rows.length || 1)) * 100).toFixed(1)}%)`),
  )
}

function renderBuildings(rows: Array<Building>) {
  console.log(style.bold('  by archetype'))
  console.log(distribution(countBy(rows, (row) => row.archetype)))
  console.log()
  console.log(
    series(
      'uValue',
      rows.map((r) => r.uValue),
      { places: 2 },
    ),
  )
  console.log(
    series(
      'built',
      rows.map((r) => r.yearBuilt),
      {
        places: 0,
        colour: style.green,
      },
    ),
  )
}

export const inspect = defineCommand({
  meta: {
    name: 'inspect',
    description: 'Render a dataset in the terminal — sparklines and stats',
  },
  args: {
    dataset: {
      type: 'positional',
      default: 'readings',
      description: 'readings | risk | work-orders | units | buildings',
    },
    unit: { type: 'string', description: 'Unit ids, comma separated' },
    building: { type: 'string', description: 'Building ids, comma separated' },
    site: { type: 'string', description: 'Site ids, comma separated' },
    room: {
      type: 'string',
      description: 'living | bedroom | bathroom | kitchen',
    },
    from: { type: 'string', description: 'ISO date, inclusive' },
    to: { type: 'string', description: 'ISO date, exclusive' },
    resolution: { type: 'string', default: '1h', description: '15m | 1h | 1d' },
    limit: { type: 'string', description: 'Cap rows returned' },
    seed: { type: 'string', description: `Defaults to "${SEED}"` },
    json: { type: 'boolean', default: false, description: 'Emit raw JSON' },
    out: {
      type: 'string',
      description: 'Write the result to a file, creating parent dirs',
    },
    format: {
      type: 'string',
      default: 'json',
      description: 'Format for --out: json | ts',
    },
    export: {
      type: 'string',
      description: 'Named export for --format ts (default: <dataset>Fixture)',
    },
    pretty: {
      type: 'boolean',
      default: false,
      description: 'Indent the output written by --out',
    },
  },
  run({ args }) {
    const query = {
      dataset: args.dataset,
      units: toList(args.unit),
      buildings: toList(args.building),
      sites: toList(args.site),
      rooms: toList(args.room),
      from: args.from,
      to: args.to,
      resolution: args.resolution,
      limit: args.limit ? Number(args.limit) : undefined,
      seed: args.seed,
    } as Query

    const result = queryDataset(query)

    if (args.format !== 'json' && args.format !== 'ts') {
      console.error(`--format must be json or ts, got "${args.format}"`)
      process.exitCode = 1
      return
    }

    const nameError = args.export ? validateExportName(args.export) : null
    if (nameError) {
      console.error(`--export ${args.export}: ${nameError}`)
      process.exitCode = 1
      return
    }

    // Confirmation goes to stderr so `--out` can ride along with a piped
    // `--json` without corrupting the stream.
    const written = args.out
      ? writeResult(result, args.out, {
          format: args.format,
          exportName: args.export,
          pretty: args.pretty,
        })
      : undefined
    if (written) {
      console.error(
        `${style.green('wrote')} ${written.path} ` +
          style.dim(
            `· ${result.meta.count.toLocaleString()} rows · ${formatBytes(written.bytes)}`,
          ),
      )
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
      return
    }

    const { meta } = result
    console.log()
    console.log(
      `${style.bold(meta.dataset)} ${style.dim('·')} ${meta.from} → ${meta.to} ` +
        style.dim(`· ${meta.resolution} · seed ${meta.seed}`),
    )
    console.log(
      style.dim(
        `${meta.count.toLocaleString()} rows` +
          (meta.generated === meta.count
            ? ''
            : ` (from ${meta.generated.toLocaleString()})`) +
          ` in ${meta.elapsedMs}ms`,
      ),
    )
    console.log()

    switch (meta.dataset) {
      case 'readings':
        renderReadings(result.rows as Array<Reading>)
        break
      case 'risk':
        renderRisk(result.rows as Array<RiskDay>)
        break
      case 'work-orders':
        renderWorkOrders(result.rows as Array<WorkOrder>)
        break
      case 'buildings':
        renderBuildings(result.rows as Array<Building>)
        break
      case 'units':
        console.log(
          distribution(
            countBy(result.rows, (row) => ('tenure' in row ? row.tenure : '?')),
          ),
        )
        break
    }

    renderEpisodes(query, meta.seed)
    console.log()
  },
})
