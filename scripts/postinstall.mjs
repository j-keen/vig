import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

patchEsmForNode24()
ensurePuppeteerChrome()

function patchEsmForNode24() {
  let esmPath
  try {
    esmPath = require.resolve('esm')
  } catch {
    return
  }

  const current = readFileSync(esmPath, 'utf8')
  if (current.includes('ESM_NOOP_FOR_NODE24')) return

  writeFileSync(
    esmPath,
    [
      '// ESM_NOOP_FOR_NODE24',
      '// ava@1.4.1 preloads `esm`, which crashes on Node 24+',
      '// (`Function.prototype.apply was called on undefined`). AVA still Babel-compiles',
      '// the ESM test files, so a no-op preload is enough.',
      'module.exports = function esmNoop() { return require }',
      '',
    ].join('\n'),
    'utf8'
  )
  console.log(`Patched ${esmPath} with a Node 24-safe no-op`)
}

function ensurePuppeteerChrome() {
  let puppeteer
  try {
    puppeteer = require('puppeteer')
  } catch (err) {
    console.warn(`puppeteer not installed, skip Chrome download: ${err.message}`)
    return
  }

  const executablePath = puppeteer.executablePath()
  if (existsSync(executablePath) && statSync(executablePath).size > 100_000) {
    console.log(`Puppeteer Chrome already present: ${executablePath}`)
    return
  }

  let installPath
  try {
    installPath = require.resolve('puppeteer/install.js')
  } catch (err) {
    console.warn(`puppeteer install.js missing: ${err.message}`)
    return
  }

  console.log('Downloading Puppeteer Chrome via puppeteer/install.js')
  const result = spawnSync(process.execPath, [installPath], { stdio: 'inherit' })
  if (result.status !== 0) {
    console.warn(`puppeteer Chrome download exited ${result.status ?? 'null'}; E2E tests may fail`)
  }
}
