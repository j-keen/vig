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

// Selects `#toolbar-target` under the text tool (enters edit mode, which
// also shows the mini toolbar - see text.js's EditText) and returns the
// bounding rect of a control found by `selector` inside the toolbar's
// closed shadow root.
const selectTargetAndGetControlRect = async (page, selector) => {
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

  return page.evaluate(sel => {
    const tb = document.querySelector('visbug-text-toolbar')
    const el = tb.$shadow.querySelector(sel)
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, left: r.left, top: r.top, width: r.width, height: r.height }
  }, selector)
}

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

test.serial('Text toolbar: dragging the font-size slider live-previews and commits exactly one undo entry on mouseup', async t => {
  const { page } = t.context

  await page.evaluate(() => window.ChangeTracker.clearAll())

  const rect = await selectTargetAndGetControlRect(page, '.size-range')

  const before = await page.evaluate(() => ({
    fontSize: window.getComputedStyle(document.getElementById('toolbar-target')).fontSize,
    snapshotLength: window.ChangeTracker.getUndoStackSnapshot().length,
  }))

  // drag from near the low end of the track to ~70% across it
  await page.mouse.move(rect.left + rect.width * 0.05, rect.top + rect.height / 2)
  await page.mouse.down()
  await page.mouse.move(rect.left + rect.width * 0.7, rect.top + rect.height / 2, { steps: 6 })

  const whileDragging = await page.evaluate(() =>
    window.getComputedStyle(document.getElementById('toolbar-target')).fontSize)

  t.not(whileDragging, before.fontSize, 'fontSize should change live while the mouse is still down')

  const snapshotWhileDragging = await page.evaluate(() => window.ChangeTracker.getUndoStackSnapshot().length)
  t.is(snapshotWhileDragging, before.snapshotLength, 'no undo entry should be pushed yet while still dragging')

  await page.mouse.up()
  await page.waitForTimeout(150)

  const after = await page.evaluate(() => ({
    fontSize: window.getComputedStyle(document.getElementById('toolbar-target')).fontSize,
    snapshotLength: window.ChangeTracker.getUndoStackSnapshot().length,
  }))

  t.is(after.snapshotLength, before.snapshotLength + 1, 'exactly one new undo entry should exist after mouseup')
  t.not(after.fontSize, before.fontSize, 'fontSize should remain changed after commit')
})

test.serial('Text toolbar: hovering the size slider shows the prop hint, leaving clears it', async t => {
  const { page } = t.context

  const rect = await selectTargetAndGetControlRect(page, '.size-range')

  await page.mouse.move(rect.x, rect.y)
  await page.waitForTimeout(150)

  const whileHovering = await page.evaluate(() => {
    const hint = document.querySelector('visbug-prop-hint')
    return hint ? hint.innerHTML.trim().length : 0
  })

  t.true(whileHovering > 0, 'visbug-prop-hint should have content while hovering the size slider')

  await page.mouse.move(5, 5)
  await page.waitForTimeout(300)

  const afterLeaving = await page.evaluate(() => {
    const hint = document.querySelector('visbug-prop-hint')
    return hint ? hint.innerHTML.trim().length : 0
  })

  t.is(afterLeaving, 0, 'visbug-prop-hint should be cleared after the mouse leaves')
})

test.serial('Text toolbar: Escape during a live size edit restores the previous computed fontSize', async t => {
  const { page } = t.context

  const rect = await selectTargetAndGetControlRect(page, '.size-range')

  const before = await page.evaluate(() =>
    window.getComputedStyle(document.getElementById('toolbar-target')).fontSize)

  await page.mouse.move(rect.left + rect.width * 0.05, rect.top + rect.height / 2)
  await page.mouse.down()
  await page.mouse.move(rect.left + rect.width * 0.8, rect.top + rect.height / 2, { steps: 6 })

  const whileDragging = await page.evaluate(() =>
    window.getComputedStyle(document.getElementById('toolbar-target')).fontSize)
  t.not(whileDragging, before, 'fontSize should have changed live before Escape')

  await page.keyboard.press('Escape')
  await page.waitForTimeout(100)

  const afterEscape = await page.evaluate(() =>
    window.getComputedStyle(document.getElementById('toolbar-target')).fontSize)
  t.is(afterEscape, before, 'Escape should revert the live preview back to the previous computed fontSize')

  await page.mouse.up()
  await page.waitForTimeout(100)

  const afterMouseUp = await page.evaluate(() =>
    window.getComputedStyle(document.getElementById('toolbar-target')).fontSize)
  t.is(afterMouseUp, before, 'releasing the mouse after Escape should not re-apply the cancelled drag')
})
