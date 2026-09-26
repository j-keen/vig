// AI-Friendly 포맷터
// 구조화된 프롬프트 템플릿으로 변경사항을 포맷
// 페이지 컨텍스트 + 원본값/변화량(delta) + 자연어 설명 포함

import { ChangeTracker, trackedProperties, formatTrackedValue } from './change-tracker'
import { Kit } from './kit'

// CSS 속성명을 kebab-case로 변환
function toKebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

function formatCssNumber(n, digits = 3) {
  const rounded = Math.round(n * Math.pow(10, digits)) / Math.pow(10, digits)
  return Object.is(rounded, -0) ? '0' : String(rounded)
}

function formatPx(n) {
  return `${formatCssNumber(n, 2)}px`
}

function readMatrix2D(value) {
  if (!value || value === 'none') return null
  const str = String(value)

  if (typeof DOMMatrix === 'function') {
    try {
      const m = new DOMMatrix(str)
      return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f }
    } catch (err) {
      // fall through to regex
    }
  }

  const match = str.match(/^matrix\(\s*([^)]+)\)/i)
  if (!match) return null
  const nums = match[1].split(',').map(part => parseFloat(part.trim()))
  if (nums.length < 6 || nums.some(v => Number.isNaN(v))) return null
  return { a: nums[0], b: nums[1], c: nums[2], d: nums[3], e: nums[4], f: nums[5] }
}

export function formatTransformValue(value) {
  if (value == null || value === '') return value
  if (value === 'none') return 'none'

  const m = readMatrix2D(value)
  if (!m) return value

  const eps = 0.005
  const hasRotateOrSkew = Math.abs(m.b) > eps || Math.abs(m.c) > eps
  if (hasRotateOrSkew) return value

  const parts = []
  if (Math.abs(m.e) > eps || Math.abs(m.f) > eps) {
    parts.push(`translate(${formatPx(m.e)}, ${formatPx(m.f)})`)
  }

  const hasScale = Math.abs(m.a - 1) > eps || Math.abs(m.d - 1) > eps
  if (hasScale) {
    if (Math.abs(m.a - m.d) <= eps) {
      parts.push(`scale(${formatCssNumber(m.a)})`)
    } else {
      parts.push(`scale(${formatCssNumber(m.a)}, ${formatCssNumber(m.d)})`)
    }
  }

  return parts.length ? parts.join(' ') : 'none'
}

