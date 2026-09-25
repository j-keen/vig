import test from 'ava'

import { setupPptrTab, teardownPptrTab, getActiveTool, pptrMetaKey }
from '../../../tests/helpers'

test.beforeEach(setupPptrTab)

test('Should have position (선택/이동) as default tool', async t => {
  const { page } = t.context
  t.is(await getActiveTool(page), 'position')
  t.pass()
})

test('Should have 3 color pickers (hidden, used internally by the hueshift tool)', async t => {
  const { page } = t.context
  const info = await page.evaluate(() => {
    const vb = document.querySelector('vis-bug')
    const ol = vb.$shadow.querySelector('ol[colors]')
    return {
      pickers: vb.$shadow.querySelectorAll('ol[colors] > li').length,
      hidden: ol.hasAttribute('hidden'),
    }
  })
  t.is(info.pickers, 3)
  t.true(info.hidden, 'the color picker markup should stay hidden - it is not a visible toolbar anymore')
  t.pass()
})

test('Should have no visible left toolbar (only the invisible <vis-bug> controller)', async t => {
  const { page } = t.context
  const info = await page.evaluate(() => {
    const vb = document.querySelector('vis-bug')
    const rect = vb.getBoundingClientRect()
    return {
      width: rect.width,
      height: rect.height,
      toolLis: vb.$shadow.querySelectorAll('li[data-tool]').length,
      hotkeysRendered: vb.$shadow.querySelectorAll('visbug-hotkeys').length,
    }
  })
  t.is(info.width, 0, 'vis-bug host should take up no visible space')
  t.is(info.height, 0)
  t.is(info.toolLis, 0, 'the old toolbar <li data-tool> buttons should be gone')
  t.is(info.hotkeysRendered, 0, 'the hotkey-map trainer should not be rendered')
})

test('Should mount a right side panel shell with 속성/이력 tabs', async t => {
  const { page } = t.context
  await page.waitForSelector('visbug-side-panel')

  const info = await page.evaluate(() => {
    const shell = document.querySelector('visbug-side-panel')
    const rect = shell.getBoundingClientRect()
    return {
      exists: !!shell,
      tabCount: shell.$shadow.querySelectorAll('.tab').length,
      propsVisible: !shell.$shadow.querySelector('[data-tab-panel="props"]').hasAttribute('hidden'),
      historyHidden: shell.$shadow.querySelector('[data-tab-panel="history"]').hasAttribute('hidden'),
      right: Math.round(window.innerWidth - rect.right),
    }
  })

  t.true(info.exists)
  t.is(info.tabCount, 2)
  t.true(info.propsVisible, '속성 tab should be shown by default')
  t.true(info.historyHidden, '이력 tab content should start hidden')
  t.true(info.right <= 1, 'shell should be flush with the right edge')
})

test('Switching to the 이력 tab shows history and hides props (and back)', async t => {
  const { page } = t.context
  await page.waitForSelector('visbug-side-panel')

  const after = await page.evaluate(() => {
    const shell = document.querySelector('visbug-side-panel')
    // 참고: 실제 .click()은 composed 이벤트라 document.body 캡처 단계의
    // 전역 on_click 이 가로채 stopPropagation 해버린다 (실제 좌표 클릭이 아니라서
    // off-bounds 판정과 무관하게 항상 그렇다). shadow 내부에 머무는 합성 클릭을 쏜다.
    shell.$shadow.querySelector('.tab[data-tab="history"]').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    return {
      propsHidden: shell.$shadow.querySelector('[data-tab-panel="props"]').hasAttribute('hidden'),
      historyHidden: shell.$shadow.querySelector('[data-tab-panel="history"]').hasAttribute('hidden'),
      historySelected: shell.$shadow.querySelector('.tab[data-tab="history"]').getAttribute('aria-selected'),
    }
  })
  t.true(after.propsHidden)
  t.false(after.historyHidden)
  t.is(after.historySelected, 'true')

  const back = await page.evaluate(() => {
    const shell = document.querySelector('visbug-side-panel')
    shell.$shadow.querySelector('.tab[data-tab="props"]').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    return {
      propsHidden: shell.$shadow.querySelector('[data-tab-panel="props"]').hasAttribute('hidden'),
      historyHidden: shell.$shadow.querySelector('[data-tab-panel="history"]').hasAttribute('hidden'),
    }
  })
  t.false(back.propsHidden)
  t.true(back.historyHidden)
})

test('Collapse button shrinks the shell to a narrow tab, and expanding restores it', async t => {
  const { page } = t.context
  await page.waitForSelector('visbug-side-panel')

  const before = await page.evaluate(() =>
    document.querySelector('visbug-side-panel').getBoundingClientRect().width)

  const collapsed = await page.evaluate(() => {
    const shell = document.querySelector('visbug-side-panel')
    shell.$shadow.querySelector('[data-collapse-toggle]').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    return shell.getBoundingClientRect().width
  })
  t.true(collapsed < 60, `collapsed shell should be a narrow tab, got ${collapsed}px`)

  const expanded = await page.evaluate(() => {
    const shell = document.querySelector('visbug-side-panel')
    shell.$shadow.querySelector('[data-collapse-toggle]').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    return shell.getBoundingClientRect().width
  })
  t.true(expanded > 150, `expanding should restore the shell width, got ${expanded}px`)
  t.true(Math.abs(expanded - before) < 2, 'expanding should restore the original width')
})

test('Should allow selecting 1 element', async t => {
  const { page } = t.context

  await page.click(`[intro]`)

  const handles_elements = await page.evaluate(`document.querySelectorAll('visbug-handles').length`)

  t.is(handles_elements, 1)

  t.pass()
})

test('Should allow multi-selection', async t => {
  const { page } = t.context

  await page.click(`.artboard:nth-of-type(1)`)
  await page.keyboard.down('Shift')
  await page.click(`.artboard:nth-of-type(2)`)
  await page.keyboard.up('Shift')

  const handles_elements = await page.evaluate(`document.querySelectorAll('visbug-handles').length`)

  t.is(handles_elements, 2)

  t.pass()
})

test('Should allow deselecting', async t => {
  const { page } = t.context

  await page.click(`.artboard:nth-of-type(1)`)
  const handles_elements = await page.evaluate(`document.querySelectorAll('visbug-handles').length`)
  t.is(handles_elements, 1)

  await page.keyboard.press('Escape')
  const new_handles_elements = await page.evaluate(`document.querySelectorAll('visbug-handles').length`)
  t.is(new_handles_elements, 0)

  t.pass()
})

test('Should be hideable', async t => {
  const { page } = t.context
  const metaKey = await pptrMetaKey(page)

  await page.keyboard.down(metaKey)
  await page.keyboard.down('.')
  await page.keyboard.up(metaKey)
  await page.keyboard.up('.')

  const visibility = await page.evaluate(`document.querySelector('vis-bug').$shadow.host.style.display`)

  t.is(visibility, 'none')
  t.pass()
})

test('Should accept valid execCommand', async t => {
  const { page } = t.context
  const execCommand = await page.evaluate(`document.querySelector('vis-bug').execCommand('shuffle')`)

  t.is(execCommand, undefined)
  t.pass()
})

test('Should throw on invalid execCommand', async t => {
  const { page } = t.context
  const execCommand = await page.evaluate(`document.querySelector('vis-bug').execCommand('invalid command')`)

  t.deepEqual(execCommand, {})
  t.pass()
})

test.afterEach(teardownPptrTab)
