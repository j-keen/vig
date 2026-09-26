// 요소로부터 킷 아이템 캡처 (저장은 하지 않음 - store.add() 가 담당)

import { STYLE_PROPS } from './schema'

const TOOL_ATTRS = [
  'data-selected', 'data-label-id', 'data-pseudo-select',
  'data-measuring', 'data-outward', 'contenteditable', 'spellcheck',
]

// DesignPoke 도구가 임시로 붙이는 인라인 스타일 (킷 저장 시 노이즈)
const TOOL_STYLE_PROPS = new Set([
  'cursor', 'transition', 'will-change', 'user-select', 'outline',
  '-webkit-user-select', '-moz-user-select', '-ms-user-select',
])

const MAX_HTML_LEN = 20000

function isOverlayNode(el) {
  if (!el || !el.tagName) return true
  const tag = el.tagName.toLowerCase()
  return tag === 'vis-bug' || tag.startsWith('visbug') || tag.startsWith('vis-bug')
}

function stripToolStyleText(styleText) {
  if (!styleText) return ''
  return styleText
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .filter(part => {
      const prop = part.split(':')[0].trim().toLowerCase()
      return !TOOL_STYLE_PROPS.has(prop)
    })
    .join('; ')
}

// node(및 하위 트리)를 in-place 로 정제: 도구 전용 속성/스타일 제거, visbug-* 자손 제거
function cleanNode(node) {
  if (!node || node.nodeType !== 1) return

  TOOL_ATTRS.forEach(attr => {
    if (node.hasAttribute && node.hasAttribute(attr)) node.removeAttribute(attr)
  })

  if (node.hasAttribute && node.hasAttribute('style')) {
    const cleaned = stripToolStyleText(node.getAttribute('style'))
    if (cleaned) node.setAttribute('style', cleaned)
    else node.removeAttribute('style')
  }

  if (node.querySelectorAll) {
    const overlays = Array.from(node.querySelectorAll('*')).filter(isOverlayNode)
    overlays.forEach(el => { if (el.parentNode) el.parentNode.removeChild(el) })
  }

  Array.from(node.children || []).forEach(cleanNode)
}

function buildCleanHtml(el) {
  const clone = el.cloneNode(true)
  cleanNode(clone)

  let html = clone.outerHTML || ''
  let tags = []

  if (html.length > MAX_HTML_LEN) {
    const tag = clone.tagName.toLowerCase()
    const text = (clone.textContent || '').replace(/\s+/g, ' ').trim()
    const attrs = []
    if (clone.id) attrs.push(`id="${clone.id}"`)
    if (clone.className && typeof clone.className === 'string') attrs.push(`class="${clone.className}"`)
    html = `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>${text}</${tag}>`
    tags = ['truncated']
  }

  return { html, tags }
}

function defaultName(el) {
  const tag = el.tagName.toLowerCase()
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 20)
  return text ? `${tag} "${text}"` : tag
}

// 간단한 CSS 선택자 (킷 아이템의 출처 메타데이터용, 완벽한 고유성은 필요 없음)
function simpleSelector(el) {
  if (!el) return ''
  if (el.id) return `#${el.id}`
  const tag = el.tagName.toLowerCase()
  const className = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : ''
  return className ? `${tag}.${className}` : tag
}

export function capture(el, opts = {}) {
  const { name, group = null, kind = 'auto' } = opts || {}

  const rect = el.getBoundingClientRect()
  const computed = window.getComputedStyle(el)
  const css = {}
  STYLE_PROPS.forEach(prop => { css[prop] = computed[prop] })

  const { html, tags } = buildCleanHtml(el)

  return {
    name: name || defaultName(el),
    group,
    kind: ['style', 'block', 'auto'].includes(kind) ? kind : 'auto',
    tags,
    html,
    css,
    classes: (typeof el.className === 'string' && el.className) || '',
    size: { w: rect.width, h: rect.height },
    source: {
      url: (typeof window !== 'undefined' && window.location && window.location.href) || '',
      selector: simpleSelector(el),
      file: null,
    },
  }
}

export default { capture }