export function transformHasScale(value) {
  if (!value || value === 'none') return false
  if (/\bscale\(/i.test(String(value))) return true

  const m = readMatrix2D(value)
  if (!m) return false
  const scaleX = Math.hypot(m.a, m.b)
  const scaleY = Math.hypot(m.c, m.d)
  return Math.abs(scaleX - 1) > 0.01 || Math.abs(scaleY - 1) > 0.01
}

function cssEscape(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }
  return String(value).replace(/([\0-\x2c./:-@[-^`{-])/g, '\\$1')
}

const UTILITY_EXACT = new Set([
  'flex', 'inline-flex', 'grid', 'inline-grid',
  'hidden', 'block', 'inline', 'inline-block',
  'relative', 'absolute', 'fixed', 'sticky', 'static',
])

const UTILITY_PATTERNS = [
  /^(p|px|py|pt|pr|pb|pl)-/,
  /^-?(m|mx|my|mt|mr|mb|ml)-/,
  /^(w|h)-/,
  /^text-/,
  /^bg-/,
  /^items-/,
  /^justify-/,
  /^gap-/,
  /^rounded/,
  /^border/,
]

export function isUtilityClass(name) {
  if (!name) return true
  const base = name.includes(':') ? name.split(':').pop() : name
  if (UTILITY_EXACT.has(base)) return true
  return UTILITY_PATTERNS.some(pattern => pattern.test(base))
}

// 드래그/선택 중 도구가 임시로 붙이는 인라인 스타일 (AI에게 전달할 스니펫에서는 노이즈)
const TOOL_ONLY_STYLE_PROPS = new Set([
  'cursor', 'transition', 'will-change', 'user-select', 'outline',
  '-webkit-user-select', '-moz-user-select', '-ms-user-select',
])

// "prop: value; prop2: value2" 형태의 인라인 style 문자열에서 도구 전용 속성만 제거
function stripToolOnlyStyleText(styleText) {
  if (!styleText) return ''
  const kept = styleText
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .filter(part => {
      const prop = part.split(':')[0].trim().toLowerCase()
      return !TOOL_ONLY_STYLE_PROPS.has(prop)
    })
  return kept.join('; ')
}

// element(및 하위 트리)의 style 속성에서 도구 전용 인라인 스타일을 제거 (in-place)
function stripToolOnlyStyles(node) {
  if (!node || node.nodeType !== 1) return
  if (typeof node.getAttribute === 'function' && node.hasAttribute && node.hasAttribute('style')) {
    const cleaned = stripToolOnlyStyleText(node.getAttribute('style'))
    if (cleaned) node.setAttribute('style', cleaned)
    else node.removeAttribute('style')
  }
  const children = node.children ? Array.from(node.children) : []
  children.forEach(stripToolOnlyStyles)
}

function collapseChildText(node) {
  if (!node) return
  const textType = (typeof Node !== 'undefined' && Node.TEXT_NODE) || 3
  if (node.nodeType === textType) {
    const t = String(node.textContent || '').replace(/\s+/g, ' ').trim()
    node.textContent = t.length > 24 ? t.slice(0, 24) + '...' : t
    return
  }
  const kids = node.childNodes ? Array.from(node.childNodes) : []
  kids.forEach(collapseChildText)
}

export function getOuterHTMLSnippet(element, maxLen = 200) {
  if (!element) return ''
  const clone = element.cloneNode ? element.cloneNode(true) : element
  if (clone && clone.removeAttribute) {
    clone.removeAttribute('data-selected')
    clone.removeAttribute('data-label-id')
    clone.removeAttribute('data-pseudo-select')
  }
  stripToolOnlyStyles(clone)
  collapseChildText(clone)
  let html = (clone && clone.outerHTML) || element.outerHTML || ''
  if (html.length > maxLen) html = html.slice(0, maxLen) + '...'
  return html
}

function getParentLayout(element) {
  const parent = element && element.parentElement
  if (!parent || typeof window === 'undefined' || !window.getComputedStyle) return null
  const cs = window.getComputedStyle(parent)
  const display = cs.display || 'block'
  if (display === 'flex' || display === 'inline-flex') {
    return `display: ${display}; flex-direction: ${cs.flexDirection || 'row'}`
  }
  return `display: ${display}`
}

function getFinalInlineStyles(element) {
  if (!element || !element.style) return null
  const parts = []
  trackedProperties.forEach(prop => {
    const kebab = toKebabCase(prop)
    if (TOOL_ONLY_STYLE_PROPS.has(kebab)) return
    const raw = element.style[prop]
    if (!raw) return
    const value = prop === 'transform' ? formatTransformValue(raw) : formatTrackedValue(prop, raw)
    parts.push(`${kebab}: ${value}`)
  })
  return parts.length ? parts.join('; ') : null
}

// 속성별 자연어 설명 매핑
const propertyDescriptions = {
  marginTop:     { increase: '아래로 이동', decrease: '위로 이동' },
  marginBottom:  { increase: '아래쪽 바깥 여백 증가', decrease: '아래쪽 바깥 여백 감소' },
  marginLeft:    { increase: '오른쪽으로 이동', decrease: '왼쪽으로 이동' },
  marginRight:   { increase: '오른쪽 바깥 여백 증가', decrease: '오른쪽 바깥 여백 감소' },
  paddingTop:    { increase: '위쪽 안쪽 여백 증가', decrease: '위쪽 안쪽 여백 감소' },
  paddingBottom: { increase: '아래쪽 안쪽 여백 증가', decrease: '아래쪽 안쪽 여백 감소' },
  paddingLeft:   { increase: '왼쪽 안쪽 여백 증가', decrease: '왼쪽 안쪽 여백 감소' },
  paddingRight:  { increase: '오른쪽 안쪽 여백 증가', decrease: '오른쪽 안쪽 여백 감소' },
  width:         { increase: '가로 크기 증가', decrease: '가로 크기 감소' },
  height:        { increase: '세로 크기 증가', decrease: '세로 크기 감소' },
  top:           { increase: '아래로 이동', decrease: '위로 이동' },
  bottom:        { increase: '위로 이동', decrease: '아래로 이동' },
  left:          { increase: '오른쪽으로 이동', decrease: '왼쪽으로 이동' },
  right:         { increase: '왼쪽으로 이동', decrease: '오른쪽으로 이동' },
  position:      { set: '포지션 변경' },
  transform:     { set: '변형(transform) 변경' },
  flexGrow:      { increase: 'flex-grow 증가', decrease: 'flex-grow 감소' },
  flexShrink:    { increase: 'flex-shrink 증가', decrease: 'flex-shrink 감소' },
  flexBasis:     { set: 'flex-basis 변경' },
  minWidth:      { set: '최소 가로 크기 변경' },
  maxWidth:      { set: '최대 가로 크기 변경' },
  minHeight:     { set: '최소 세로 크기 변경' },
  maxHeight:     { set: '최대 세로 크기 변경' },
  transformOrigin: { set: 'transform-origin 변경' },
  color:           { set: '글자색 변경' },
  backgroundColor: { set: '배경색 변경' },
  borderColor:     { set: '테두리색 변경' },
  fontSize:        { increase: '글자 크기 증가', decrease: '글자 크기 감소' },
  fontWeight:      { set: '글자 굵기 변경' },
  lineHeight:      { increase: '줄간격 증가', decrease: '줄간격 감소' },
  letterSpacing:   { increase: '자간 증가', decrease: '자간 감소' },
  textAlign:       { set: '정렬 변경' },
  borderRadius:    { set: '모서리 둥글기 변경' },
  opacity:         { increase: '불투명도 증가', decrease: '불투명도 감소' },
  display:         { set: 'display 변경' },
  flexDirection:   { set: 'flex 방향 변경' },
  justifyContent:  { set: '가로 정렬 변경' },
  alignItems:      { set: '세로 정렬 변경' },
  gap:             { increase: '간격 증가', decrease: '간격 감소' },
}

function truncateTrackedText(value, max = 60) {
  const text = value == null ? '' : String(value).replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  return text.slice(0, max) + '...'
}

// px 값에서 숫자 추출
function parseNumericValue(value) {
  if (!value || value === 'auto' || value === 'none') return null
  const match = String(value).match(/^(-?[\d.]+)/)
  return match ? parseFloat(match[1]) : null
}

// 변화량(delta) 문자열 생성
function formatDelta(originalValue, currentValue) {
  const origNum = parseNumericValue(originalValue)
  const currNum = parseNumericValue(currentValue)

  if (origNum !== null && currNum !== null) {
    const delta = currNum - origNum
    const sign = delta >= 0 ? '+' : ''
    // Round to 2 decimal places and remove trailing zeros
    const roundedDelta = Math.round(delta * 100) / 100
    const formatted = roundedDelta % 1 === 0 ? roundedDelta.toFixed(0) : roundedDelta.toString()
    return `${sign}${formatted}px`
  }
  return null
}

// 속성 변경에 대한 자연어 설명 생성
function describeChange(prop, originalValue, currentValue) {
  const desc = propertyDescriptions[prop]
  if (!desc) return `${toKebabCase(prop)} 변경`

  // set 타입 (숫자 비교 불가능한 속성)
  if (desc.set) return desc.set

  const origNum = parseNumericValue(originalValue)
  const currNum = parseNumericValue(currentValue)

  if (origNum !== null && currNum !== null) {
    return currNum > origNum ? desc.increase : desc.decrease
  }

  return desc.set || `${toKebabCase(prop)} 변경`
}

// 요소의 아이콘 클래스 추출 (lucide-*, heroicons-* 등)
function getIconClass(element) {
  const svg = element.querySelector('svg')
  if (!svg) return null

  const cls = svg.className?.baseVal || svg.getAttribute('class') || ''

  const patterns = [
    /lucide-[\w-]+/,
    /heroicons?-[\w-]+/,
    /fa-[\w-]+/,
    /icon-[\w-]+/,
    /bi-[\w-]+/,
    /ri-[\w-]+/,
  ]

  for (const pattern of patterns) {
    const match = cls.match(pattern)
    if (match) return match[0]
  }

  const lucideIcon = element.querySelector('[class*="lucide-"]')
  if (lucideIcon) {
    const iconCls = lucideIcon.getAttribute('class') || ''
    const match = iconCls.match(/lucide-[\w-]+/)
    if (match) return match[0]
  }

  return null
}

// 요소의 텍스트 내용 추출 (최대 20자)
function getTextContent(element) {
  const clone = element.cloneNode(true)
  clone.querySelectorAll('script, style, svg').forEach(el => el.remove())

  const text = clone.textContent?.trim()
  if (!text) return null

  return text.length > 20 ? text.slice(0, 20) + '...' : text
}

// 고유 CSS 선택자 경로 생성
export function getCSSSelector(element) {
  const parts = []
  let current = element

  while (current && current !== document.body && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase()

    if (current.id) {
      selector = `#${cssEscape(current.id)}`
      parts.unshift(selector)
      break
    }

    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(Boolean)
      const meaningful = classes.find(c => !isUtilityClass(c))
      if (meaningful) {
        selector += `.${cssEscape(meaningful)}`
      }
    }

    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        el => el.tagName === current.tagName
      )
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        selector += `:nth-of-type(${index})`
      }
    }

    parts.unshift(selector)
    current = current.parentElement
  }

  return parts.join(' > ')
}

