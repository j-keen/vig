// 사람이 읽기 쉬운 형식으로 변경사항 포맷팅
// Human-readable change formatter (Korean)

import { ChangeTracker, formatTrackedValue } from './change-tracker'
import { formatTransformValue } from './ai-formatter'

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
    lines.push(`  변형: ${formatTransformValue(changes.transform)}`)
  }

  if (changes._text) {
    lines.push(`  텍스트: "${changes._text.original}" → "${changes._text.current}"`)
  }

  if (changes._kit) {
    const modeLabel = changes._kit.mode === 'block' ? '통째로' : '모양만'
    lines.push(`  킷: "${changes._kit.itemName}" (${modeLabel})`)
  }

  if (changes.color) lines.push(`  글자색: ${formatTrackedValue('color', changes.color)}`)
  if (changes.backgroundColor) lines.push(`  배경색: ${formatTrackedValue('backgroundColor', changes.backgroundColor)}`)
  if (changes.borderColor) lines.push(`  테두리색: ${formatTrackedValue('borderColor', changes.borderColor)}`)
  if (changes.fontSize) lines.push(`  글자 크기: ${changes.fontSize}`)
  if (changes.fontWeight) lines.push(`  글자 굵기: ${changes.fontWeight}`)
  if (changes.lineHeight) lines.push(`  줄간격: ${changes.lineHeight}`)
  if (changes.letterSpacing) lines.push(`  자간: ${changes.letterSpacing}`)
  if (changes.textAlign) lines.push(`  정렬: ${changes.textAlign}`)
  if (changes.borderRadius) lines.push(`  모서리: ${changes.borderRadius}`)
  if (changes.opacity) lines.push(`  불투명도: ${changes.opacity}`)

  const note = changes._note || null

  if (lines.length === 0 && !note) return null

  return { name, lines, note }
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

// 메모 한 줄 렌더링 (요소별 메모 - 수정 버튼 포함)
function renderNoteRow(note, elementId) {
  if (!note) return ''
  return `
    <div class="history-note">
      <span class="note-text">💬 "${escapeHtml(note)}"</span>
      <button class="btn-edit-note" data-element-id="${elementId}" title="메모 수정">✎</button>
    </div>
  `
}

// HTML 형식으로 출력 (히스토리 패널용)
export function formatAllAsHTML() {
  const htmlParts = []

  // 전체 페이지 요청 (있을 때만, 최상단)
  const pageNote = ChangeTracker.getPageNote()
  if (pageNote) {
    htmlParts.push(`
      <div class="history-item page-note" data-page-note="true">
        <button class="btn-edit-note" data-page-note-edit="true" title="메모 수정">✎</button>
        <button class="btn-delete" data-page-note-delete="true" title="삭제">×</button>
        <div class="history-name">전체 요청</div>
        <div class="history-detail">"${escapeHtml(pageNote)}"</div>
      </div>
    `)
  }

  // 변경된 요소들
  const allChanges = ChangeTracker.getAllChanges()
  allChanges.forEach((changes, element) => {
    const formatted = formatElementChanges(element, changes)
    if (formatted) {
      const elementId = ChangeTracker.getElementId(element)
      htmlParts.push(`
        <div class="history-item" data-element-id="${elementId}">
          <button class="btn-revert" title="여기로 되돌리기">⎌</button>
          <button class="btn-copy" title="복사">⎘</button>
          <button class="btn-delete" title="삭제">×</button>
          <div class="history-name">${escapeHtml(formatted.name)}</div>
          ${formatted.lines.map(line => `<div class="history-detail">${escapeHtml(line)}</div>`).join('')}
          ${renderNoteRow(formatted.note, elementId)}
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
        <button class="btn-revert" title="여기로 되돌리기">⎌</button>
        <button class="btn-copy" title="복사">⎘</button>
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
    const hasImage = !!screenshot.dataUrl
    const hasPath = !!screenshot.path

    htmlParts.push(`
      <div class="history-item screenshot" data-screenshot-id="${screenshot.id}">
        <div class="screenshot-buttons">
          ${hasImage ? '<button class="btn-copy-image" title="이미지 복사">🖼</button>' : ''}
          ${hasPath ? '<button class="btn-copy-path" title="경로 복사">📂</button>' : ''}
        </div>
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
