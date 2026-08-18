import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { fixtureStore } from './store'
import type { FixtureStore } from './store'

/**
 * The store holds files a human is expected to open, edit and commit, so the
 * only failures worth testing are the ones that lose or misplace one.
 */

let store: FixtureStore

beforeEach(async () => {
  store = fixtureStore(await mkdtemp(path.join(tmpdir(), 'mocker-store-')))
})

describe('reading', () => {
  it('reports a file that is not there as absent, not as an error', async () => {
    // The caller generates on `null`; a throw here would turn a first run into a
    // broken test rather than a written fixture.
    expect(await store.read('GET/api/devices/3f9a1c2d.json')).toBeNull()
  })

  it('gives back exactly what is on disk', async () => {
    await store.write('GET/api/devices/a.json', '{\n  "a": 1\n}\n')

    expect(await store.read('GET/api/devices/a.json')).toBe('{\n  "a": 1\n}\n')
  })
})

describe('writing', () => {
  it('creates the directories a mirrored path implies', async () => {
    await store.write('GET/api/property/ABC123/f00d.json', '{}')

    expect(
      await readFile(
        path.join(store.root, 'GET/api/property/ABC123/f00d.json'),
        'utf8',
      ),
    ).toBe('{}')
  })

  it('replaces a file whole rather than over the top of it', async () => {
    // Two workers missing the same fixture write identical bytes — generation is
    // deterministic — but interleaved writes can truncate. A temp file and a
    // rename make the last writer win with content the first would have written.
    await store.write('GET/api/devices/a.json', 'a'.repeat(5000))
    await store.write('GET/api/devices/a.json', 'b')

    expect(await store.read('GET/api/devices/a.json')).toBe('b')
  })

  it('leaves no temporary files behind', async () => {
    await store.write('GET/api/devices/a.json', '{}')

    const entries = await readdir(path.join(store.root, 'GET/api/devices'))

    expect(entries).toEqual(['a.json'])
  })
})

describe('the store edges', () => {
  it('refuses a name that would escape it', async () => {
    // `fixturePath` percent-encodes every segment, so it cannot produce one of
    // these. Asserted anyway: the guarantee should hold by construction, not by
    // the good behaviour of whichever module calls this today.
    expect(() => store.file('../../etc/passwd')).toThrow(/escapes/)
    await expect(store.write('../escape.json', '{}')).rejects.toThrow(/escapes/)
  })

  it('names the file a message has to quote', async () => {
    expect(store.file('GET/api/devices/a.json')).toBe(
      path.join(store.root, 'GET/api/devices/a.json'),
    )
  })

  it('treats an unreadable file as absent', async () => {
    // A directory where a file should be: the caller generates, and a genuine
    // permissions problem surfaces on the write, where there is something to say.
    const target = path.join(store.root, 'GET')
    await writeFile(target, 'not a directory', 'utf8')

    expect(await store.read('GET/api/devices/a.json')).toBeNull()
  })
})
