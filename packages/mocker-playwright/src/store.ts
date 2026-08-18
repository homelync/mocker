import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * The fixture store: a directory of JSON, read and written in this process.
 *
 * The whole of what the Storybook adapter needs a Vite plugin, an HTTP route and
 * a shared constant for. A Storybook preview is a browser and has no filesystem,
 * so its store has to live on the dev server and be reached over a port;
 * Playwright is node from top to bottom, so this is `readFile` and `rename`.
 *
 * Deliberately dumb, in the same way that plugin is: it does not know what a
 * registry is, what zod is, or what a fixture contains. It reads bytes at a name
 * and writes bytes at a name, and the policy about what those bytes mean lives
 * in `fixed.ts`.
 */

/** A directory of fixtures, addressed by the names `fixturePath` produces. */
export interface FixtureStore {
  /** Absolute path to the directory itself. */
  readonly root: string
  /** Where a name lands on disk, for a message that has to name the file. */
  file(name: string): string
  /** The file's contents, or `null` if there is no such file. */
  read(name: string): Promise<string | null>
  /** Write the file, creating directories as needed. */
  write(name: string, body: string): Promise<void>
}

/**
 * Two workers that both miss the same fixture generate identical bytes —
 * generation is deterministic — but two interleaved writes can still truncate
 * the file. Writing to a temp name in the same directory and renaming makes the
 * last writer win with content the first would have written too, and needs no
 * lock. `rename` is atomic within a filesystem, which a sibling path guarantees.
 */
function temporaryName(file: string): string {
  const unique = `${String(process.pid)}.${Math.random().toString(36).slice(2)}`
  return `${file}.${unique}.tmp`
}

/**
 * A store rooted at a directory.
 *
 * @param root absolute path to the fixture directory; created on first write
 */
export function fixtureStore(root: string): FixtureStore {
  /**
   * `fixturePath` percent-encodes every segment, so a name it produced cannot
   * contain a traversal to begin with. Checked anyway: the guarantee "nothing
   * this store touches is outside its root" should hold by construction rather
   * than by the good behaviour of the module that happens to call it today.
   */
  const file = (name: string): string => {
    const resolved = path.resolve(root, name)
    if (!resolved.startsWith(`${root}${path.sep}`)) {
      throw new Error(`Fixture name "${name}" escapes the fixture store.`)
    }
    return resolved
  }

  return {
    root,
    file,

    async read(name) {
      try {
        return await readFile(file(name), 'utf8')
      } catch {
        // Any failure to read is a miss: the caller will generate, and a genuine
        // permissions problem surfaces on the write, where there is something to
        // say about it.
        return null
      }
    },

    async write(name, body) {
      const target = file(name)
      await mkdir(path.dirname(target), { recursive: true })

      const temporary = temporaryName(target)
      await writeFile(temporary, body, 'utf8')
      await rename(temporary, target)
    },
  }
}
