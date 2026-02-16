// 변경 추적 시스템 - 처음 ↔ 마지막만 저장 (중간값 무시)
// Change Tracker - stores only initial and final states

const trackedProperties = [
  'position', 'left', 'top', 'right', 'bottom',
  'width', 'height', 'margin', 'padding',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'transform',
  'flexGrow', 'flexShrink', 'flexBasis',
  'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  'transformOrigin',
]

// WeakMap to store original styles (element -> original styles)
const originalStyles = new WeakMap()

// Map to store current changes (element -> current styles)
// Using Map (not WeakMap) so we can iterate over tracked elements
const trackedElements = new Map()

// 삭제된 요소 추적 (element ref 사라지므로 식별자와 원본 스타일 저장)
// { identifier, tagName, original, deletedAt }
const deletedElements = []

// Undo/Redo 스택 (요소 단위)
const undoStack = []
const redoStack = []

// 스크린샷 목록
const screenshots = []

// 요소별 고유 ID (개별 삭제용)
let nextElementId = 1
const elementIds = new WeakMap()

// 삭제 고유 ID (삭제 항목 매칭용 - identifier 충돌 방지)
let nextDeletionId = 1

export function captureOriginal(element) {
  if (originalStyles.has(element)) return // already captured

  const computed = window.getComputedStyle(element)
  const original = {}

  trackedProperties.forEach(prop => {
    original[prop] = computed[prop]
  })

  // Also store inline styles for accurate diff
  original._inline = {}
  trackedProperties.forEach(prop => {
    original._inline[prop] = element.style[prop] || ''
  })

  originalStyles.set(element, original)
  trackedElements.set(element, {})
}

export function updateCurrent(element) {
  if (!originalStyles.has(element)) {
    captureOriginal(element)
  }

  const original = originalStyles.get(element)
  const computed = window.getComputedStyle(element)
  const changes = {}

  trackedProperties.forEach(prop => {
    const originalValue = original[prop]
    const currentValue = computed[prop]

    // Only track if changed
    if (originalValue !== currentValue) {
      changes[prop] = currentValue
    }
  })

  trackedElements.set(element, changes)
}

export function getChanges(element) {
  if (!trackedElements.has(element)) return {}
  return trackedElements.get(element)
}

export function getAllChanges() {
  const result = new Map()

  trackedElements.forEach((changes, element) => {
    if (Object.keys(changes).length > 0) {
      result.set(element, changes)
    }
  })

  return result
}

export function removeElement(element) {
  originalStyles.delete(element)
  trackedElements.delete(element)
}

// 요소의 식별자를 생성 (삭제 후에도 추적용)
function getElementIdentifier(element) {
  if (element.id) return `#${element.id}`

  const text = element.innerText?.trim().slice(0, 15)
  const tag = element.tagName.toLowerCase()

  if (text) return `"${text}" ${tag}`

  const className = element.className?.split?.(' ')?.[0]
  if (className) return `${tag}.${className}`

  return tag
}

// 요소 삭제 추적
export function trackDeletion(element) {
  const identifier = getElementIdentifier(element)
  const original = originalStyles.get(element) || {}
  const deletionId = nextDeletionId++

  // DOM 노드 deep clone (data-selected, data-label-id 제거)
  const clonedNode = element.cloneNode(true)
  clonedNode.removeAttribute('data-selected')
  clonedNode.removeAttribute('data-label-id')

  // 부모 및 삽입 위치 저장
  const parent = element.parentElement
  const nextSibling = element.nextSibling

  // Undo 스택에 삭제 기록 추가
  undoStack.push({
    type: 'deletion',
    deletionId,
    element: clonedNode,
    parent,
    nextSibling,
    identifier,
    original,
  })

  // Redo 스택 초기화 (새 변경이 생기면 redo 불가)
  redoStack.length = 0

  // 삭제 히스토리 표시용
  deletedElements.push({
    deletionId,
    identifier,
    tagName: element.tagName.toLowerCase(),
    original,
    deletedAt: Date.now()
  })

  // 기존 추적에서 제거
  removeElement(element)
}

// 삭제된 요소 목록 조회
export function getDeletedElements() {
  return [...deletedElements]
}

export function clearAll() {
  trackedElements.clear()
  deletedElements.length = 0  // 삭제 기록도 초기화
  undoStack.length = 0
  redoStack.length = 0
  // WeakMap doesn't need clearing - GC handles it
}

export function hasChanges() {
  if (deletedElements.length > 0) return true
  for (const [, changes] of trackedElements) {
    if (Object.keys(changes).length > 0) return true
  }
  return false
}

export function getTrackedCount() {
  let count = deletedElements.length  // 삭제된 요소 수 포함
  trackedElements.forEach((changes) => {
    if (Object.keys(changes).length > 0) count++
  })
  return count
}

// 요소 고유 ID 가져오기
export function getElementId(element) {
  if (!elementIds.has(element)) {
    elementIds.set(element, nextElementId++)
  }
  return elementIds.get(element)
}

// Undo 스택에 현재 상태 저장 (변경 완료 시 호출)
export function pushToUndoStack(element) {
  const original = originalStyles.get(element)
  if (!original) return

  undoStack.push({
    type: 'style',
    element,
    originalInline: { ...original._inline },
    identifier: getElementIdentifier(element)
  })

  // Redo 스택 초기화 (새 변경이 생기면 redo 불가)
  redoStack.length = 0
}

