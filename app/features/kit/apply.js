// 킷 아이템을 대상 요소에 미리보기/적용

import { STYLE_PROPS } from './schema'
import { ChangeTracker } from '../change-tracker'

const BLOCKISH_TAGS = new Set([
  'div', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside',
  'ul', 'ol', 'li', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'form', 'table', 'figure', 'blockquote',
])

function isOverlayNode(el) {
  if (!el || !el.tagName) return true
  const tag = el.tagName.toLowerCase()
  return tag === 'vis-bug' || tag.startsWith('visbug') || tag.startsWith('vis-bug')
}

function countBlockChildren(el) {
  if (!el || !el.children) return 0
  let count = 0
  Array.from(el.children).forEach(child => {
    if (isOverlayNode(child)) return
    let display = 'block'
    try {
      display = window.getComputedStyle(child).display
    } catch (e) { /* ignore */ }
    if (display && display !== 'inline' && display !== 'none') count++
  })
  return count
}

function countBlockChildrenInHtml(html) {
  if (!html) return 0
  const wrapper = document.createElement('div')
  wrapper.innerHTML = html
  const root = wrapper.firstElementChild
  if (!root) return 0
  return Array.from(root.children).filter(child => BLOCKISH_TAGS.has(child.tagName.toLowerCase())).length
}

// 'style' 로 적용할지 'block' 으로 적용할지 판단
export function autoMode(target, item) {
  if (item && item.kind === 'style') return 'style'
  if (item && item.kind === 'block') return 'block'

  const rect = target.getBoundingClientRect()
  const area = rect.width * rect.height
  const blockChildren = countBlockChildren(target)

  const isLeafish = blockChildren === 0 || area < 40000
  if (isLeafish) return 'style'

  if (blockChildren >= 2 && countBlockChildrenInHtml(item && item.html) >= 2) return 'block'

  return 'style'
}

function parseHtmlToElement(html) {
  if (!html) return null
  const wrapper = document.createElement('div')
  wrapper.innerHTML = html
  return wrapper.firstElementChild
}

// selector 에 해당하는 요소를 찾되, root 자신도 포함 (root 가 selector 에 매치될 수 있으므로)
function queryAllIncludingSelf(root, selector) {
  const result = []
  if (!root) return result
  if (root.matches && root.matches(selector)) result.push(root)
  if (root.querySelectorAll) result.push(...Array.from(root.querySelectorAll(selector)))
  return result
}

// target 의 실제 콘텐츠(제목/본문/링크/이미지)를 clone 으로 이식
function transplantContent(clone, target) {
  if (isOverlayNode(target) || isOverlayNode(clone)) return

  // 1) 헤딩
  const targetHeadings = queryAllIncludingSelf(target, 'h1,h2,h3,h4,h5,h6')
  const cloneHeadings = queryAllIncludingSelf(clone, 'h1,h2,h3,h4,h5,h6')
  if (targetHeadings[0] && cloneHeadings[0]) {
    cloneHeadings[0].textContent = targetHeadings[0].textContent
  }

  // 2) 첫 번째 문단/본문 텍스트
  const targetParagraphs = queryAllIncludingSelf(target, 'p')
  const cloneParagraphs = queryAllIncludingSelf(clone, 'p')
  if (targetParagraphs[0] && cloneParagraphs[0]) {
    cloneParagraphs[0].textContent = targetParagraphs[0].textContent
  }

  // 3) a/button 텍스트 + href (순서대로 매칭)
  const targetLinks = queryAllIncludingSelf(target, 'a, button')
  const cloneLinks = queryAllIncludingSelf(clone, 'a, button')
  targetLinks.forEach((tEl, i) => {
    const cEl = cloneLinks[i]
    if (!cEl) return
    const text = tEl.textContent && tEl.textContent.trim()
    if (text) cEl.textContent = tEl.textContent
    if (cEl.tagName.toLowerCase() === 'a') {
      const href = tEl.getAttribute && tEl.getAttribute('href')
      if (href) cEl.setAttribute('href', href)
    }
  })

  // 4) 이미지 src/alt (순서대로 매칭)
  const targetImgs = queryAllIncludingSelf(target, 'img')
  const cloneImgs = queryAllIncludingSelf(clone, 'img')
  targetImgs.forEach((tImg, i) => {
    const cImg = cloneImgs[i]
    if (!cImg) return
    const src = tImg.getAttribute('src')
    if (src) cImg.setAttribute('src', src)
    if (tImg.hasAttribute('alt')) cImg.setAttribute('alt', tImg.getAttribute('alt'))
  })
}

// 킷 아이템의 html 을 파싱하고, target 의 실제 콘텐츠를 이식한 교체용 엘리먼트를 만든다
export function buildReplacement(item, target) {
  const clone = parseHtmlToElement(item && item.html)
  if (!clone) return target.cloneNode(true)

  if (target && target.id) clone.id = target.id

  transplantContent(clone, target)

  return clone
}

// 미리보기: 추적하지 않음, 완전히 되돌릴 수 있어야 함. 선택 상태를 건드리지 않는다.
export function preview(target, item, mode) {
  if (mode === 'style') {
    const oldInline = {}
    STYLE_PROPS.forEach(prop => { oldInline[prop] = target.style[prop] || '' })
    STYLE_PROPS.forEach(prop => { target.style[prop] = (item.css && item.css[prop]) || '' })

    return {
      revert() {
        STYLE_PROPS.forEach(prop => { target.style[prop] = oldInline[prop] })
      },
    }
  }

  // block 모드
  const parent = target.parentNode
  if (!parent) return { revert() {} }

  const newEl = buildReplacement(item, target)
  parent.replaceChild(newEl, target)

  return {
    revert() {
      if (newEl.parentNode) newEl.parentNode.replaceChild(target, newEl)
    },
  }
}

// 적용: 추적함 (undo/redo, AI 프롬프트에 반영)
export function apply(target, item, mode) {
  if (mode === 'style') {
    ChangeTracker.captureOriginal(target)
    STYLE_PROPS.forEach(prop => { target.style[prop] = (item.css && item.css[prop]) || '' })
    ChangeTracker.updateCurrent(target)
    ChangeTracker.pushToUndoStack(target)
    ChangeTracker.setKitRef(target, { itemId: item.id, itemName: item.name, mode: 'style' })
    return { element: target, mode: 'style' }
  }

  const newEl = buildReplacement(item, target)
  ChangeTracker.trackKitSwap({ oldEl: target, newEl, item, mode: 'block' })
  target.replaceWith(newEl)
  return { element: newEl, mode: 'block' }
}

export default { autoMode, preview, apply, buildReplacement }
