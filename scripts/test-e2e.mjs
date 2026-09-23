import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import http from 'node:http'
import net from 'node:net'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const preferred = Number(process.env.E2E_PORT || 3300)
const port = await pickPort(Number.isFinite(preferred) ? preferred : 3300)
console.log(`Using E2E_PORT=${port}`)

const require = createRequire(import.meta.url)
const browserSyncBin = require.resolve('browser-sync/dist/bin.js')
const runAva = fileURLToPath(new URL('./run-ava.mjs', import.meta.url))
const childEnv = { ...process.env, E2E_PORT: String(port) }

const server = spawn(
  process.execPath,
  [
    browserSyncBin,
    'start',
    '--server',
    'app',
    '--port',
    String(port),
    '--files',
    'app/index.html,app/bundle.css,app/bundle.js',
    '--no-open',
    '--no-notify',
    '--no-ui',
    '--no-ghost-mode',
  ],
  { cwd: root, stdio: 'inherit', env: childEnv }
)

let stopping = false
const stopServer = () => {
  if (stopping) return
  stopping = true
  if (!server.pid) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    server.kill('SIGTERM')
  }
}

process.on('SIGINT', () => {
  stopServer()
  process.exit(130)
})
process.on('SIGTERM', () => {
  stopServer()
  process.exit(143)
})

try {
  await waitHttp(`http://127.0.0.1:${port}`)
} catch (err) {
  stopServer()
  console.error(err.message)
  process.exit(1)
}

const tests = spawn(process.execPath, [runAva, 'e2e'], {
  cwd: root,
  stdio: 'inherit',
  env: childEnv,
})

tests.on('exit', (code, signal) => {
  stopServer()
  if (signal) process.exit(1)
  process.exit(code ?? 1)
})

function portFree(portToCheck) {
  return new Promise((resolve) => {
    const listener = net.createServer()
    listener.once('error', () => resolve(false))
    listener.once('listening', () => {
      listener.close(() => resolve(true))
    })
    listener.listen(portToCheck, '127.0.0.1')
  })
}

async function pickPort(start) {
  for (let candidate = start; candidate < start + 50; candidate++) {
    if (await portFree(candidate)) return candidate
  }
  throw new Error(`No free TCP port in ${start}-${start + 49}`)
}

function waitHttp(url, timeoutMs = 60_000) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume()
        if (res.statusCode && res.statusCode < 500) resolve()
        else retry()
      })
      req.on('error', retry)
      req.setTimeout(2000, () => {
        req.destroy()
        retry()
      })
    }
    const retry = () => {
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`))
        return
      }
      setTimeout(attempt, 250)
    }
    attempt()
  })
}
