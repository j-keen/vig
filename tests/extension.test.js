import test from 'ava'
import puppeteer from 'puppeteer'
import http from 'http'
import path from 'path'
import { execFileSync } from 'child_process'

// Manual fallback (chrome://extensions → Developer mode → Load unpacked → extension/):
// 1. Open any http(s) page.
// 2. Click the DesignPoke toolbar icon (or Ctrl+Shift+D). vis-bug should appear once.
// 3. Press Esc with nothing selected (or run document.querySelector('vis-bug').remove() in the console).
// 4. Click the icon once more: vis-bug should reappear without a second click.
// 5. Click the icon again: vis-bug should animate out and disappear.

const EXTENSION_PATH = path.resolve(process.cwd(), '.tmp', 'extension-test')

execFileSync(process.execPath, ['scripts/prepare-extension-test.mjs'], {
  cwd: process.cwd(),
  stdio: 'inherit',
})
const HARNESS_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>DesignPoke extension harness</title>
</head>
<body>
  <h1>DesignPoke harness</h1>
  <p id="probe">ok</p>
</body>
</html>`

const MANUAL_STEPS = [
  'chrome://extensions → Developer mode ON → Load unpacked → select the extension/ folder',
  'Open an http(s) page (not chrome://)',
  'Click the DesignPoke icon once: <vis-bug> appears',
  'In DevTools: document.querySelector("vis-bug").remove()  (Esc with no selection)',
  'Click the icon once: <vis-bug> reappears',
  'Click the icon again: <vis-bug> disappears',
].join('\n')

const startHarness = () => new Promise((resolve, reject) => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(HARNESS_HTML)
  })
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address()
    resolve({ server, url: `http://127.0.0.1:${port}/` })
  })
  server.on('error', reject)
})

const stopHarness = (server) => new Promise((resolve) => {
  if (!server) return resolve()
  server.close(() => resolve())
})

const launchBrowser = async () => {
  const args = [
    `--disable-extensions-except=${EXTENSION_PATH}`,
    `--load-extension=${EXTENSION_PATH}`,
    '--disable-features=DisableLoadExtensionCommandLineSwitch,ExtensionDisableUnsupportedDeveloper',
    '--enable-unsafe-extension-debugging',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu',
  ]

  // Puppeteer 10 has no headless: 'new'. Headful is required for extensions
  // on this Chromium; ignoreDefaultArgs must drop --disable-extensions.
  return puppeteer.launch({
    headless: false,
    timeout: 40000,
    ignoreDefaultArgs: ['--disable-extensions'],
    args,
  })
}

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])

const findServiceWorkerTarget = async (browser, timeout = 20000) => {
  const match = (target) =>
    target.type() === 'service_worker' && /visbug\.js/.test(target.url())

  const started = Date.now()
  while (Date.now() - started < timeout) {
    const existing = browser.targets().find(match)
    if (existing) return existing
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error('service_worker target not found')
}

const swEvaluate = async (session, expression, awaitPromise = true) => {
  const { result, exceptionDetails } = await session.send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
  })
  if (exceptionDetails) {
    const message =
      (exceptionDetails.exception && exceptionDetails.exception.description) ||
      exceptionDetails.text ||
      JSON.stringify(exceptionDetails)
    throw new Error(message)
  }
  return result ? result.value : undefined
}

const attachServiceWorker = async (browser) => {
  const target = await findServiceWorkerTarget(browser)
  // Module SW is advertised before it can accept Runtime.evaluate.
  await new Promise((resolve) => setTimeout(resolve, 1500))

  let lastError = new Error('failed to attach to service worker')
  for (let attempt = 0; attempt < 4; attempt++) {
    let session
    try {
      session = await withTimeout(
        target.createCDPSession(),
        8000,
        'createCDPSession(service_worker)'
      )
      await withTimeout(session.send('Runtime.enable'), 5000, 'Runtime.enable')
      const snapshot = await withTimeout(
        swEvaluate(session, `({
          href: self.location && self.location.href,
          hasChrome: typeof chrome !== 'undefined',
          hasScripting: typeof chrome !== 'undefined' && !!chrome.scripting,
          toggleType: typeof globalThis.__designpokeToggle,
        })`, false),
        5000,
        'swEvaluate(probe)'
      )
      console.log('[extension.test] SW probe', snapshot)
      if (snapshot && snapshot.toggleType === 'function') {
        return { target, session, url: target.url() }
      }
      lastError = new Error(`__designpokeToggle not ready: ${JSON.stringify(snapshot)}`)
    } catch (err) {
      lastError = err
      console.log('[extension.test] attach attempt failed', err.message)
    }
    await new Promise((resolve) => setTimeout(resolve, 750))
  }
  throw lastError
}

