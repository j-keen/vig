import test from 'ava'
import puppeteer from 'puppeteer'

import { setupPptrTab, teardownPptrTab, changeMode }
from '../../tests/helpers'

test.beforeEach(async t => {
  await setupPptrTab(t)
})

test.afterEach.always(async t => {
  await teardownPptrTab(t)
})

test.serial('Text toolbar: shows on text selection, bold toggles fontWeight, Ctrl+Z restores; page palette returns hex colors', async t => {
  const { page } = t.context

  await page.evaluate(() => window.ChangeTracker.clearAll())

  await changeMode({ tool: 'text', page })

  await page.evaluate(() => {
    const el = document.createElement('p')
    el.id = 'toolbar-target'
    el.textContent = 'Toolbar target text'
    el.style.cssText = 'position:fixed;left:260px;top:220px;font-size:18px;font-weight:400;z-index:1;background:#fff;'
    document.body.appendChild(el)
  })

  await page.click('#toolbar-target')
  await page.waitForTimeout(250)

  const contenteditable = await page.evaluate(() =>
    document.getElementById('toolbar-target').getAttribute('contenteditable'))
  t.is(contenteditable, 'true', 'selecting the element under the text tool should enter edit mode')

  const toolbarState = await page.evaluate(() => {
    const tb = document.querySelector('visbug-text-toolbar')
    if (!tb) return { exists: false }
    return {
      exists: true,
      display: tb.style.display,
      hasBoldButton: !!(tb.$shadow && tb.$shadow.querySelector('[data-action="bold"]')),
    }
  })

  t.true(toolbarState.exists, 'visbug-text-toolbar should exist in the document')
  t.is(toolbarState.display, 'block', 'visbug-text-toolbar should be visible')
  t.true(toolbarState.hasBoldButton, 'toolbar should render its bold button')

  const boldBtnPoint = await page.evaluate(() => {
    const tb = document.querySelector('visbug-text-toolbar')
    const btn = tb.$shadow.querySelector('[data-action="bold"]')
    const r = btn.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })

  await page.mouse.click(boldBtnPoint.x, boldBtnPoint.y)
  await page.waitForTimeout(200)

  const afterBold = await page.evaluate(() => {
    const el = document.getElementById('toolbar-target')
    const fontWeight = window.getComputedStyle(el).fontWeight
    const changes = window.ChangeTracker.getAllChanges()
    let tracked = null
    for (const [element, change] of changes) {
      if (element === el) tracked = change
    }
    return { fontWeight, hasWeightChange: !!(tracked && tracked.fontWeight) }
  })

  t.is(afterBold.fontWeight, '700', 'clicking bold should set computed fontWeight to 700')
  t.true(afterBold.hasWeightChange, 'ChangeTracker.getAllChanges() should include the fontWeight change')

  await page.keyboard.down('Control')
  await page.keyboard.press('KeyZ')
  await page.keyboard.up('Control')
  await page.waitForTimeout(200)

  const afterUndo = await page.evaluate(() =>
    window.getComputedStyle(document.getElementById('toolbar-target')).fontWeight)

  t.is(afterUndo, '400', 'Ctrl+Z should restore the original (non-bold) fontWeight')

  const colors = await page.evaluate(() => window.DesignPokePalette.collectPageColors())

  t.true(Array.isArray(colors) && colors.length > 0, 'collectPageColors() should return a non-empty array')
  t.true(colors.every(c => /^#[0-9a-f]{6,8}$/i.test(c)), 'collectPageColors() should return hex strings')
})
