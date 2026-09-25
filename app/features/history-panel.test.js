import test from 'ava'

import { setupPptrTab, teardownPptrTab } from '../../tests/helpers'

test.beforeEach(async t => {
  await setupPptrTab(t)
})

test.afterEach(teardownPptrTab)

// sRGB relative luminance (WCAG), computed from a "rgb(r, g, b)" / "rgba(r, g, b, a)" string
function luminanceFromRgbString(rgbString) {
  const match = rgbString.match(/rgba?\(([^)]+)\)/)
  if (!match) return null
  const [r, g, b] = match[1].split(',').map(n => parseFloat(n.trim()) / 255)
  const channel = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

test.serial('Settings theme:light sets data-theme="light" on the history host with a bright panel background', async t => {
  const { page } = t.context

  const before = await page.evaluate(() => document.querySelector('visbug-history').getAttribute('data-theme'))
  t.truthy(before, 'Settings.registerPanel should set an initial data-theme')

  await page.evaluate(() => window.DesignPokeSettings.set({ theme: 'light' }))
  await page.waitForTimeout(100)

  const result = await page.evaluate(() => {
    const host = document.querySelector('visbug-history')
    const panelEl = host.$shadow.querySelector('.panel')
    const bg = getComputedStyle(panelEl).backgroundColor
    return { theme: host.getAttribute('data-theme'), bg }
  })

  t.is(result.theme, 'light')
  const luminance = luminanceFromRgbString(result.bg)
  t.truthy(luminance !== null, `should be able to parse background color: ${result.bg}`)
  t.true(luminance > 0.8, `light theme panel background should be bright (luminance ${luminance} for ${result.bg})`)

  // reset for other tests sharing this page/context
  await page.evaluate(() => window.DesignPokeSettings.set({ theme: 'dark' }))
})

test.serial('Settings opacity:0.5 is applied to the history host style.opacity', async t => {
  const { page } = t.context

  await page.evaluate(() => window.DesignPokeSettings.set({ opacity: 0.5 }))
  await page.waitForTimeout(100)

  const opacity = await page.evaluate(() => document.querySelector('visbug-history').style.opacity)
  t.is(opacity, '0.5')

  await page.evaluate(() => window.DesignPokeSettings.set({ opacity: 1 }))
})

test.serial('History panel is embedded (no drag handle, no minimize/close buttons) inside the side panel shell', async t => {
  const { page } = t.context

  const info = await page.evaluate(() => {
    const shell = document.querySelector('visbug-side-panel')
    const host = document.querySelector('visbug-history')
    return {
      insideShell: shell.contains(host),
      slot: host.getAttribute('slot'),
      hasPopoverAttr: host.hasAttribute('popover'),
      dragGrip: host.$shadow.querySelectorAll('.drag-grip').length,
      minimizeBtn: host.$shadow.querySelectorAll('.btn-minimize').length,
      closeBtn: host.$shadow.querySelectorAll('.btn-close').length,
      compareBtn: host.$shadow.querySelectorAll('.btn-compare').length,
      helpBtn: host.$shadow.querySelectorAll('.btn-help').length,
    }
  })

  t.true(info.insideShell, 'visbug-history should be a descendant of the side panel shell')
  t.is(info.slot, 'history')
  t.false(info.hasPopoverAttr, 'the embedded panel should not manage its own popover anymore')
  t.is(info.dragGrip, 0, 'no drag handle - the shell owns layout now')
  t.is(info.minimizeBtn, 0)
  t.is(info.closeBtn, 0)
  t.is(info.compareBtn, 1, '원본 보기 button should still be there')
  t.is(info.helpBtn, 1, '도움말 button should still be there')
})

test.serial('Clicking the compare (⇄) button toggles compare mode without moving anything', async t => {
  const { page } = t.context

  // switch to the 이력 tab so the panel is actually visible/interactable
  await page.evaluate(() => {
    document.querySelector('visbug-side-panel').$shadow.querySelector('.tab[data-tab="history"]').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })

  const result = await page.evaluate(() => {
    const host = document.querySelector('visbug-history')
    const btn = host.$shadow.querySelector('.btn-compare')
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    const active = btn.classList.contains('active')
    btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    document.dispatchEvent(new Event('mouseup'))
    return { active }
  })

  t.true(result.active, 'holding the compare button down should activate 원본 보기')
})
