import test from 'ava'
import puppeteer from 'puppeteer'

const PORT = Number(process.env.E2E_PORT || 3300)

const setupPptrTab = async t => {
  t.context.browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  t.context.page = await t.context.browser.newPage()
  await t.context.page.goto(`http://localhost:${PORT}`)
  await t.context.page.evaluateHandle(`document.body.setAttribute('testing', true)`)
  await t.context.page.waitForSelector('vis-bug', { timeout: 10000 })
}

const teardownPptrTab = async ({ context: { page, browser } }) => {
  if (page) await page.close()
  if (browser) await browser.close()
}

test.beforeEach(async t => {
  await setupPptrTab(t)
})

test.afterEach.always(async t => {
  await teardownPptrTab(t)
})

test.serial('Text edit: dblclick types, blur records ChangeTracker text, formatAllForAI has - 텍스트:, Ctrl+Z restores', async t => {
  const { page } = t.context

  await page.evaluate(() => {
    window.ChangeTracker.clearAll()
    const el = document.createElement('p')
    el.id = 'text-edit-target'
    el.textContent = 'Original label'
    el.style.cssText = 'position:fixed;left:280px;top:180px;font-size:22px;z-index:1;background:#fff;'
    document.body.appendChild(el)
  })

  const rect = await page.evaluate(() => {
    const el = document.getElementById('text-edit-target')
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })

  await page.mouse.click(rect.x, rect.y, { clickCount: 2 })
  await page.waitForTimeout(300)

  const editable = await page.evaluate(() =>
    document.getElementById('text-edit-target').getAttribute('contenteditable'))
  t.is(editable, 'true', 'dblclick should enter the text tool and make the node contenteditable')

  await page.keyboard.type(' NEW')
  await page.evaluate(() => document.getElementById('text-edit-target').blur())
  await page.waitForTimeout(200)

  const afterEdit = await page.evaluate(() => {
    const el = document.getElementById('text-edit-target')
    const changes = window.ChangeTracker.getChanges(el)
    const formatted = window.AIFormatter.formatAllForAI()
    return {
      text: el.textContent,
      hasText: !!(changes && changes._text),
      original: changes && changes._text && changes._text.original,
      current: changes && changes._text && changes._text.current,
      formatted,
    }
  })

  console.log('[text-edit e2e] after edit', afterEdit)
  t.true(afterEdit.hasText, 'getAllChanges/getChanges should include _text')
  t.is(afterEdit.original, 'Original label')
  t.true(afterEdit.current.includes('NEW'))
  t.true(afterEdit.formatted.includes('- 텍스트:'), 'formatAllForAI should include a - 텍스트: line')

  await page.keyboard.down('Control')
  await page.keyboard.press('KeyZ')
  await page.keyboard.up('Control')
  await page.waitForTimeout(200)

  const afterUndo = await page.evaluate(() => document.getElementById('text-edit-target').textContent)
  console.log('[text-edit e2e] after Ctrl+Z', afterUndo)
  t.is(afterUndo, 'Original label', 'Ctrl+Z should restore the original text')
})