// 요소 식별자 생성 (우선순위: id > 텍스트 > 아이콘 > data-testid > 태그.클래스)
export function getIdentifier(element) {
  if (element.id) {
    return `#${element.id}`
  }

  const tag = element.tagName.toLowerCase()

  const text = getTextContent(element)
  const icon = getIconClass(element)

  if (text) {
    return icon
      ? `"${text}" ${tag} (${icon})`
      : `"${text}" ${tag}`
  }

  if (icon) {
    return `${tag} (${icon})`
  }

  const testId = element.dataset?.testid || element.getAttribute('data-testid')
  if (testId) {
    return `[data-testid="${testId}"]`
  }

  const labelId = element.dataset?.labelId || element.getAttribute('data-label-id')
  if (labelId) {
    return `[data-label-id="${labelId}"]`
  }

  const className = element.className
  if (typeof className === 'string' && className.trim()) {
    const firstClass = className.trim().split(/\s+/)[0]
    const utilityPatterns = ['inline-flex', 'flex', 'hidden', 'block', 'relative', 'absolute']
    if (!utilityPatterns.includes(firstClass)) {
      return `${tag}.${firstClass}`
    }
  }

  return tag
}

// 요소의 클래스 목록 (유틸리티 클래스 포함)
function getClassList(element) {
  const className = element.className
  if (typeof className === 'string' && className.trim()) {
    return className.trim()
  }
  return null
}

