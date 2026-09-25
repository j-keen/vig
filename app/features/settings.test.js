import test from 'ava'
import puppeteer from 'puppeteer'

// E2E: 전역 설정(테마·투명도·패널 위치), 툴바 정리, 선택 유지(노드 교체 후 재선택)

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
  await t.context.page.evaluate(() => { try { localStorage.removeItem('designpoke.settings') } catch (e) {} })
}

const teardownPptrTab = async ({ context: { page, browser } }) => {
  if (page) await page.close()
  if (browser) await browser.close()
}

test.beforeEach(async t => { await setupPptrTab(t) })
test.afterEach.always(async t => { await teardownPptrTab(t) })

test.serial('Toolbar shows 6 visible tools; margin/padding/font/hueshift are hidden but still reachable', async t => {
  const { page } = t.context
  const info = await page.evaluate(() => {
    const vb = document.querySelector('vis-bug')
    const lis = [...vb.$shadow.querySelectorAll('ol:first-of-type > li')]
    return {
      total: lis.length,
      // 속성이 아니라 실제 렌더링 여부(display)로 검사한다. author CSS 가 UA [hidden] 을 덮을 수 있다.
      visible: lis.filter(li => getComputedStyle(li).display !== 'none').map(li => li.dataset.tool),
      hidden: lis.filter(li => getComputedStyle(li).display === 'none').map(li => li.dataset.tool),
      colorsHidden: getComputedStyle(vb.$shadow.querySelector('ol[colors]')).display === 'none',
      toolbarHeight: vb.$shadow.querySelector('ol:first-of-type').getBoundingClientRect().height,
    }
  })
  t.is(info.total, 10)
  t.deepEqual(info.visible, ['position', 'text', 'align', 'move', 'guides', 'aicopy'])
  t.deepEqual(info.hidden, ['margin', 'padding', 'font', 'hueshift'])
  t.true(info.colorsHidden)
  t.true(info.toolbarHeight < 6 * 40 + 20, `toolbar should be 6 buttons tall, got ${info.toolbarHeight}px`)

  await page.keyboard.press('m')
  await page.waitForTimeout(100)
  t.is(await page.evaluate(() => document.querySelector('vis-bug').activeTool), 'margin', 'hidden tool still works via hotkey')
})

test.serial('Settings: theme and opacity apply to the toolbar and registered panels; popover toggles', async t => {
  const { page } = t.context
  const out = await page.evaluate(async () => {
    const vb = document.querySelector('vis-bug')
    const S = window.DesignPokeSettings
    await S.load()
    S.set({ theme: 'light', opacity: 0.6 })
    await new Promise(r => setTimeout(r, 50))
    const res = {
      scheme: vb.getAttribute('color-scheme'),
      opacity: vb.style.opacity,
      radioLight: vb.$shadow.querySelector('input[name="theme"][value="light"]').checked,
      rangeVal: vb.$shadow.querySelector('input[name="opacity"]').value,
      stored: JSON.parse(localStorage.getItem('designpoke.settings')),
    }
    vb.$shadow.querySelector('[data-settings-toggle]').click()
    res.popoverOpen = !vb.$shadow.querySelector('[settings-popover]').hasAttribute('hidden')
    vb.$shadow.querySelector('[data-settings-toggle]').click()
    res.popoverClosed = vb.$shadow.querySelector('[settings-popover]').hasAttribute('hidden')
    S.set({ theme: 'dark', opacity: 1 })
    return res
  })
  t.is(out.scheme, 'light')
  t.is(out.opacity, '0.6')
  t.true(out.radioLight)
  t.is(out.rangeVal, '60')
  t.is(out.stored.theme, 'light')
  t.true(out.popoverOpen)
  t.true(out.popoverClosed)
})

test.serial('Toolbar drag position is remembered', async t => {
  const { page } = t.context
  const before = await page.evaluate(() => {
    const vb = document.querySelector('vis-bug')
    // 툴 버튼을 잡고 끌면 툴바가 이동한다 (5px 이상 움직이면 클릭이 아닌 드래그로 처리)
    const li = vb.$shadow.querySelector('li[data-tool="guides"]')
    const r = li.getBoundingClientRect()
    const host = vb.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, left: host.left, top: host.top }
  })
  await page.mouse.move(before.x, before.y)
  await page.mouse.down()
  await page.mouse.move(before.x + 80, before.y + 60, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  const after = await page.evaluate(() => {
    const host = document.querySelector('vis-bug').getBoundingClientRect()
    return { left: host.left, top: host.top, saved: window.DesignPokeSettings.get().positions.toolbar }
  })
  t.true(after.left > before.left + 40, `toolbar should move right (${before.left} → ${after.left})`)
  t.truthy(after.saved, 'position should be saved in settings')
  t.true(Math.abs(after.saved.left - after.left) <= 2)
})

