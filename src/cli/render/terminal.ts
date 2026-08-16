/**
 * Terminal rendering for `inspect`.
 *
 * The tuning loop for a physics simulation is: change a constant, look at the
 * shape, repeat. That loop is only tight if the shape shows up in the terminal
 * — a browser round-trip per tweak is what makes simulated data go unexamined.
 */

const BARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'] as const

const useColour = process.env.NO_COLOR === undefined && process.stdout.isTTY

function wrap(code: string) {
  return (text: string): string => (useColour ? `[${code}m${text}[0m` : text)
}

export const style = {
  dim: wrap('2'),
  bold: wrap('1'),
  cyan: wrap('36'),
  green: wrap('32'),
  yellow: wrap('33'),
  red: wrap('31'),
  magenta: wrap('35'),
}

export interface Stats {
  min: number
  max: number
  mean: number
  p50: number
  p95: number
  count: number
}

export function stats(values: Array<number>): Stats {
  if (values.length === 0) {
    return { min: 0, max: 0, mean: 0, p50: 0, p95: 0, count: 0 }
  }
  const sorted = [...values].sort((a, b) => a - b)
  const at = (q: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: values.reduce((sum, v) => sum + v, 0) / values.length,
    p50: at(0.5),
    p95: at(0.95),
    count: values.length,
  }
}

/** Downsample to `width` buckets by mean, then map to block characters. */
export function sparkline(values: Array<number>, width = 48): string {
  if (values.length === 0) return ''
  const buckets: Array<number> = []
  const size = values.length / width

  for (let i = 0; i < width; i++) {
    const start = Math.floor(i * size)
    const end = Math.max(start + 1, Math.floor((i + 1) * size))
    let sum = 0
    for (let j = start; j < end && j < values.length; j++) sum += values[j]
    buckets.push(sum / (end - start))
  }

  const min = Math.min(...buckets)
  const max = Math.max(...buckets)
  const span = max - min || 1

  return buckets
    .map((value) => {
      const index = Math.min(
        BARS.length - 1,
        Math.floor(((value - min) / span) * BARS.length),
      )
      return BARS[index]
    })
    .join('')
}

function fixed(value: number, places: number): string {
  return value.toFixed(places).padStart(6)
}

/** One labelled series: sparkline plus the numbers that sparklines hide. */
export function series(
  label: string,
  values: Array<number>,
  options: { places?: number; colour?: (text: string) => string } = {},
): string {
  const places = options.places ?? 1
  const colour = options.colour ?? style.cyan
  const s = stats(values)
  return [
    style.bold(label.padEnd(9)),
    colour(sparkline(values)),
    style.dim('  min'),
    fixed(s.min, places),
    style.dim('  max'),
    fixed(s.max, places),
    style.dim('  mean'),
    fixed(s.mean, places),
    style.dim('  p95'),
    fixed(s.p95, places),
  ].join(' ')
}

/** Horizontal bar for a categorical distribution. */
export function distribution(
  entries: Array<[string, number]>,
  options: { colour?: (label: string) => (text: string) => string } = {},
): string {
  const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1
  const width = Math.max(...entries.map(([label]) => label.length))
  return entries
    .map(([label, count]) => {
      const share = count / total
      const filled = Math.round(share * 32)
      const colour = options.colour?.(label) ?? style.cyan
      return [
        style.bold(label.padEnd(width)),
        colour('█'.repeat(filled) + style.dim('·'.repeat(32 - filled))),
        String(count).padStart(6),
        style.dim(`${(share * 100).toFixed(1)}%`.padStart(7)),
      ].join(' ')
    })
    .join('\n')
}

export const bandColour = (band: string) =>
  band === 'critical'
    ? style.red
    : band === 'high'
      ? style.yellow
      : band === 'medium'
        ? style.magenta
        : style.green
