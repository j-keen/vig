import { spawn } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const mode = process.argv[2]
if (mode !== 'unit' && mode !== 'e2e') {
  console.error('Usage: node scripts/run-ava.mjs <unit|e2e>')
  process.exit(2)
}

const root = fileURLToPath(new URL('..', import.meta.url))
const files = await collectTestFiles(join(root, 'app'))
const classified = { unit: [], e2e: [] }

for (const file of files) {
  const source = await readFile(file, 'utf8')
  const e2e = /\bpuppeteer\b/.test(source) || /\bsetupPptrTab\b/.test(source)
  classified[e2e ? 'e2e' : 'unit'].push(toPosix(relative(root, file)))
}

const selected = classified[mode]
console.log(
  `Classified ${files.length} test file(s): ${classified.unit.length} unit, ${classified.e2e.length} e2e`
)

if (selected.length === 0) {
  console.log(`No ${mode} tests found; skipping.`)
  process.exit(0)
}

const require = createRequire(import.meta.url)
const avaCli = require.resolve('ava/cli.js')
const extra = mode === 'e2e' ? ['--timeout=2m', '--verbose', '--serial', '--concurrency=1'] : []
const child = spawn(process.execPath, [avaCli, ...extra, ...selected], {
  cwd: root,
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1)
  }
  process.exit(code ?? 1)
})

async function collectTestFiles(dir, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === 'node_modules') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      await collectTestFiles(full, acc)
    } else if (entry.name.endsWith('.test.js')) {
      acc.push(full)
    }
  }
  return acc
}

function toPosix(file) {
  return file.split('\\').join('/')
}
