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
  await t.context.page.waitForSelector('visbug-props', { timeout: 10000 })
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

test.serial('Props panel: shows on select with correct width, edits width via Enter, Ctrl+Z restores, hides on unselect_all', async t => {
  const { page } = t.context

  await page.evaluate(() => {
    window.ChangeTracker.clearAll()
    const el = document.createElement('div')
    el.id = 'props-target'
    el.textContent = 'Props target'
    el.style.cssText = 'position:fixed;left:320px;top:260px;width:150px;height:60px;z-index:1;background:#eee;'
    document.body.appendChild(el)
  })

  // 아직 선택 전이므로 패널은 숨겨져 있어야 한다
  const beforeSelect = await page.evaluate(() => {
    const panel = document.querySelector('visbug-props')
    return panel.$shadow.querySelector('.panel').hidden
  })
  t.true(beforeSelect, 'panel should be hidden before any selection')

  await page.evaluate(() => {
    const el = document.getElementById('props-target')
    document.querySelector('vis-bug').selectorEngine.select(el)
  })
  await page.waitForTimeout(200)

  const afterSelect = await page.evaluate(() => {
    const panel = document.querySelector('visbug-props')
    const sh = panel.$shadow
    const widthInput = sh.querySelector('.num-input[data-prop="width"]')
    return {
      hidden: sh.querySelector('.panel').hidden,
      width: widthInput.value,
      focused: sh.activeElement === widthInput,
    }
  })
  console.log('[props-panel e2e] after select', afterSelect)
  t.false(afterSelect.hidden, 'panel should be visible once an element is selected')
  t.is(afterSelect.width, '150', 'width input should reflect the computed width')
  t.false(afterSelect.focused, 'selection should not steal focus into the panel')

  // W 입력에 새 값 입력 후 Enter로 커밋
  await page.evaluate(() => {
    const panel = document.querySelector('visbug-props')
    const input = panel.$shadow.querySelector('.num-input[data-prop="width"]')
    input.focus()
    input.value = '300'
  })
  await page.keyboard.press('Enter')
  await page.waitForTimeout(200)

  const afterEdit = await page.evaluate(() => {
    const el = document.getElementById('props-target')
    const allChanges = window.ChangeTracker.getAllChanges()
    let widthChange = null
    for (const [element, changes] of allChanges) {
      if (element === el) widthChange = changes.width
    }
    return {
      inlineWidth: el.style.width,
      widthChange,
    }
  })
  console.log('[props-panel e2e] after edit', afterEdit)
  t.is(afterEdit.inlineWidth, '300px', 'typing a new width and pressing Enter should update the inline style')
  t.is(afterEdit.widthChange, '300px', 'ChangeTracker should record the width change for the element')

  // 패널 입력에 포커스가 남아있지 않은지 확인한 뒤(커밋은 Enter에서 이미 끝남) body로 포커스를 명시적으로 이동
  const focusAfterCommit = await page.evaluate(() => {
    const panel = document.querySelector('visbug-props')
    document.body.focus()
    return panel.$shadow.activeElement === null
  })
  t.true(focusAfterCommit, 'Enter should blur/commit and leave no active element inside the panel')

  // Ctrl+Z로 되돌리기 (hotkeys-js는 document에 바인딩됨)
  await page.keyboard.down('Control')
  await page.keyboard.press('KeyZ')
  await page.keyboard.up('Control')
  await page.waitForTimeout(200)

  const afterUndo = await page.evaluate(() =>
    document.getElementById('props-target').style.width)
  console.log('[props-panel e2e] after Ctrl+Z', afterUndo)
  t.is(afterUndo, '150px', 'Ctrl+Z should restore the original width')

  // 선택 해제 시 패널이 다시 숨겨져야 한다
  await page.evaluate(() => {
    document.querySelector('vis-bug').selectorEngine.unselect_all()
  })
  await page.waitForTimeout(200)

  const afterUnselect = await page.evaluate(() => {
    const panel = document.querySelector('visbug-props')
    return panel.$shadow.querySelector('.panel').hidden
  })
  t.true(afterUnselect, 'panel should hide again after unselect_all')
})