test.serial('Selection survives a framework-style node replacement', async t => {
  const { page } = t.context
  const out = await page.evaluate(async () => {
    const wrap = document.createElement('section')
    wrap.id = 'rerender-wrap'
    wrap.innerHTML = '<button id="rr-btn" class="cta">Buy</button>'
    wrap.style.cssText = 'position:fixed;left:200px;top:500px;z-index:1;'
    document.body.appendChild(wrap)
    const vb = document.querySelector('vis-bug')
    vb.selectorEngine.unselect_all({ silent: true })
    vb.selectorEngine.select(document.getElementById('rr-btn'))
    await new Promise(r => requestAnimationFrame(r))

    // React 재렌더 흉내: 같은 자리의 노드를 새 노드로 교체 (data-* 없음)
    const fresh = document.createElement('button')
    fresh.id = 'rr-btn'
    fresh.className = 'cta'
    fresh.textContent = 'Buy now'
    wrap.replaceChild(fresh, document.getElementById('rr-btn'))
    await new Promise(r => setTimeout(r, 120))

    return {
      selectedCount: document.querySelectorAll('[data-selected]').length,
      freshSelected: fresh.hasAttribute('data-selected'),
      handles: document.querySelectorAll('visbug-handles').length,
      engineHas: vb.selectorEngine.selection().includes(fresh),
    }
  })
  t.is(out.selectedCount, 1)
  t.true(out.freshSelected, 'the replacement node should be re-selected')
  t.is(out.handles, 1)
  t.true(out.engineHas)
})

test.serial('backgroundColor prop hint shows a color swatch label without stripes', async t => {
  const { page } = t.context
  const out = await page.evaluate(async () => {
    const el = document.createElement('div')
    el.id = 'bg-hint'
    el.style.cssText = 'position:fixed;left:300px;top:300px;width:120px;height:60px;background:#ff8800;z-index:1;'
    document.body.appendChild(el)
    window.DesignPokePropHint.showPropHint(el, 'backgroundColor', { value: '#ff8800' })
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    const host = document.querySelector('visbug-prop-hint')
    const html = host.innerHTML
    const chip = host.querySelector('span')
    const res = {
      hasStripes: /repeating-linear-gradient/.test(html),
      chipBg: chip && getComputedStyle(chip).backgroundColor,
      label: host.textContent.trim(),
    }
    window.DesignPokePropHint.hidePropHint()
    return res
  })
  t.false(out.hasStripes)
  t.is(out.chipBg, 'rgb(255, 136, 0)')
  t.regex(out.label, /배경색/)
})

test.serial('Pointer events outside the viewport do not throw (elementFromPoint null)', async t => {
  const { page } = t.context
  const errors = []
  page.on('pageerror', err => errors.push(String(err && err.message || err)))

  await page.evaluate(() => {
    const fire = (type, x, y) => document.body.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }))
    // 뷰포트 밖 좌표: elementFromPoint 가 null 을 돌려주는 상황
    fire('mousemove', -50, -50)
    fire('mousemove', 99999, 99999)
    fire('click', -10, -10)
    fire('dblclick', -10, -10)
    // 거리 측정 도구에서도 동일
    document.querySelector('vis-bug').toolSelected('guides')
    fire('mousemove', -50, 20)
    document.querySelector('vis-bug').toolSelected('position')
  })
  await page.waitForTimeout(150)

  t.deepEqual(errors, [], `no page errors expected, got: ${errors.join(' | ')}`)
})

test.serial('Hovering slotted content inside an open shadow host does not throw (shadowRoot.elementFromPoint null)', async t => {
  const { page } = t.context
  const errors = []
  page.on('pageerror', err => errors.push(String(err && err.message || err)))

  const out = await page.evaluate(async () => {
    // Orca UI 같은 웹 컴포넌트 페이지 재현: 호스트의 섀도 트리에 <slot>, 라이트 DOM 자식이 슬롯에 꽂힘.
    // Chrome 은 이 지점에서 host.shadowRoot.elementFromPoint() 에 null 을 돌려준다.
    const host = document.createElement('x-card')
    host.style.cssText = 'position:fixed;left:400px;top:400px;width:200px;height:100px;z-index:1;display:block;'
    host.attachShadow({ mode: 'open' }).innerHTML = '<div style="padding:10px;background:#eee"><slot></slot></div>'
    host.innerHTML = '<button id="slotted-btn" style="width:120px;height:40px">Slotted</button>'
    document.body.appendChild(host)
    await new Promise(r => requestAnimationFrame(r))
    const r = document.getElementById('slotted-btn').getBoundingClientRect()
    const x = r.left + r.width / 2, y = r.top + r.height / 2
    const shadowHit = host.shadowRoot.elementFromPoint(x, y)
    // 최신 Chrome 은 슬롯 내용 위에서 null 을 돌려주고, 테스트용 Chrome(93) 은 호스트를 돌려준다.
    // 버전과 무관하게 null 경로를 확실히 태우기 위해 강제로 null 을 돌려주게 한다.
    const origSREFP = ShadowRoot.prototype.elementFromPoint
    ShadowRoot.prototype.elementFromPoint = function () { return null }
    const fire = type => document.body.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }))
    fire('mousemove')
    fire('click')
    document.querySelector('vis-bug').toolSelected('guides')
    fire('mousemove')
    document.querySelector('vis-bug').toolSelected('position')
    ShadowRoot.prototype.elementFromPoint = origSREFP
    return { shadowHitIsNull: shadowHit === null, selected: document.querySelectorAll('[data-selected]').length }
  })
  await page.waitForTimeout(150)

  t.deepEqual(errors, [], `no page errors expected, got: ${errors.join(' | ')}`)
  t.true(out.selected >= 1, 'clicking slotted content should still select something')
  t.log('shadowRoot.elementFromPoint returned null:', out.shadowHitIsNull)
})
