import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const src = join(root, 'extension')
const dest = join(root, '.tmp', 'extension-test')

rmSync(dest, { recursive: true, force: true })
mkdirSync(dirname(dest), { recursive: true })
cpSync(src, dest, { recursive: true })

const manifestPath = join(dest, 'manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
manifest.host_permissions = ['<all_urls>']
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')

console.log(dest)
