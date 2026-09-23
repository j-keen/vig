import test from 'ava'
import puppeteer from 'puppeteer'

// E2E: 기본 도구(선택/이동)에서의 핸들 크기 조절 조합키
//   모서리 기본 = 비율 유지, Shift = 자유 비율, Alt = 중심 기준, 방향키 = 이동

const PORT = Number(process.env.E2E_PORT || 3300)

const setupPptrTab = async t => {
  t.context.browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  t.context.page = await t.context.browser.newPage()
  await t.context.page.setViewport({ width: 1200, height: 800 })
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

// 200x100 고정 박스를 만들고 선택
const makeAndSelectBox = async page => {
  await page.evaluate(() => {
    window.ChangeTracker.clearAll()
    const el = document.createElement('div')
    el.id = 'resize-target'
    el.style.cssText = 'position:fixed;left:300px;top:200px;width:200px;height:100px;background:#8cf;z-index:1;'
    document.body.appendChild(el)
    const visbug = document.querySelector('vis-bug')
    visbug.selectorEngine.unselect_all({ silent: true })
    visbug.selectorEngine.select(el)
  })
  await page.waitForTimeout(150)
  return page.evaluate(() => {
    const r = document.getElementById('resize-target').getBoundingClientRect()
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
  })
}

const dragFrom = async (page, x, y, dx, dy, { shift = false, alt = false } = {}) => {
  if (shift) await page.keyboard.down('Shift')
  if (alt) await page.keyboard.down('Alt')
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 4 })
  await page.mouse.move(x + dx, y + dy, { steps: 4 })
  await page.waitForTimeout(80)
  await page.mouse.up()
  if (alt) await page.keyboard.up('Alt')
  if (shift) await page.keyboard.up('Shift')
  await page.waitForTimeout(150)
}

const getSize = page => page.evaluate(() => {
  const el = document.getElementById('resize-target')
  const cs = getComputedStyle(el)
  return { width: parseFloat(cs.width), height: parseFloat(cs.height), transform: cs.transform }
})

test.serial('Default tool is 선택/이동 (position) and handles appear on select', async t => {
  const { page } = t.context
  const active = await page.evaluate(() => document.querySelector('vis-bug').activeTool)
  t.is(active, 'position')

  await makeAndSelectBox(page)
  const handles = await page.evaluate(() => document.querySelectorAll('visbug-handles').length)
  t.is(handles, 1, 'resize handles should be shown in the default tool')
})

test.serial('Corner drag keeps aspect ratio by default', async t => {
  const { page } = t.context
  const r = await makeAndSelectBox(page)

  // bottom-end 모서리에서 +40px 가로로 끌기 → 가로 240, 세로는 비율(2:1) 유지로 120
  await dragFrom(page, r.right, r.bottom, 40, 0)
  const size = await getSize(page)
  t.true(Math.abs(size.width - 240) <= 2, `width should be ~240, got ${size.width}`)
  t.true(Math.abs(size.height - 120) <= 2, `height should follow ratio (~120), got ${size.height}`)

  const tracked = await page.evaluate(() => {
    const el = document.getElementById('resize-target')
    return window.ChangeTracker.getChanges(el)
  })
  t.truthy(tracked.width, 'width change should be tracked')
})

test.serial('Shift + corner drag resizes freely', async t => {
  const { page } = t.context
  const r = await makeAndSelectBox(page)

  await dragFrom(page, r.right, r.bottom, 40, 10, { shift: true })
  const size = await getSize(page)
  t.true(Math.abs(size.width - 240) <= 2, `width should be ~240, got ${size.width}`)
  t.true(Math.abs(size.height - 110) <= 2, `height should be ~110 (free), got ${size.height}`)
})

test.serial('Alt + edge drag grows from center', async t => {
  const { page } = t.context
  const r = await makeAndSelectBox(page)

  // middle-end 가장자리에서 +20px → 중심 기준이면 가로 240 (양쪽 20씩), 왼쪽으로 20 이동
  await dragFrom(page, r.right, r.top + r.height / 2, 20, 0, { alt: true })
  const size = await getSize(page)
  t.true(Math.abs(size.width - 240) <= 2, `width should be ~240, got ${size.width}`)
  const rect = await page.evaluate(() => document.getElementById('resize-target').getBoundingClientRect().left)
  t.true(Math.abs(rect - (r.left - 20)) <= 2, `box should shift left by 20 (center anchored), left=${rect}`)
})

test.serial('Arrow keys nudge the selection in the default tool and are undoable', async t => {
  const { page } = t.context
  const r = await makeAndSelectBox(page)

  await page.keyboard.press('ArrowRight')
  await page.keyboard.down('Shift')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.up('Shift')
  await page.waitForTimeout(100)

  const moved = await page.evaluate(() => {
    const b = document.getElementById('resize-target').getBoundingClientRect()
    return { left: b.left, top: b.top }
  })
  t.true(Math.abs(moved.left - (r.left + 1)) <= 1, `should move right by 1, left=${moved.left}`)
  t.true(Math.abs(moved.top - (r.top + 10)) <= 1, `should move down by 10, top=${moved.top}`)

  await page.keyboard.down('Control')
  await page.keyboard.press('z')
  await page.keyboard.press('z')
  await page.keyboard.up('Control')
  await page.waitForTimeout(150)

  const back = await page.evaluate(() => {
    const b = document.getElementById('resize-target').getBoundingClientRect()
    return { left: b.left, top: b.top }
  })
  t.true(Math.abs(back.left - r.left) <= 1 && Math.abs(back.top - r.top) <= 1, 'Ctrl+Z twice should restore position')
})

test.serial('computeResize pure helper: proportional, free and center math', async t => {
  const { page } = t.context
  const out = await page.evaluate(() => {
    const f = window.DesignPokeResize.computeResize
    return {
      prop: f({ placement: 'bottom-end', initialWidth: 200, initialHeight: 100, diffX: 40, diffY: 0, proportional: true }),
      free: f({ placement: 'bottom-end', initialWidth: 200, initialHeight: 100, diffX: 40, diffY: 10 }),
      start: f({ placement: 'top-start', initialWidth: 200, initialHeight: 100, diffX: -20, diffY: -10 }),
      center: f({ placement: 'middle-end', initialWidth: 200, initialHeight: 100, diffX: 20, diffY: 0, fromCenter: true }),
    }
  })
  t.deepEqual(out.prop, { width: 240, height: 120, tx: 0, ty: 0 })
  t.deepEqual(out.free, { width: 240, height: 110, tx: 0, ty: 0 })
  t.deepEqual(out.start, { width: 220, height: 110, tx: -20, ty: -10 })
  t.deepEqual(out.center, { width: 240, height: 100, tx: -20, ty: 0 })
})
