import test from 'ava'
import puppeteer from 'puppeteer'

const PORT = Number(process.env.E2E_PORT || 3502)

// 타겟 요소가 다른 e2e 스위트의 타겟과 겹치지 않도록 별도 좌표를 쓴다.
const TARGET_LEFT = 40
const TARGET_TOP = 500

const setupPptrTab = async t => {
  t.context.browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  t.context.page = await t.context.browser.newPage()
  await t.context.page.setViewport({ width: 1280, height: 900 })
  await t.context.page.goto(`http://localhost:${PORT}`)
  await t.context.page.evaluateHandle(`document.body.setAttribute('testing', true)`)
  await t.context.page.waitForSelector('vis-bug', { timeout: 10000 })
  await t.context.page.waitForSelector('visbug-side-panel', { timeout: 10000 })
  await t.context.page.waitForSelector('visbug-kit-panel', { timeout: 10000 })
}

const teardownPptrTab = async ({ context: { page, browser } }) => {
  if (page) await page.close()
  if (browser) await browser.close()
}

// 사이드 패널의 "킷" 탭으로 전환한다 (섀도우 버튼은 .click() 대신 dispatchEvent 사용 - 크롬 93 호환)
const openKitTab = async page => {
  await page.evaluate(() => {
    const side = document.querySelector('visbug-side-panel')
    const tab = side.$shadow.querySelector('.tab[data-tab="kit"]')
    tab.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
  await page.waitForTimeout(100)
}

test.beforeEach(async t => {
  await setupPptrTab(t)
})

test.afterEach.always(async t => {
  await teardownPptrTab(t)
})

test.serial('Kit tab: shows kit panel with builtin cards (>=6), each with a non-zero-height preview', async t => {
  const { page } = t.context

  await openKitTab(page)

  const info = await page.evaluate(() => {
    const kit = document.querySelector('visbug-kit-panel')
    const sh = kit.$shadow
    const builtinCards = Array.from(sh.querySelectorAll('[data-cards="builtin"] .kit-card'))
    const heights = builtinCards.map(card => {
      const preview = card.querySelector('[data-preview]')
      const inner = preview && preview.querySelector('.preview-inner')
      return inner ? inner.getBoundingClientRect().height : 0
    })
    const side = document.querySelector('visbug-side-panel')
    const kitTabPanel = side.$shadow.querySelector('[data-tab-panel="kit"]')
    const kitTabVisible = !kitTabPanel.hasAttribute('hidden')

    return { count: builtinCards.length, heights, kitTabVisible }
  })

  console.log('[kit-panel e2e] builtin cards', info)
  t.true(info.kitTabVisible, 'kit tab panel should be visible after clicking the 킷 tab')
  t.true(info.count >= 6, `expected at least 6 builtin cards, got ${info.count}`)
  t.true(info.heights.every(h => h > 0), `every builtin card preview should have non-zero height: ${info.heights}`)
})

test.serial('Kit tab: hover builtin:btn-primary previews backgroundColor on selected button, mouseleave restores, click applies with one undo entry', async t => {
  const { page } = t.context

  await page.evaluate(({ left, top }) => {
    window.ChangeTracker.clearAll()
    const el = document.createElement('button')
    el.id = 'kit-target-btn'
    el.textContent = 'Target'
    el.style.cssText = `position:fixed;left:${left}px;top:${top}px;width:120px;height:40px;z-index:1;background-color:rgb(200, 200, 200);color:#000;border:none;`
    document.body.appendChild(el)
  }, { left: TARGET_LEFT, top: TARGET_TOP })

  await page.evaluate(() => {
    const el = document.getElementById('kit-target-btn')
    document.querySelector('vis-bug').selectorEngine.select(el)
  })
  await page.waitForTimeout(150)

  await openKitTab(page)

  const before = await page.evaluate(() => {
    const el = document.getElementById('kit-target-btn')
    return getComputedStyle(el).backgroundColor
  })

  // 카드에 hover(mouseover) 디스패치
  await page.evaluate(() => {
    const kit = document.querySelector('visbug-kit-panel')
    const card = kit.$shadow.querySelector('[data-id="builtin:btn-primary"]')
    card.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }))
  })
  await page.waitForTimeout(300)

  const duringHover = await page.evaluate(() => {
    const el = document.getElementById('kit-target-btn')
    return getComputedStyle(el).backgroundColor
  })

  console.log('[kit-panel e2e] backgroundColor before/during hover', before, duringHover)
  t.not(duringHover, before, 'hovering builtin:btn-primary should preview a background color change on the selected button')

  // mouseleave -> revert
  await page.evaluate(() => {
    const kit = document.querySelector('visbug-kit-panel')
    const card = kit.$shadow.querySelector('[data-id="builtin:btn-primary"]')
    card.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, cancelable: true, relatedTarget: kit.$shadow.querySelector('.panel') }))
  })
  await page.waitForTimeout(100)

  const afterLeave = await page.evaluate(() => {
    const el = document.getElementById('kit-target-btn')
    return getComputedStyle(el).backgroundColor
  })
  t.is(afterLeave, before, 'mouseleave should restore the original background color')

  // 클릭 -> 적용, undo 스택 +1
  const undoBefore = await page.evaluate(() => window.ChangeTracker.getUndoStackSnapshot().length)

  await page.evaluate(() => {
    const kit = document.querySelector('visbug-kit-panel')
    const card = kit.$shadow.querySelector('[data-id="builtin:btn-primary"]')
    card.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
  await page.waitForTimeout(150)

  const afterClick = await page.evaluate(() => {
    const el = document.getElementById('kit-target-btn')
    return getComputedStyle(el).backgroundColor
  })
  const undoAfter = await page.evaluate(() => window.ChangeTracker.getUndoStackSnapshot().length)

  t.not(afterClick, before, 'clicking should apply the kit item background color')
  t.is(undoAfter, undoBefore + 1, 'applying a kit item should add exactly one undo entry')
})

