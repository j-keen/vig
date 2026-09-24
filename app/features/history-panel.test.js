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

test.serial('Dragging the history panel header 120px down moves the panel and persists positions.history', async t => {
  const { page } = t.context

  const before = await page.evaluate(() => {
    const host = document.querySelector('visbug-history')
    const r = host.getBoundingClientRect()
    // Grab the drag-grip specifically (not the header's overall center, which can
    // overlap the button row) - it is a plain <span>, never an interactive element.
    const grip = host.$shadow.querySelector('.drag-grip')
    const gr = grip.getBoundingClientRect()
    return { left: r.left, top: r.top, headerX: gr.left + gr.width / 2, headerY: gr.top + gr.height / 2 }
  })

  await page.mouse.move(before.headerX, before.headerY)
  await page.mouse.down()
  await page.mouse.move(before.headerX, before.headerY + 120, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(150)

  const after = await page.evaluate(() => {
    const host = document.querySelector('visbug-history')
    const r = host.getBoundingClientRect()
    return { left: r.left, top: r.top }
  })

  t.true(Math.abs((after.top - before.top) - 120) < 5,
    `top should have increased by ~120px (actual delta ${after.top - before.top})`)

  const savedPosition = await page.evaluate(() => window.DesignPokeSettings.get().positions.history)
  t.truthy(savedPosition, 'dragging should persist a saved position for the history panel')
  t.true(Math.abs(savedPosition.top - after.top) < 5, 'saved position should match the dragged-to location')
})

test.serial('Header buttons keep working after dock/drag wiring (compare button does not start a drag)', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    const host = document.querySelector('visbug-history')
    const hostRect = host.getBoundingClientRect()
    const btn = host.$shadow.querySelector('.btn-compare')
    const rect = btn.getBoundingClientRect()
    return {
      beforeTop: hostRect.top,
      btnX: rect.left + rect.width / 2,
      btnY: rect.top + rect.height / 2,
    }
  })

  await page.mouse.move(result.btnX, result.btnY)
  await page.mouse.down()
  await page.mouse.move(result.btnX + 50, result.btnY + 50, { steps: 5 })
  await page.mouse.up()
  await page.waitForTimeout(100)

  const after = await page.evaluate(() => document.querySelector('visbug-history').getBoundingClientRect().top)
  t.true(Math.abs(after - result.beforeTop) < 5, 'clicking/dragging from a header button must not move the panel')
})