// 페이지 컨텍스트 생성
function getPageContext() {
  const url = window.location.href
  const pathname = window.location.pathname
  const title = document.title || ''
  const viewport = `${window.innerWidth}x${window.innerHeight}`

  const lines = []
  lines.push(`- 페이지: ${title ? title + ' ' : ''}(경로: ${pathname})`)
  if (pathname !== url && !url.startsWith('about:')) {
    lines.push(`- URL: ${url}`)
  }
  lines.push(`- 뷰포트: ${viewport}`)

  return lines.join('\n')
}

// 단일 요소의 변경사항을 구조화된 형식으로 포맷
export function formatElementForAI(element, changes, index) {
  const identifier = getIdentifier(element)
  const selector = getCSSSelector(element)
  const classList = getClassList(element)
  const original = ChangeTracker.getOriginalStyles(element)

  const lines = []
  const num = index !== undefined ? `### ${index}. ` : '### '
  lines.push(`${num}${identifier} 수정`)

  if (changes && changes._note) {
    lines.push(`- 요청: "${changes._note}"`)
  }

  lines.push(`- 위치: ${selector}`)

  if (classList) {
    lines.push(`- 클래스: "${classList}"`)
  }

  const parentLayout = getParentLayout(element)
  if (parentLayout) {
    lines.push(`- 부모: ${parentLayout}`)
  }

  const snippet = getOuterHTMLSnippet(element)
  if (snippet) {
    lines.push(`- HTML: ${snippet}`)
  }

  if (changes && changes._kit) {
    const kit = changes._kit
    const modeLabel = kit.mode === 'block' ? '통째로 교체' : '모양만'
    lines.push(`- 킷 적용: "${kit.itemName}" (${modeLabel})`)

    if (kit.mode === 'block') {
      const originalHTML = kit.originalHTML || ''
      const trimmedOriginal = originalHTML.length > 600 ? originalHTML.slice(0, 600) + '...' : originalHTML
      lines.push(`- 원래 HTML: ${trimmedOriginal}`)
      lines.push(`- 새 HTML: ${getOuterHTMLSnippet(element, 600)}`)
    }

    const kitItem = Kit.get(kit.itemId)
    const cssEntries = kitItem && kitItem.css
      ? Object.entries(kitItem.css).filter(([, v]) => v != null && String(v).trim() !== '')
      : []
    lines.push(`- 킷 CSS: ${cssEntries.map(([prop, value]) => `${toKebabCase(prop)}: ${value}`).join('; ')}`)
  }

  if (changes._text) {
    const from = truncateTrackedText(changes._text.original)
    const to = truncateTrackedText(changes._text.current)
    lines.push(`- 텍스트: "${from}" → "${to}"`)
  }

  const styleEntries = Object.entries(changes).filter(([prop]) => prop !== '_text' && prop !== '_note' && prop !== '_kit')
  if (styleEntries.length) {
    lines.push(`- 변경 내용:`)
  }

  const positionProps = ['left', 'top', 'right', 'bottom']
  const hasPositionChange = 'position' in changes
  const currentTransform = changes.transform != null
    ? changes.transform
    : (original && original.transform)

  styleEntries.forEach(([prop, currentValue]) => {
    const originalValue = original ? original[prop] : null

    // Only emit properties actually written on element.style (skip computed-only sides)
    if (!element.style || !element.style[prop]) {
      return
    }

    // Skip implicit auto→0px changes when position is changed
    if (hasPositionChange &&
        positionProps.includes(prop) &&
        originalValue === 'auto' &&
        currentValue === '0px') {
      return
    }

    if (prop === 'transformOrigin' && !transformHasScale(currentTransform)) {
      return
    }

    let displayOriginal = formatTrackedValue(prop, originalValue)
    let displayCurrent = formatTrackedValue(prop, currentValue)
    if (prop === 'transform') {
      displayOriginal = formatTransformValue(originalValue)
      displayCurrent = formatTransformValue(currentValue)
      if (displayOriginal === displayCurrent) return
    }

    const kebab = toKebabCase(prop)
    const delta = formatDelta(originalValue, currentValue)
    const description = describeChange(prop, originalValue, currentValue)

    if (originalValue !== null && originalValue !== undefined) {
      const deltaStr = delta ? ` (${delta}, ${description})` : ` (${description})`
      lines.push(`  - ${kebab}: ${displayOriginal} → ${displayCurrent}${deltaStr}`)
    } else {
      lines.push(`  - ${kebab}: ${displayCurrent} (${description})`)
    }
  })

  const finalInline = getFinalInlineStyles(element)
  if (finalInline) {
    lines.push(`- 최종 인라인 스타일: ${finalInline}`)
  }

  return lines.join('\n')
}