test.serial('Kit tab: saving current selection adds a 내 킷 card, x removes it, export contains its name', async t => {
  const { page } = t.context

  await page.evaluate(({ left, top }) => {
    const el = document.createElement('div')
    el.id = 'kit-save-target'
    el.textContent = 'Save target'
    el.style.cssText = `position:fixed;left:${left}px;top:${top + 80}px;width:140px;height:50px;z-index:1;background:#eee;`
    document.body.appendChild(el)
  }, { left: TARGET_LEFT, top: TARGET_TOP })

  await page.evaluate(() => {
    const el = document.getElementById('kit-save-target')
    document.querySelector('vis-bug').selectorEngine.select(el)
  })
  await page.waitForTimeout(150)

  await openKitTab(page)

  const uniqueName = `테스트킷 ${Date.now()}`

  // + 현재 선택 저장 -> 폼 오픈
  await page.evaluate(() => {
    const kit = document.querySelector('visbug-kit-panel')
    const btn = kit.$shadow.querySelector('[data-save]')
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
  await page.waitForTimeout(100)

  const formVisible = await page.evaluate(() => {
    const kit = document.querySelector('visbug-kit-panel')
    return !kit.$shadow.querySelector('[data-save-form]').hidden
  })
  t.true(formVisible, 'save form should open after clicking + 현재 선택 저장')

  await page.evaluate((name) => {
    const kit = document.querySelector('visbug-kit-panel')
    const input = kit.$shadow.querySelector('[data-save-name]')
    input.value = name
  }, uniqueName)

  // 저장 버튼 클릭 (제출)
  await page.evaluate(() => {
    const kit = document.querySelector('visbug-kit-panel')
    const btn = kit.$shadow.querySelector('[data-confirm-save]')
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
  await page.waitForTimeout(150)

  const afterSave = await page.evaluate((name) => {
    const kit = document.querySelector('visbug-kit-panel')
    const cards = Array.from(kit.$shadow.querySelectorAll('[data-cards="user"] .kit-card'))
    const found = cards.find(c => {
      const nameEl = c.querySelector('[data-name]')
      return nameEl && nameEl.textContent === name
    })
    return { count: cards.length, foundId: found ? found.dataset.id : null }
  }, uniqueName)

  console.log('[kit-panel e2e] after save', afterSave)
  t.truthy(afterSave.foundId, `saved item "${uniqueName}" should appear under 내 킷`)

  // 내보내기 문자열에 이름이 포함되는지
  const exported = await page.evaluate(() => window.DesignPokeKit.exportJSON())
  t.true(exported.includes(uniqueName), 'exportJSON() output should contain the saved item name')

  // × 두 번 눌러 삭제 (확인 상태 거쳐서)
  await page.evaluate((id) => {
    const kit = document.querySelector('visbug-kit-panel')
    const card = kit.$shadow.querySelector(`[data-id="${id}"]`)
    const delBtn = card.querySelector('[data-delete]')
    delBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  }, afterSave.foundId)
  await page.waitForTimeout(50)
  await page.evaluate((id) => {
    const kit = document.querySelector('visbug-kit-panel')
    const card = kit.$shadow.querySelector(`[data-id="${id}"]`)
    const delBtn = card.querySelector('[data-delete]')
    delBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  }, afterSave.foundId)
  await page.waitForTimeout(150)

  const afterDelete = await page.evaluate((id) => {
    const kit = document.querySelector('visbug-kit-panel')
    return !!kit.$shadow.querySelector(`[data-id="${id}"]`)
  }, afterSave.foundId)

  t.false(afterDelete, '× confirmed twice within 2s should remove the saved item')
})
