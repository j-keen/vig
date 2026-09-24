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

test.serial('Props panel: dragging the W slider live-updates width and commits exactly one undo entry on mouseup', async t => {
  const { page } = t.context

  await page.evaluate(() => {
    window.ChangeTracker.clearAll()
    const el = document.createElement('div')
    el.id = 'props-target-slider'
    el.style.cssText = 'position:fixed;left:50px;top:50px;width:150px;height:60px;z-index:1;background:#eee;'
    document.body.appendChild(el)
  })

  await page.evaluate(() => {
    const el = document.getElementById('props-target-slider')
    document.querySelector('vis-bug').selectorEngine.select(el)
  })
  await page.waitForTimeout(200)

  const before = await page.evaluate(() => window.ChangeTracker.getUndoStackSnapshot().length)

  const sliderBox = await page.evaluate(() => {
    const panel = document.querySelector('visbug-props')
    const el = panel.$shadow.querySelector('.range-input[data-prop="width"]')
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  })

  const y = sliderBox.y + sliderBox.height / 2
  const startX = sliderBox.x + sliderBox.width * 0.1
  const midX = sliderBox.x + sliderBox.width * 0.6

  await page.mouse.move(startX, y)
  await page.mouse.down()
  await page.mouse.move(midX, y, { steps: 10 })
  await page.waitForTimeout(50)

  const liveWidth = await page.evaluate(() =>
    document.getElementById('props-target-slider').style.width)
  console.log('[props-panel e2e] live width during slider drag (mouse still down)', liveWidth)
  t.not(liveWidth, '150px', 'width should already have changed live while the slider is being dragged')

  const undoWhileDragging = await page.evaluate(() => window.ChangeTracker.getUndoStackSnapshot().length)
  t.is(undoWhileDragging, before, 'no undo entry should be pushed yet while the drag is still in progress')

  await page.mouse.up()
  await page.waitForTimeout(150)

  const after = await page.evaluate(() => window.ChangeTracker.getUndoStackSnapshot().length)
  t.is(after, before + 1, 'exactly one undo entry should be pushed for the whole drag gesture')
})

test.serial('Props panel: focusing the W input shows the prop hint overlay; blur clears it', async t => {
  const { page } = t.context

  await page.evaluate(() => {
    window.ChangeTracker.clearAll()
    const el = document.createElement('div')
    el.id = 'props-target-hint'
    el.style.cssText = 'position:fixed;left:50px;top:50px;width:150px;height:60px;z-index:1;background:#eee;'
    document.body.appendChild(el)
  })

  await page.evaluate(() => {
    const el = document.getElementById('props-target-hint')
    document.querySelector('vis-bug').selectorEngine.select(el)
  })
  await page.waitForTimeout(200)

  await page.evaluate(() => {
    const panel = document.querySelector('visbug-props')
    const input = panel.$shadow.querySelector('.num-input[data-prop="width"]')
    input.focus()
  })
  await page.waitForTimeout(80)

  const hintLengthAfterFocus = await page.evaluate(() => {
    const hint = document.querySelector('visbug-prop-hint')
    return hint ? hint.innerHTML.length : 0
  })
  console.log('[props-panel e2e] prop hint innerHTML length after focus', hintLengthAfterFocus)
  t.true(hintLengthAfterFocus > 0, 'prop hint overlay should render content while the W input is focused')

  await page.evaluate(() => {
    const panel = document.querySelector('visbug-props')
    const input = panel.$shadow.querySelector('.num-input[data-prop="width"]')
    input.blur()
  })
  await page.waitForTimeout(300) // scheduleHideHint의 120ms 지연보다 넉넉히 대기

  const hintLengthAfterBlur = await page.evaluate(() => {
    const hint = document.querySelector('visbug-prop-hint')
    return hint ? hint.innerHTML.length : 0
  })
  t.is(hintLengthAfterBlur, 0, 'prop hint overlay should clear shortly after blur')
})

test.serial('Props panel: W stepper click increases width by 1px, Shift+click by 10px', async t => {
  const { page } = t.context

  await page.evaluate(() => {
    window.ChangeTracker.clearAll()
    const el = document.createElement('div')
    el.id = 'props-target-stepper'
    el.style.cssText = 'position:fixed;left:50px;top:50px;width:150px;height:60px;z-index:1;background:#eee;'
    document.body.appendChild(el)
  })

  await page.evaluate(() => {
    const el = document.getElementById('props-target-stepper')
    document.querySelector('vis-bug').selectorEngine.select(el)
  })
  await page.waitForTimeout(200)

  const stepUpHandle = (await page.evaluateHandle(() => {
    const panel = document.querySelector('visbug-props')
    const row = panel.$shadow.querySelector('.num-row[data-row-prop="width"]')
    return row.querySelector('.step-btn[data-dir="1"]')
  })).asElement()
  t.truthy(stepUpHandle, 'the W stepper up button should be found inside the panel shadow root')

  await stepUpHandle.click()
  await page.waitForTimeout(50)

  const afterOneClick = await page.evaluate(() =>
    document.getElementById('props-target-stepper').style.width)
  t.is(afterOneClick, '151px', 'a single stepper click should increase width by 1px')

  await page.keyboard.down('Shift')
  await stepUpHandle.click()
  await page.keyboard.up('Shift')
  await page.waitForTimeout(50)

  const afterShiftClick = await page.evaluate(() =>
    document.getElementById('props-target-stepper').style.width)
  t.is(afterShiftClick, '161px', 'a shift+click on the stepper should increase width by 10px')

  const undoCount = await page.evaluate(() => window.ChangeTracker.getUndoStackSnapshot().length)
  t.is(undoCount, 2, 'each stepper click is its own committed gesture (one undo entry per click)')
})