// 삭제된 요소를 구조화된 형식으로 포맷
export function formatDeletedForAI(deleted, index) {
  const lines = []
  const num = index !== undefined ? `### ${index}. ` : '### '
  lines.push(`${num}${deleted.identifier} 삭제`)
  lines.push(`- 해당 요소를 완전히 제거해주세요.`)

  const snippet = deleted.outerHTML || getOuterHTMLSnippet(deleted.clonedNode)
  if (snippet) {
    lines.push(`- HTML: ${snippet}`)
  }

  return lines.join('\n')
}

// 모든 변경사항을 구조화된 AI 프롬프트로 변환
// AI 프롬프트/스크린샷 주석에서 공유하는 변경 요소 순서 (element -> 1..N)
// formatAllForAI의 번호 매김과 항상 동일한 순서를 유지한다
export function getOrderedChangeEntries() {
  const allChanges = ChangeTracker.getAllChanges()
  const entries = []
  let idx = 1
  allChanges.forEach((changes, element) => {
    entries.push({ element, changes, index: idx++ })
  })
  return entries
}

export function formatAllForAI() {
  const orderedEntries = getOrderedChangeEntries()
  const deletedElements = ChangeTracker.getDeletedElements()
  const pageNote = ChangeTracker.getPageNote()

  if (orderedEntries.length === 0 && deletedElements.length === 0 && !pageNote) {
    return ''
  }

  const sections = []

  // 헤더
  sections.push('다음 웹페이지의 UI를 수정해주세요.')
  sections.push('')

  // 페이지 컨텍스트
  sections.push('## 컨텍스트')
  sections.push(getPageContext())
  sections.push('')

  // 전체 페이지 요청 (있을 때만)
  if (pageNote) {
    sections.push('## 요청')
    sections.push(pageNote)
    sections.push('')
  }

  // 변경사항
  sections.push('## 변경사항')
  sections.push('')

  orderedEntries.forEach(({ element, changes, index }) => {
    sections.push(formatElementForAI(element, changes, index))
    sections.push('')
  })

  let itemIndex = orderedEntries.length + 1

  deletedElements.forEach(deleted => {
    sections.push(formatDeletedForAI(deleted, itemIndex++))
    sections.push('')
  })

  // 마무리 지시
  sections.push('위 변경사항을 해당 컴포넌트 파일에서 수정해주세요.')
  sections.push('픽셀값을 그대로 쓰지 말고 프로젝트의 스타일 시스템(Tailwind 클래스, 디자인 토큰 등)에 맞게 변환하고, position:relative + left/top 오프셋은 의도(여백/정렬 변경)로 해석해 반영해주세요.')

  return sections.join('\n')
}

