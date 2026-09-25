import test from 'ava'
import puppeteer from 'puppeteer'

const PORT = Number(process.env.E2E_PORT || 3300)

// 패널 호스트(<visbug-props>)는 이제 셸에 슬롯되기 전까지 body 맨 위 정적 블록으로
// 렌더링될 수 있으므로, 테스트 타겟은 겹치지 않도록 y=600 아래에 배치한다.
const TARGET_TOP = 650

const setupPptrTab = async t => {
  t.context.browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  t.context.page = await t.context.browser.newPage()
  // 타겟 요소를 패널과 겹치지 않도록 y=600 아래에 두므로, 뷰포트도 그만큼 키워
  // page.mouse 좌표 기반 드래그(스크롤 없이 절대 좌표 사용)가 화면 밖으로 나가지 않게 한다.
  await t.context.page.setViewport({ width: 1280, height: 900 })
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
    el.style.cssText = `position:fixed;left:320px;top:${650};width:150px;height:60px;z-index:1;background:#eee;`
    document.body.appendChild(el)
  })

  // 아직 선택 전이므로 바디는 숨겨지고 빈 상태 힌트가 표시되어야 한다
  const beforeSelect = await page.evaluate(() => {
    const panel = document.querySelector('visbug-props')
    const sh = panel.$shadow
    return {
      bodyHidden: sh.querySelector('.body').hidden,
      hintHidden: sh.querySelector('.empty-hint').hidden,
    }
  })
  t.true(beforeSelect.bodyHidden, 'body should be hidden before any selection')
  t.false(beforeSelect.hintHidden, 'empty-state hint should be visible before any selection')

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
      bodyHidden: sh.querySelector('.body').hidden,
      hintHidden: sh.querySelector('.empty-hint').hidden,
      width: widthInput.value,
      focused: sh.activeElement === widthInput,
    }
  })
  console.log('[props-panel e2e] after select', afterSelect)
  t.false(afterSelect.bodyHidden, 'body should be visible once an element is selected')
  t.true(afterSelect.hintHidden, 'empty-state hint should be hidden once an element is selected')
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

  // 선택 해제 시 바디가 다시 숨겨지고 빈 상태 힌트가 보여야 한다
  await page.evaluate(() => {
    document.querySelector('vis-bug').selectorEngine.unselect_all()
  })
  await page.waitForTimeout(200)

  const afterUnselect = await page.evaluate(() => {
    const panel = document.querySelector('visbug-props')
    return panel.$shadow.querySelector('.body').hidden
  })
  t.true(afterUnselect, 'body should hide again after unselect_all')
})

