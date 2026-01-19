// 사람이 읽기 쉬운 형식으로 변경사항 포맷팅
// Human-readable change formatter (Korean)

import { ChangeTracker } from './change-tracker'

// 요소의 읽기 쉬운 이름 생성
function getReadableName(element) {
  if (!element) return '알 수 없음'

  if (element.id) return `#${element.id}`

  const text = element.innerText?.trim().slice(0, 12)
  const tag = element.tagName?.toLowerCase() || 'element'

  if (text) return `"${text}" ${tag}`

  const className = element.className?.split?.(' ')?.[0]
  if (className) return `${tag}.${className}`

  return tag
}

// 단일 요소의 변경사항을 사람이 읽기 쉽게 포맷
export function formatElementChanges(element, changes) {
  const name = getReadableName(element)
  const lines = []

  if (!changes || Object.keys(changes).length === 0) {
    return null
  }

  // 위치 변경 (changes 객체는 변경된 속성만 포함)
  if (changes.left !== undefined) {
    lines.push(`  가로 위치: ${changes.left}`)
  }
  if (changes.top !== undefined) {
    lines.push(`  세로 위치: ${changes.top}`)
  }
  if (changes.position !== undefined) {
    lines.push(`  포지션: ${changes.position}`)
  }

  // 크기 변경
  if (changes.width) {
    lines.push(`  가로: ${changes.width}`)
  }
  if (changes.height) {
    lines.push(`  세로: ${changes.height}`)
  }

  // 여백 변경 (margin)
  if (changes.marginTop) lines.push(`  바깥여백(위): ${changes.marginTop}`)
  if (changes.marginRight) lines.push(`  바깥여백(오른쪽): ${changes.marginRight}`)
  if (changes.marginBottom) lines.push(`  바깥여백(아래): ${changes.marginBottom}`)
  if (changes.marginLeft) lines.push(`  바깥여백(왼쪽): ${changes.marginLeft}`)

  // 패딩 변경 (padding)
  if (changes.paddingTop) lines.push(`  안쪽여백(위): ${changes.paddingTop}`)
  if (changes.paddingRight) lines.push(`  안쪽여백(오른쪽): ${changes.paddingRight}`)
  if (changes.paddingBottom) lines.push(`  안쪽여백(아래): ${changes.paddingBottom}`)
  if (changes.paddingLeft) lines.push(`  안쪽여백(왼쪽): ${changes.paddingLeft}`)

  // transform 변경
  if (changes.transform && changes.transform !== 'none') {
    lines.push(`  변형: ${changes.transform}`)
  }

  if (lines.length === 0) return null

  return { name, lines }
}

// 삭제된 요소 포맷
export function formatDeletedElement(deleted) {
  return {
    name: deleted.identifier,
    lines: ['  [삭제됨]'],
    isDeleted: true
  }
}

// 스크린샷 포맷
export function formatScreenshot(screenshot) {
  return {
    name: screenshot.filename,
    lines: [`  ${screenshot.path}`],
    isScreenshot: true,
    id: screenshot.id
  }
}

// 전체 변경사항을 사람이 읽기 쉬운 형식으로 반환
export function formatAllForHuman() {
  const results = []

  // 변경된 요소들
  const allChanges = ChangeTracker.getAllChanges()
  allChanges.forEach((changes, element) => {
    const formatted = formatElementChanges(element, changes)
    if (formatted) {
      results.push(formatted)
    }
  })

  // 삭제된 요소들
  const deletedElements = ChangeTracker.getDeletedElements()
  deletedElements.forEach(deleted => {
    results.push(formatDeletedElement(deleted))
  })

  return results
}

// HTML 형식으로 출력 (히스토리 패널용)
export function formatAllAsHTML() {
  const htmlParts = []

  // 변경된 요소들
  const allChanges = ChangeTracker.getAllChanges()
  allChanges.forEach((changes, element) => {
    const formatted = formatElementChanges(element, changes)
    if (formatted) {
      const elementId = ChangeTracker.getElementId(element)
      htmlParts.push(`
        <div class="history-item" data-element-id="${elementId}">
          <button class="btn-delete" title="삭제">×</button>
          <div class="history-name">${escapeHtml(formatted.name)}</div>
          ${formatted.lines.map(line => `<div class="history-detail">${escapeHtml(line)}</div>`).join('')}
        </div>
      `)
    }
  })

  // 삭제된 요소들
  const deletedElements = ChangeTracker.getDeletedElements()
  deletedElements.forEach((deleted, index) => {
    const formatted = formatDeletedElement(deleted)
    htmlParts.push(`
      <div class="history-item deleted" data-deleted-index="${index}">
        <button class="btn-delete" title="삭제">×</button>
        <div class="history-name">${escapeHtml(formatted.name)}</div>
        ${formatted.lines.map(line => `<div class="history-detail">${escapeHtml(line)}</div>`).join('')}
      </div>
    `)
  })

  // 스크린샷들
  const screenshots = ChangeTracker.getScreenshots()
  screenshots.forEach(screenshot => {
    const formatted = formatScreenshot(screenshot)
    htmlParts.push(`
      <div class="history-item screenshot" data-screenshot-id="${screenshot.id}">
        <button class="btn-delete" title="삭제">×</button>
        <div class="history-name">${escapeHtml(formatted.name)}</div>
        ${formatted.lines.map(line => `<div class="history-detail">${escapeHtml(line)}</div>`).join('')}
      </div>
    `)
  })

  if (htmlParts.length === 0) {
    return '<div class="history-empty">변경 내역이 없습니다</div>'
  }

  return htmlParts.join('')
}

// 텍스트 형식으로 출력
export function formatAllAsText() {
  const items = formatAllForHuman()

  if (items.length === 0) {
    return '변경 내역이 없습니다'
  }

  return items.map(item => {
    return `${item.name}\n${item.lines.join('\n')}`
  }).join('\n\n')
}

// HTML 이스케이프
function escapeHtml(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// 변경 개수 반환 (스크린샷 포함)
export function getChangeCount() {
  return ChangeTracker.getTrackedCount() + ChangeTracker.getScreenshots().length
}

export const HumanFormatter = {
  formatElementChanges,
  formatDeletedElement,
  formatScreenshot,
  formatAllForHuman,
  formatAllAsHTML,
  formatAllAsText,
  getChangeCount,
}

export default HumanFormatter