// 클립보드에 복사
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()

    try {
      document.execCommand('copy')
      return true
    } catch (e) {
      console.error('복사 실패:', e)
      return false
    } finally {
      document.body.removeChild(textarea)
    }
  }
}

// ID로 단일 요소의 변경사항을 포맷
export function formatSingleForAI(elementId) {
  const allChanges = ChangeTracker.getAllChanges()
  for (const [element, changes] of allChanges) {
    if (ChangeTracker.getElementId(element) === elementId) {
      return formatElementForAI(element, changes)
    }
  }
  return null
}

// 모든 변경사항을 클립보드에 복사
export async function copyAllChangesForAI() {
  const formatted = formatAllForAI()
  if (!formatted) {
    return { success: false, message: '변경사항이 없습니다', count: 0 }
  }

  const success = await copyToClipboard(formatted)
  const count = ChangeTracker.getTrackedCount()

  return {
    success,
    message: success ? `${count}개 요소의 변경사항이 복사되었습니다` : '복사에 실패했습니다',
    count,
    content: formatted
  }
}

export const AIFormatter = {
  getIdentifier,
  getCSSSelector,
  formatElementForAI,
  formatDeletedForAI,
  formatSingleForAI,
  formatAllForAI,
  copyToClipboard,
  copyAllChangesForAI,
  formatTransformValue,
  transformHasScale,
  isUtilityClass,
  getOuterHTMLSnippet,
  getOrderedChangeEntries,
}

if (typeof window !== 'undefined') {
  window.AIFormatter = AIFormatter
}

export default AIFormatter
