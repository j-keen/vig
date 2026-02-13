// AI-Friendly 포맷터
// 구조화된 프롬프트 템플릿으로 변경사항을 포맷
// 페이지 컨텍스트 + 원본값/변화량(delta) + 자연어 설명 포함

import { ChangeTracker } from './change-tracker'

// CSS 속성명을 kebab-case로 변환
function toKebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
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
    return `${sign}${delta}px`
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
      selector = `#${current.id}`
      parts.unshift(selector)
      break
    }

    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/)
      const meaningful = classes.find(c =>
        !['flex', 'hidden', 'block', 'relative', 'absolute', 'inline-flex'].includes(c)
      )
      if (meaningful) {
        selector += `.${meaningful}`
      }
    }

    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        el => el.tagName === current.tagName
      )
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        selector += `:nth-child(${index})`
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
  lines.push(`- 위치: ${selector}`)

  if (classList) {
    lines.push(`- 클래스: "${classList}"`)
  }

  lines.push(`- 변경 내용:`)

  Object.entries(changes).forEach(([prop, currentValue]) => {
    const originalValue = original ? original[prop] : null
    const kebab = toKebabCase(prop)
    const delta = formatDelta(originalValue, currentValue)
    const description = describeChange(prop, originalValue, currentValue)

    if (originalValue !== null && originalValue !== undefined) {
      const deltaStr = delta ? ` (${delta}, ${description})` : ` (${description})`
      lines.push(`  - ${kebab}: ${originalValue} → ${currentValue}${deltaStr}`)
    } else {
      lines.push(`  - ${kebab}: ${currentValue} (${description})`)
    }
  })

  return lines.join('\n')
}

// 삭제된 요소를 구조화된 형식으로 포맷
export function formatDeletedForAI(deleted, index) {
  const lines = []
  const num = index !== undefined ? `### ${index}. ` : '### '
  lines.push(`${num}${deleted.identifier} 삭제`)
  lines.push(`- 해당 요소를 완전히 제거해주세요.`)

  return lines.join('\n')
}

// 모든 변경사항을 구조화된 AI 프롬프트로 변환
export function formatAllForAI() {
  const allChanges = ChangeTracker.getAllChanges()
  const deletedElements = ChangeTracker.getDeletedElements()

  if (allChanges.size === 0 && deletedElements.length === 0) {
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

  // 변경사항
  sections.push('## 변경사항')
  sections.push('')

  let itemIndex = 1

  allChanges.forEach((changes, element) => {
    sections.push(formatElementForAI(element, changes, itemIndex++))
    sections.push('')
  })

  deletedElements.forEach(deleted => {
    sections.push(formatDeletedForAI(deleted, itemIndex++))
    sections.push('')
  })

  // 마무리 지시
  sections.push('위 변경사항을 해당 컴포넌트 파일에서 수정해주세요.')

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
}

export default AIFormatter