test.serial('Props panel: Settings theme toggles data-theme and panel background luminance', async t => {
  const { page } = t.context

  await page.evaluate(() => {
    const el = document.createElement('div')
    el.id = 'props-theme-target'
    el.style.cssText = 'position:fixed;left:50px;top:50px;width:100px;height:60px;z-index:1;background:#eee;'
    document.body.appendChild(el)
    document.querySelector('vis-bug').selectorEngine.select(el)
  })
  await page.waitForTimeout(200)

  await page.evaluate(() => window.DesignPokeSettings.set({ theme: 'light' }))
  await page.waitForTimeout(150)

  const light = await page.evaluate(() => {
    const panel = document.querySelector('visbug-props')
    const panelEl = panel.$shadow.querySelector('.panel')
    const bg = getComputedStyle(panelEl).backgroundColor
    const [r, g, b] = bg.match(/[\d.]+/g).map(Number)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return { theme: panel.getAttribute('data-theme'), luminance }
  })
  console.log('[props-panel e2e] light theme', light)
  t.is(light.theme, 'light', 'host should carry data-theme="light"')
  t.true(light.luminance > 0.8, `light panel background should be bright (luminance > 0.8, got ${light.luminance})`)

  await page.evaluate(() => window.DesignPokeSettings.set({ theme: 'dark' }))
  await page.waitForTimeout(150)

  const dark = await page.evaluate(() => document.querySelector('visbug-props').getAttribute('data-theme'))
  t.is(dark, 'dark', 'host should carry data-theme="dark" after switching back')
})

test.serial('Props panel: Settings opacity is applied to the host style.opacity', async t => {
  const { page } = t.context

  await page.evaluate(() => {
    const el = document.createElement('div')
    el.id = 'props-opacity-target'
    el.style.cssText = 'position:fixed;left:50px;top:50px;width:100px;height:60px;z-index:1;background:#eee;'
    document.body.appendChild(el)
    document.querySelector('vis-bug').selectorEngine.select(el)
  })
  await page.waitForTimeout(200)

  await page.evaluate(() => window.DesignPokeSettings.set({ opacity: 0.5 }))
  await page.waitForTimeout(100)

  const opacity = await page.evaluate(() => document.querySelector('visbug-props').style.opacity)
  t.is(opacity, '0.5', 'Settings should apply opacity directly to the host style')
})

test.serial('Props panel: dragging the header moves the host and persists position across reload', async t => {
  const { page } = t.context

  await page.evaluate(() => {
    const el = document.createElement('div')
    el.id = 'props-drag-target'
    el.style.cssText = 'position:fixed;left:50px;top:50px;width:100px;height:60px;z-index:1;background:#eee;'
    document.body.appendChild(el)
    document.querySelector('vis-bug').selectorEngine.select(el)
  })
  await page.waitForTimeout(200)

  const before = await page.evaluate(() => {
    const host = document.querySelector('visbug-props')
    const r = host.getBoundingClientRect()
    const header = host.$shadow.querySelector('.header')
    const hr = header.getBoundingClientRect()
    return { left: r.left, top: r.top, headerX: hr.left + hr.width / 2, headerY: hr.top + hr.height / 2 }
  })

  await page.mouse.move(before.headerX, before.headerY)
  await page.mouse.down()
  await page.mouse.move(before.headerX - 100, before.headerY, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(150)

  const after = await page.evaluate(() => {
    const host = document.querySelector('visbug-props')
    const r = host.getBoundingClientRect()
    return { left: r.left, top: r.top }
  })
  console.log('[props-panel e2e] drag before/after', before, after)
  t.true(Math.abs((before.left - after.left) - 100) < 5,
    `left should have decreased by ~100px (actual delta ${before.left - after.left})`)

  const savedPosition = await page.evaluate(() => window.DesignPokeSettings.get().positions.props)
  console.log('[props-panel e2e] saved position', savedPosition)
  t.truthy(savedPosition, 'dragging should persist a saved position for the props panel')
  t.true(Math.abs(savedPosition.left - after.left) < 5, 'saved position should match the dragged-to location')

  // 새로고침 후 저장된 위치가 복원되는지 확인
  await page.reload()
  await page.waitForSelector('vis-bug', { timeout: 10000 })
  await page.waitForSelector('visbug-props', { timeout: 10000 })
  await page.evaluate(() => document.body.setAttribute('testing', true))

  await page.evaluate(() => {
    const el = document.createElement('div')
    el.id = 'props-drag-target-2'
    el.style.cssText = 'position:fixed;left:50px;top:50px;width:100px;height:60px;z-index:1;background:#eee;'
    document.body.appendChild(el)
    document.querySelector('vis-bug').selectorEngine.select(el)
  })
  await page.waitForTimeout(300)

  const afterReload = await page.evaluate(() => {
    const host = document.querySelector('visbug-props')
    const r = host.getBoundingClientRect()
    return { left: r.left, top: r.top }
  })
  console.log('[props-panel e2e] position after reload', afterReload)
  t.true(Math.abs(afterReload.left - after.left) < 5,
    `panel should reopen at the saved dragged position after reload (expected ~${after.left}, got ${afterReload.left})`)
})
