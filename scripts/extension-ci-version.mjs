import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const pkgPath = join(root, 'package.json')
const manifestPath = join(root, 'extension', 'manifest.json')

const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
const version = pkg.version
if (!version) {
  throw new Error('package.json is missing version')
}

let raw = await readFile(manifestPath, 'utf8')
const hadPlaceholder = raw.includes('{{NPM_VERSION}}')
raw = raw.replaceAll('{{NPM_VERSION}}', version)

const manifest = JSON.parse(raw)
manifest.version = version

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(
  hadPlaceholder
    ? `Wrote extension/manifest.json version ${version} (replaced {{NPM_VERSION}})`
    : `Wrote extension/manifest.json version ${version}`
)
