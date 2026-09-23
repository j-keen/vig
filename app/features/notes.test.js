import test from 'ava'

import { setupPptrTab, teardownPptrTab } from '../../tests/helpers'

test.beforeEach(async t => {
  await setupPptrTab(t)
})

test.afterEach(teardownPptrTab)

test.serial('Ctrl+K on a selected element opens visbug-note; Enter saves the note into ChangeTracker and formatAllForAI', async t => {
  const { page } = t.context

  await page.evaluate(() => {
    window.ChangeTracker.clearAll()
    const el = document.createElement('div')
    el.id = 'notes-target'
    el.textContent = 'Notes target'
    document.body.appendChild(el)
    document.querySelector('vis-bug').selectorEngine.select(el)
  })
  await page.waitForTimeout(100)

  await page.keyboard.down('Control')
  await page.keyboard.press('KeyK')
  await page.keyboard.up('Control')

  await page.waitForSelector('visbug-note', { timeout: 3000 })

  const visibleAfterOpen = await page.evaluate(() => {
    const el = document.querySelector('visbug-note')
    if (!el) return false
    const rect = el.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  })
  t.true(visibleAfterOpen, 'visbug-note should be visible after Ctrl+K with a selection')

  // Give the requestAnimationFrame focus() a moment to land before typing
  await page.waitForTimeout(150)
  await page.keyboard.type('더 눈에 띄게')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(100)

  const result = await page.evaluate(() => {
    const el = document.getElementById('notes-target')
    return {
      note: window.ChangeTracker.getNote(el),
      formatted: window.AIFormatter.formatAllForAI(),
      noteElGone: !document.querySelector('visbug-note'),
    }
  })

  t.is(result.note, '더 눈에 띄게')
  t.true(result.formatted.includes('- 요청: "더 눈에 띄게"'))
  t.true(result.noteElGone, 'note input should close itself after saving')

  await page.evaluate(() => {
    document.getElementById('notes-target')?.remove()
    window.ChangeTracker.clearAll()
  })
})

test.serial('Ctrl+K with no selection opens a page-level note editor, saved via setPageNote', async t => {
  const { page } = t.context

  await page.evaluate(() => {
    window.ChangeTracker.clearAll()
    document.querySelector('vis-bug').selectorEngine.unselect_all({ silent: true })
  })
  await page.waitForTimeout(100)

  await page.keyboard.down('Control')
  await page.keyboard.press('KeyK')
  await page.keyboard.up('Control')

  await page.waitForSelector('visbug-note', { timeout: 3000 })
  await page.waitForTimeout(150)

  await page.keyboard.type('전체적으로 더 모던하게')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(100)

  const result = await page.evaluate(() => {
    return {
      pageNote: window.ChangeTracker.getPageNote(),
      formatted: window.AIFormatter.formatAllForAI(),
    }
  })

  t.is(result.pageNote, '전체적으로 더 모던하게')
  t.true(result.formatted.includes('## 요청'))
  t.true(result.formatted.includes('전체적으로 더 모던하게'))

  await page.evaluate(() => window.ChangeTracker.clearAll())
})

test.serial('Escape cancels the note without saving, and keydown does not leak to page hotkeys', async t => {
  const { page } = t.context

  await page.evaluate(() => {
    window.ChangeTracker.clearAll()
    const el = document.createElement('div')
    el.id = 'notes-cancel-target'
    document.body.appendChild(el)
    document.querySelector('vis-bug').selectorEngine.select(el)
  })
  await page.waitForTimeout(100)

  await page.keyboard.down('Control')
  await page.keyboard.press('KeyK')
  await page.keyboard.up('Control')
  await page.waitForSelector('visbug-note', { timeout: 3000 })
  await page.waitForTimeout(150)

  await page.keyboard.type('이 텍스트는 저장되면 안 됨')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(100)

  const result = await page.evaluate(() => {
    const el = document.getElementById('notes-cancel-target')
    return {
      note: window.ChangeTracker.getNote(el),
      noteElGone: !document.querySelector('visbug-note'),
      // the active tool should be unaffected - typing/Escape inside the note
      // input must not have bubbled into the page's own hotkey handlers
      activeTool: document.querySelector('vis-bug').activeTool,
    }
  })

  t.is(result.note, null, 'Escape should discard the draft note')
  t.true(result.noteElGone)
  t.is(result.activeTool, 'position', 'page hotkeys should be unaffected by typing inside the note input')

  await page.evaluate(() => {
    document.getElementById('notes-cancel-target')?.remove()
    window.ChangeTracker.clearAll()
  })
})