const toggleFromServiceWorker = async (session) => {
  return swEvaluate(session, `(async () => {
    if (typeof globalThis.__designpokeToggle !== 'function') {
      throw new Error('globalThis.__designpokeToggle is not exposed')
    }
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const tab = tabs[0]
    if (!tab || tab.id == null) throw new Error('chrome.tabs.query returned no active tab')
    return globalThis.__designpokeToggle({ id: tab.id, url: tab.url })
  })()`)
}

const countVisBug = (page) =>
  page.evaluate(() => document.querySelectorAll('vis-bug').length)

const countMarkedScripts = (page) =>
  page.evaluate(() => document.querySelectorAll('script[data-designpoke]').length)

test.serial('toolbar toggle follows the live page, not SW memory', async (t) => {
  t.timeout(90000)
  let server
  let browser
  try {
    const harness = await startHarness()
    server = harness.server
    console.log('[extension.test] harness', harness.url)
    console.log('[extension.test] extension path', EXTENSION_PATH)

    try {
      console.log('[extension.test] launching chromium')
      browser = await launchBrowser()
      console.log('[extension.test] launched')
    } catch (err) {
      t.fail(`Failed to launch Chromium with --load-extension.\n${err.message}\n\nManual steps:\n${MANUAL_STEPS}`)
      return
    }

    const pages = await browser.pages()
    const page = pages[0] || await browser.newPage()
    console.log('[extension.test] goto', harness.url)
    await page.goto(harness.url, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.bringToFront()
    console.log('[extension.test] page ready, targets', browser.targets().map((target) => target.type()).join(','))

    let session
    try {
      const attached = await attachServiceWorker(browser)
      session = attached.session
      console.log('[extension.test] service worker', attached.url)
    } catch (err) {
      const types = browser.targets().map((target) => `${target.type()}:${target.url()}`)
      t.fail(
        `Could not attach to the DesignPoke service worker.\n${err.message}\nTargets:\n${types.join('\n')}\n\nManual steps:\n${MANUAL_STEPS}`
      )
      return
    }

    await toggleFromServiceWorker(session)
    await page.waitForSelector('vis-bug', { timeout: 10000 })
    t.is(await countVisBug(page), 1, 'first toggle injects vis-bug')
    t.is(await countMarkedScripts(page), 1, 'inject.js marks script[data-designpoke]')
    console.log('[extension.test] after first toggle: vis-bug present')

    await page.evaluate(() => {
      const node = document.querySelector('vis-bug')
      if (node) node.remove()
    })
    t.is(await countVisBug(page), 0, 'page-side remove (Esc) drops vis-bug')
    t.is(await countMarkedScripts(page), 1, 'script marker survives vis-bug removal')
    console.log('[extension.test] vis-bug removed in page; script marker remains')

    await toggleFromServiceWorker(session)
    await page.waitForSelector('vis-bug', { timeout: 10000 })
    t.is(await countVisBug(page), 1, 'second toggle restores vis-bug in one shot')
    console.log('[extension.test] after restore toggle: vis-bug present')

    await toggleFromServiceWorker(session)
    await page.waitForFunction(() => !document.querySelector('vis-bug'), { timeout: 5000 })
    t.is(await countVisBug(page), 0, 'third toggle ejects vis-bug')
    console.log('[extension.test] after eject toggle: vis-bug gone')

    const clip = await page.evaluate(() => ({
      protocol: location.protocol,
      host: location.host,
      isSecureContext: window.isSecureContext,
      hasClipboard: !!(navigator.clipboard && navigator.clipboard.write),
      hasClipboardItem: typeof ClipboardItem !== 'undefined',
    }))
    console.log('[extension.test] clipboard probe on harness (localhost http)', clip)
    t.true(clip.isSecureContext, 'http://127.0.0.1 is a secure context')
  } finally {
    if (browser) {
      try { await browser.close() } catch (_) {}
    }
    await stopHarness(server)
  }
})
