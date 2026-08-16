/**
 * Directory suggestions for the wizard's output prompt.
 *
 * Typing a path from memory is the one step of `damp create` that can silently
 * go wrong — a typo writes a fixture into a directory nobody imports from. The
 * tree under `src/` is small enough to enumerate up front, so the prompt can
 * offer it and let fuzzy matching do the typing.
 */

import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { attempt } from 'es-toolkit'

/** Directories that are never a sensible fixture target. */
const IGNORED = new Set(['node_modules'])

/**
 * Deep enough for `src/a/b/c`, which is past anything in this project. The cap
 * is here so a stray symlink cannot turn the prompt into a filesystem walk.
 */
const MAX_DEPTH = 4

function walk(dir: string, depth: number, out: Array<string>): void {
  if (depth > MAX_DEPTH) return

  // A directory we cannot read is one we cannot write to either — skipping it
  // is the same outcome as never having listed it.
  const [error, entries] = attempt(() =>
    readdirSync(dir, { withFileTypes: true }),
  )
  if (error || !entries) return

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith('.') || IGNORED.has(entry.name)) continue
    const path = join(dir, entry.name)
    out.push(path)
    walk(path, depth + 1, out)
  }
}

/** Every directory at or under `root`, as paths relative to the cwd. */
function listDirectories(root = 'src'): Array<string> {
  const found = [root]
  walk(root, 1, found)
  return found
}

/**
 * How well `query` matches `target`, or `-1` when it does not match at all.
 *
 * A subsequence match rather than a substring one, so `slgen` finds
 * `src/lib/gen`. Runs of adjacent characters and matches at a segment boundary
 * score highest, since those are what a person typing an abbreviation means;
 * gaps cost a little, and longer paths break ties towards the shorter one.
 */
function fuzzyScore(query: string, target: string): number {
  const needle = query.toLowerCase()
  const haystack = target.toLowerCase()

  let score = 0
  let from = 0
  let previous = -1

  for (const char of needle) {
    const at = haystack.indexOf(char, from)
    if (at === -1) return -1

    if (at === previous + 1) score += 8
    if (at === 0 || /[/\-_.]/.test(haystack[at - 1] ?? '')) score += 6
    score -= Math.min(at - from, 4)

    previous = at
    from = at + 1
  }

  return score - haystack.length / 10
}

interface DirectoryOption {
  value: string
  label: string
  hint?: string
}

/** Trailing slashes are how people type paths; they are not part of one. */
function normalise(path: string): string {
  return path.trim().replace(/\/+$/, '')
}

/** Ranked worst-to-best is never useful here, so options carry no score. */
function toOption(value: string, fallback: string): DirectoryOption {
  return {
    value,
    label: value,
    hint: value === fallback ? 'default' : undefined,
  }
}

/**
 * A stateful option source for one run of the directory prompt.
 *
 * `fallback` leads the unfiltered list so pressing Enter straight away still
 * writes to the format's default directory, even when that directory does not
 * exist yet. Anything typed that matches nothing is offered last as a new
 * directory, so the fuzzy match keeps the top slot but a path that does not
 * exist yet is still one arrow key away.
 *
 * A bare name is created *inside* the highlighted row — type `comp`, land on
 * `src/components`, type `widgets`, and the new directory offered is
 * `src/components/widgets`. Anything containing a `/` is taken literally
 * instead, which is the way out of the highlighted location.
 */
export function createDirectorySearch(
  fallback: string,
  directories = listDirectories(),
) {
  const candidates = [fallback, ...directories.filter((d) => d !== fallback)]
  const known = new Set(candidates)

  // Where a bare name would be created. Only ever a directory that exists (or
  // the default) — anchoring on a previous suggestion would nest each
  // keystroke inside the last one.
  let anchor = fallback

  // The prompt asks for options on every render, not just on every keystroke,
  // and the focus it reports mid-render is the row it is about to draw. Moving
  // the anchor then would rewrite the suggestion under the cursor, so only a
  // changed input — a real keystroke — is allowed to re-anchor.
  let previousInput: string | undefined

  return (
    input: string,
    focused: string | undefined,
  ): Array<DirectoryOption> => {
    if (input !== previousInput) {
      previousInput = input
      if (focused && known.has(focused)) anchor = focused
    }

    const query = normalise(input)
    if (!query) return candidates.map((value) => toOption(value, fallback))

    const matches = candidates
      .map((value) => ({ value, score: fuzzyScore(query, value) }))
      .filter((match) => match.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map(({ value }) => toOption(value, fallback))

    const anchored = !query.includes('/')
    const created = anchored ? `${anchor}/${query}` : query
    if (known.has(created)) return matches

    return [
      ...matches,
      {
        value: created,
        label: created,
        hint: anchored ? `new — inside ${anchor}` : 'new directory',
      },
    ]
  }
}
