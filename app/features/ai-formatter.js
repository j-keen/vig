// AI-Friendly 포맷터
// Formats changes for AI consumption with minimal context

import { ChangeTracker } from './change-tracker'

// CSS 속성명을 kebab-case로 변환
function toKebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

// 요소의 아이콘 클래스 추출 (lucide-*, heroicons-* 등)
function getIconClass(element) {
  const svg = element.querySelector('svg')
  if (!svg) return null

  // Check svg class
  const cls = svg.className?.baseVal || svg.getAttribute('class') || ''

  // Common icon library patterns
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

  // Check for lucide class in nested elements
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
  // Clone to avoid modifying original
  const clone = element.cloneNode(true)

  // Remove script, style, svg elements for clean text
  clone.querySelectorAll('script, style, svg').forEach(el => el.remove())

  const text = clone.textContent?.trim()
  if (!text) return null

  // Truncate if too long
  return text.length > 20 ? text.slice(0, 20) + '...' : text
}

// 요소 식별자 생성 (우선순위: id > 텍스트 > 아이콘 > data-testid > 태그.클래스)
export function getIdentifier(element) {
  // 1. id 우선
  if (element.id) {
    return `#${element.id}`
  }

  const tag = element.tagName.toLowerCase()

  // 2. 텍스트 내용 + 아이콘
  const text = getTextContent(element)
  const icon = getIconClass(element)

  if (text) {
    return icon
      ? `"${text}" ${tag} (${icon})`
      : `"${text}" ${tag}`
  }

  // 3. 아이콘만 있는 경우
  if (icon) {
    return `${tag} (${icon})`
  }

  // 4. data-testid
  const testId = element.dataset?.testid || element.getAttribute('data-testid')
  if (testId) {
    return `[data-testid="${testId}"]`
  }

  // 5. data-label-id 또는 다른 data 속성
  const labelId = element.dataset?.labelId || element.getAttribute('data-label-id')
  if (labelId) {
    return `[data-label-id="${labelId}"]`
  }

  // 6. 태그 + 첫 번째 클래스
  const className = element.className
  if (typeof className === 'string' && className.trim()) {
    const firstClass = className.trim().split(/\s+/)[0]
    // Skip utility classes (too common)
    const utilityPatterns = ['inline-flex', 'flex', 'hidden', 'block', 'relative', 'absolute']
    if (!utilityPatterns.includes(firstClass)) {
      return `${tag}.${firstClass}`
    }
  }

  // 7. 최후의 수단: 태그만
  return tag
}

// CSS 변경사항을 한 줄 문자열로 포맷
function formatChanges(changes) {
  return Object.entries(changes)
    .map(([prop, value]) => `${toKebabCase(prop)}: ${value}`)
    .join('; ')
}

// 단일 요소를 AI 포맷으로 변환
export function formatElementForAI(element, changes) {
  const identifier = getIdentifier(element)
  const css = formatChanges(changes)
  return `${identifier} → ${css}`
}

// 모든 변경사항을 AI 포맷으로 변환
export function formatAllForAI() {
  const allChanges = ChangeTracker.getAllChanges()
  const lines = []

  allChanges.forEach((changes, element) => {
    lines.push(formatElementForAI(element, changes))
  })

  return lines.join('\n')
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
  formatElementForAI,
  formatAllForAI,
  copyToClipboard,
  copyAllChangesForAI,
}

export default AIFormatter