// Undo: 마지막 변경 요소 복원
export function undo() {
  const last = undoStack.pop()
  if (!last) return null

  // 삭제 undo 처리
  if (last.type === 'deletion') {
    const { deletionId, element, parent, nextSibling, identifier, original } = last

    // deletedElements 배열에서 제거 (고유 ID로 정확한 매칭)
    const deletedIndex = deletedElements.findIndex(d => d.deletionId === deletionId)
    if (deletedIndex >= 0) {
      deletedElements.splice(deletedIndex, 1)
    }

    // Redo 스택에 삭제 기록 추가
    redoStack.push({
      type: 'deletion',
      deletionId,
      element,
      parent,
      nextSibling,
      identifier,
      original,
    })

    return { type: 'deletion', element, parent, nextSibling, identifier }
  }

  // 스타일 변경 undo 처리
  const { element, originalInline, identifier } = last

  // 현재 상태를 redo 스택에 저장
  const currentInline = {}
  trackedProperties.forEach(prop => {
    currentInline[prop] = element.style[prop] || ''
  })
  redoStack.push({ type: 'style', element, currentInline, identifier })

  // 원본 스타일로 복원
  trackedProperties.forEach(prop => {
    element.style[prop] = originalInline[prop] || ''
  })

  // 추적에서 제거
  removeElement(element)

  return { type: 'style', element, identifier }
}

// Redo: 마지막 undo 취소
export function redo() {
  const last = redoStack.pop()
  if (!last) return null

  // 삭제 redo 처리 (다시 삭제)
  if (last.type === 'deletion') {
    const { deletionId, element, parent, nextSibling, identifier, original } = last

    // deletedElements 배열에 다시 추가 (원본 스타일 보존)
    deletedElements.push({
      deletionId,
      identifier,
      tagName: element.tagName.toLowerCase(),
      original,
      deletedAt: Date.now()
    })

    // Undo 스택에 삭제 기록 추가
    undoStack.push({
      type: 'deletion',
      deletionId,
      element,
      parent,
      nextSibling,
      identifier,
      original,
    })

    return { type: 'deletion', element, identifier }
  }

  // 스타일 변경 redo 처리
  const { element, currentInline, identifier } = last

  // 현재 상태를 undo 스택에 저장
  const originalInline = {}
  trackedProperties.forEach(prop => {
    originalInline[prop] = element.style[prop] || ''
  })
  undoStack.push({ type: 'style', element, originalInline, identifier })

  // 변경된 스타일로 복원
  trackedProperties.forEach(prop => {
    element.style[prop] = currentInline[prop] || ''
  })

  // 다시 추적 시작
  captureOriginal(element)
  updateCurrent(element)

  return { type: 'style', element, identifier }
}

// ID로 추적 요소 제거 (개별 삭제)
export function removeTrackedById(id) {
  for (const [element] of trackedElements) {
    if (getElementId(element) === id) {
      removeElement(element)
      return true
    }
  }
  return false
}

// 인덱스로 삭제된 요소 제거
export function removeDeletedByIndex(index) {
  if (index >= 0 && index < deletedElements.length) {
    deletedElements.splice(index, 1)
    return true
  }
  return false
}

// 비교 모드용: 모든 변경 요소를 원본으로 토글
export function toggleCompareMode(showOriginal) {
  const results = []

  trackedElements.forEach((changes, element) => {
    if (Object.keys(changes).length === 0) return

    const original = originalStyles.get(element)
    if (!original) return

    if (showOriginal) {
      // 원본으로 복원 (임시)
      const current = {}
      trackedProperties.forEach(prop => {
        current[prop] = element.style[prop] || ''
        element.style[prop] = original._inline[prop] || ''
      })
      results.push({ element, savedCurrent: current })
    }
  })

  return results
}

// 비교 모드 해제: 변경된 상태로 복원
export function restoreFromCompare(savedStates) {
  savedStates.forEach(({ element, savedCurrent }) => {
    trackedProperties.forEach(prop => {
      element.style[prop] = savedCurrent[prop] || ''
    })
  })
}

// 스크린샷 추가
export function addScreenshot(info) {
  screenshots.push({
    ...info,
    id: Date.now()
  })
}

// 스크린샷 목록 조회
export function getScreenshots() {
  return [...screenshots]
}

// 스크린샷 제거
export function removeScreenshotById(id) {
  const index = screenshots.findIndex(s => s.id === id)
  if (index >= 0) {
    screenshots.splice(index, 1)
    return true
  }
  return false
}

// 요소의 원본 스타일 가져오기
export function getOriginalStyles(element) {
  return originalStyles.get(element) || null
}

// Export the tracker as a singleton object
export const ChangeTracker = {
  captureOriginal,
  updateCurrent,
  getChanges,
  getAllChanges,
  getOriginalStyles,
  removeElement,
  trackDeletion,
  getDeletedElements,
  clearAll,
  hasChanges,
  getTrackedCount,
  getElementId,
  pushToUndoStack,
  undo,
  redo,
  removeTrackedById,
  removeDeletedByIndex,
  toggleCompareMode,
  restoreFromCompare,
  addScreenshot,
  getScreenshots,
  removeScreenshotById,
}

export default ChangeTracker
