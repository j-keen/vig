// 페이지 색상/글꼴 수집 유틸 (Canva 스타일 미니 툴바 + 팔레트용)
// Walks the live DOM to build a small "page palette" of colors and fonts
// actually in use, so pickers can suggest values already on the page.

import { TinyColor } from '@ctrl/tinycolor'

const CACHE_MS = 3000
const MAX_COLORS = 16

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'LINK', 'META', 'TEMPLATE', 'NOSCRIPT', 'TITLE', 'HEAD',
])

let colorCache = { time: 0, value: [] }
let fontCache = { time: 0, value: [] }

function isVisBugNode(el) {
  if (!el || !el.tagName) return true
  const tag = el.tagName.toLowerCase()
  return tag === 'vis-bug' || tag.startsWith('visbug')
}

function shouldSkip(el) {
  return isVisBugNode(el) || SKIP_TAGS.has(el.tagName)
}

// computed color string -> "#rrggbb", or null when transparent/invalid
function toHex(value) {
  if (!value) return null
  try {
    const c = new TinyColor(value)
    if (!c.isValid) return null
    if (c.getAlpha() === 0) return null
    return `#${c.toHex()}`
  } catch (e) {
    return null
  }
}

function hasVisibleBorder(style) {
  return style.borderStyle !== 'none' && parseFloat(style.borderWidth) > 0
}

export function collectPageColors({ force = false } = {}) {
  const now = Date.now()
  if (!force && colorCache.value.length && now - colorCache.time < CACHE_MS)
    return colorCache.value

  const counts = new Map()
  const nodes = document.querySelectorAll('body *')

  nodes.forEach(el => {
    if (shouldSkip(el)) return

    const style = window.getComputedStyle(el)

    const fg = toHex(style.color)
    if (fg) counts.set(fg, (counts.get(fg) || 0) + 1)

    const bg = toHex(style.backgroundColor)
    if (bg) counts.set(bg, (counts.get(bg) || 0) + 1)

    if (hasVisibleBorder(style)) {
      const bo = toHex(style.borderColor)
      if (bo) counts.set(bo, (counts.get(bo) || 0) + 1)
    }
  })

  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_COLORS)
    .map(([hex]) => hex)

  colorCache = { time: now, value: sorted }
  return sorted
}

export function collectPageFonts({ force = false } = {}) {
  const now = Date.now()
  if (!force && fontCache.value.length && now - fontCache.time < CACHE_MS)
    return fontCache.value

  const fonts = new Set()
  const nodes = document.querySelectorAll('body *')

  nodes.forEach(el => {
    if (shouldSkip(el)) return

    const family = window.getComputedStyle(el).fontFamily
    if (!family) return

    const first = family.split(',')[0].trim().replace(/^['"]|['"]$/g, '')
    if (first) fonts.add(first)
  })

  const result = [...fonts]
  fontCache = { time: now, value: result }
  return result
}

export function clearPaletteCache() {
  colorCache = { time: 0, value: [] }
  fontCache = { time: 0, value: [] }
}

// Expose to window for E2E testing
if (typeof window !== 'undefined') {
  window.DesignPokePalette = { collectPageColors, collectPageFonts }
}
