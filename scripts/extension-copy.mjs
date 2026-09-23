import { mkdir, readdir, copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const srcDir = join(root, 'app', 'tuts')
const destDir = join(root, 'extension', 'tuts')

await mkdir(destDir, { recursive: true })

const names = await readdir(srcDir)
const gifs = names.filter((name) => name.toLowerCase().endsWith('.gif'))

if (gifs.length === 0) {
  throw new Error(`No .gif files found in ${srcDir}`)
}

for (const name of gifs) {
  await copyFile(join(srcDir, name), join(destDir, name))
}

console.log(`Copied ${gifs.length} gif(s) to extension/tuts/`)