test.serial('Props panel: dragging the W slider live-updates width and commits exactly one undo entry on mouseup', async t => {
  const { page } = t.context

  await page.evaluate(top => {
    window.ChangeTracker.clearAll()
    const el = document.createElement('div')
    el.id = 'props-target-slider'
    el.style.cssText = `position:fixed;left:50px;top:${top}px;width:150px;height:60px;z-index:1;background:#eee;`
    document.body.appendChild(el)
  }, TARGET_TOP)

  await page.evaluate(() => {
    const el = document.getElementById('props-target-slider')
    document.querySelector('vis-bug').selectorEngine.select(el)
  })
  await page.waitForTimeout(200)

  const before = await page.evaluate(() => window.ChangeTracker.getUndoStackSnapshot().length)

  // 패널이 이제 body 정상 흐름에 놓이는 정적 블록이라 페이지 맨 아래로 밀릴 수 있으므로
  // page.mouse 의 절대 좌표 드래그가 화면 밖을 가리키지 않도록 먼저 뷰포트 안으로 스크롤한다.
  const sliderBox = await page.evaluate(() => {
    const panel = document.querySelector('visbug-props')
    const el = panel.$shadow.querySelector('.range-input[data-prop="width"]')
    el.scrollIntoView({ block: 'center', inline: 'center' })
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

  await page.evaluate(top => {
    window.ChangeTracker.clearAll()
    const el = document.createElement('div')
    el.id = 'props-target-hint'
    el.style.cssText = `position:fixed;left:50px;top:${top}px;width:150px;height:60px;z-index:1;background:#eee;`
    document.body.appendChild(el)
  }, TARGET_TOP)

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

test.serial('Props panel: each .num-row is a single compact line (<=30px) containing a range and an input', async t => {
  const { page } = t.context

  await page.evaluate(top => {
    window.ChangeTracker.clearAll()
    const el = document.createElement('div')
    el.id = 'layout-target'
    el.textContent = 'Layout target'
    el.style.cssText = `position:fixed;left:50px;top:${top}px;width:150px;height:60px;z-index:1;background:#eee;`
    document.body.appendChild(el)
    document.querySelector('vis-bug').selectorEngine.select(el)
  }, TARGET_TOP)
  await page.waitForTimeout(200)

  const rows = await page.evaluate(() => {
    const panel = document.querySelector('visbug-props')
    const rowEls = Array.from(panel.$shadow.querySelectorAll('.num-row'))
    return rowEls.map(row => {
      const r = row.getBoundingClientRect()
      return {
        prop: row.getAttribute('data-row-prop'),
        height: r.height,
        hasRange: !!row.querySelector('.range-input'),
        hasInput: !!row.querySelector('.num-input, .opacity-input'),
      }
    })
  })

  console.log('[props-panel e2e] num-row layout', rows)
  t.true(rows.length > 0, 'there should be at least one .num-row')
  rows.forEach(row => {
    t.true(row.height <= 30, `num-row [${row.prop}] should be <= 30px tall (got ${row.height})`)
    t.true(row.hasRange, `num-row [${row.prop}] should contain a range input`)
    t.true(row.hasInput, `num-row [${row.prop}] should contain a value input`)
  })
})

test.serial('Props panel: 순서 ▶ button swaps the element with its next sibling and keeps it selected', async t => {
  const { page } = t.context

  await page.evaluate(top => {
    window.ChangeTracker.clearAll()
    const parent = document.createElement('div')
    parent.id = 'order-parent'
    parent.style.cssText = `position:fixed;left:50px;top:${top}px;width:300px;height:100px;z-index:1;background:#ddd;`
    const a = document.createElement('div')
    a.id = 'order-a'
    a.textContent = 'A'
    a.style.cssText = 'width:100px;height:40px;display:inline-block;background:#faa;'
    const b = document.createElement('div')
    b.id = 'order-b'
    b.textContent = 'B'
    b.style.cssText = 'width:100px;height:40px;display:inline-block;background:#aaf;'
    parent.appendChild(a)
    parent.appendChild(b)
    document.body.appendChild(parent)
    document.querySelector('vis-bug').selectorEngine.select(a)
  }, TARGET_TOP)
  await page.waitForTimeout(200)

  const rightBtn = (await page.evaluateHandle(() => {
    const panel = document.querySelector('visbug-props')
    return panel.$shadow.querySelector('.order-btn[data-move-dir="right"]')
  })).asElement()
  t.truthy(rightBtn, 'the 순서 ▶ button should be found inside the panel shadow root')

  await rightBtn.click()
  await page.waitForTimeout(200)

  const result = await page.evaluate(() => {
    const parent = document.getElementById('order-parent')
    const a = document.getElementById('order-a')
    return {
      order: Array.from(parent.children).map(c => c.id),
      selected: a.hasAttribute('data-selected'),
      selection: document.querySelector('vis-bug').selectorEngine.selection().length,
    }
  })
  console.log('[props-panel e2e] order after clicking ▶', result)
  t.deepEqual(result.order, ['order-b', 'order-a'], 'clicking ▶ should swap the element with its next sibling')
  t.true(result.selected, 'the moved element should remain selected (data-selected attribute)')
  t.is(result.selection, 1, 'exactly the moved element should remain in the selection')
})

test.serial('Props panel: 정렬(Flex) 가운데 button sets justify-content:center and creates exactly one undo entry', async t => {
  const { page } = t.context

  await page.evaluate(top => {
    window.ChangeTracker.clearAll()
    const el = document.createElement('div')
    el.id = 'flex-target'
    el.style.cssText = `position:fixed;left:50px;top:${top}px;width:200px;height:80px;z-index:1;background:#eee;display:flex;`
    document.body.appendChild(el)
    document.querySelector('vis-bug').selectorEngine.select(el)
  }, TARGET_TOP)
  await page.waitForTimeout(200)

  const before = await page.evaluate(() => window.ChangeTracker.getUndoStackSnapshot().length)

  const controlsHidden = await page.evaluate(() => {
    const panel = document.querySelector('visbug-props')
    return panel.$shadow.querySelector('.flex-controls').hidden
  })
  t.false(controlsHidden, 'flex controls should be visible for an already-flex element')

  const centerBtn = (await page.evaluateHandle(() => {
    const panel = document.querySelector('visbug-props')
    return panel.$shadow.querySelector('.flex-btn[data-flex-prop="justifyContent"][data-flex-value="center"]')
  })).asElement()
  t.truthy(centerBtn, 'the 가운데 justify-content button should be found')

  await centerBtn.click()
  await page.waitForTimeout(150)

  const after = await page.evaluate(() => {
    const el = document.getElementById('flex-target')
    return {
      justifyContent: el.style.justifyContent,
      undoLength: window.ChangeTracker.getUndoStackSnapshot().length,
    }
  })
  console.log('[props-panel e2e] after 가운데 click', after)
  t.is(after.justifyContent, 'center', 'clicking 가운데 should set justify-content: center')
  t.is(after.undoLength, before + 1, 'exactly one undo entry should be created for the click')
})

test.serial('Props panel: Settings theme toggles data-theme on host', async t => {
  const { page } = t.context

  await page.evaluate(top => {
    const el = document.createElement('div')
    el.id = 'props-theme-target'
    el.style.cssText = `position:fixed;left:50px;top:${top}px;width:100px;height:60px;z-index:1;background:#eee;`
    document.body.appendChild(el)
    document.querySelector('vis-bug').selectorEngine.select(el)
  }, TARGET_TOP)
  await page.waitForTimeout(200)

  await page.evaluate(() => window.DesignPokeSettings.set({ theme: 'light' }))
  await page.waitForTimeout(150)

  const light = await page.evaluate(() => document.querySelector('visbug-props').getAttribute('data-theme'))
  t.is(light, 'light', 'host should carry data-theme="light"')

  await page.evaluate(() => window.DesignPokeSettings.set({ theme: 'dark' }))
  await page.waitForTimeout(150)

  const dark = await page.evaluate(() => document.querySelector('visbug-props').getAttribute('data-theme'))
  t.is(dark, 'dark', 'host should carry data-theme="dark" after switching back')
})

test.serial('Props panel: Settings opacity is applied to the host style.opacity', async t => {
  const { page } = t.context

  await page.evaluate(top => {
    const el = document.createElement('div')
    el.id = 'props-opacity-target'
    el.style.cssText = `position:fixed;left:50px;top:${top}px;width:100px;height:60px;z-index:1;background:#eee;`
    document.body.appendChild(el)
    document.querySelector('vis-bug').selectorEngine.select(el)
  }, TARGET_TOP)
  await page.waitForTimeout(200)

  await page.evaluate(() => window.DesignPokeSettings.set({ opacity: 0.5 }))
  await page.waitForTimeout(100)

  const opacity = await page.evaluate(() => document.querySelector('visbug-props').style.opacity)
  t.is(opacity, '0.5', 'Settings should apply opacity directly to the host style')
})
