// 변경 추적 시스템 - 처음 ↔ 마지막만 저장 (중간값 무시)
// Change Tracker - stores only initial and final states

export const trackedProperties = [
  'position', 'left', 'top', 'right', 'bottom',
  'width', 'height',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'transform',
  'display', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
  'flexGrow', 'flexShrink', 'flexBasis',
  'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  'transformOrigin',
  'color', 'backgroundColor', 'borderColor',
  'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign',
  'borderRadius', 'opacity',
  'fontFamily', 'fontStyle', 'textDecorationLine',
]

export const COLOR_PROPERTIES = ['color', 'backgroundColor', 'borderColor']

function parseColorChannel(token) {
  if (token == null) return NaN
  const t = String(token).trim()
  if (t.endsWith('%')) return (parseFloat(t) / 100) * 255
  return parseFloat(t)
}

function parseAlpha(token) {
  if (token == null || token === '') return 1
  const t = String(token).trim()
  if (t.endsWith('%')) return parseFloat(t) / 100
  return parseFloat(t)
}

function toHexByte(n) {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
}

// computed rgb()/rgba() → #rrggbb or #rrggbbaa. Other values pass through.
export function cssColorToHex(value) {
  if (value == null || typeof value !== 'string') return value
  const raw = value.trim()
  if (!raw) return value

  if (raw.charAt(0) === '#') {
    if (raw.length === 4 || raw.length === 5) {
      const r = raw[1], g = raw[2], b = raw[3], a = raw[4]
      return (`#${r}${r}${g}${g}${b}${b}${a ? a + a : ''}`).toLowerCase()
    }
    return raw.toLowerCase()
  }

  const lower = raw.toLowerCase()
  if (lower === 'transparent') return '#00000000'

  const rgbMatch = lower.match(/^rgba?\(\s*([\s\S]+)\s*\)$/)
  if (!rgbMatch) return value

  const body = rgbMatch[1].trim()
  let r, g, b, a = 1

  if (body.includes('/')) {
    const parts = body.split('/')
    const nums = parts[0].trim().split(/[\s,]+/).filter(Boolean)
    r = parseColorChannel(nums[0])
    g = parseColorChannel(nums[1])
    b = parseColorChannel(nums[2])
    a = parseAlpha(parts[1])
  } else if (body.includes(',')) {
    const nums = body.split(',').map(s => s.trim())
    r = parseColorChannel(nums[0])
    g = parseColorChannel(nums[1])
    b = parseColorChannel(nums[2])
    if (nums[3] != null) a = parseAlpha(nums[3])
  } else {
    const nums = body.split(/\s+/).filter(Boolean)
    r = parseColorChannel(nums[0])
    g = parseColorChannel(nums[1])
    b = parseColorChannel(nums[2])
    if (nums[3] != null) a = parseAlpha(nums[3])
  }

  if ([r, g, b].some(n => Number.isNaN(n))) return value
  if (!(a >= 0) || Number.isNaN(a)) a = 1

  const rgbHex = `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`
  if (a >= 1) return rgbHex
  return rgbHex + toHexByte(a * 255)
}

export function formatTrackedValue(prop, value) {
  if (value == null) return value
  if (COLOR_PROPERTIES.indexOf(prop) !== -1) return cssColorToHex(value)
  return value
}

// WeakMap to store original styles (element -> original styles)
const originalStyles = new WeakMap()

// Map to store current changes (element -> current styles)
// Using Map (not WeakMap) so we can iterate over tracked elements
const trackedElements = new Map()

const originalTexts = new WeakMap()
const textChangedElements = new Map()
const lastCommittedText = new WeakMap()

// 자연어 메모 (요소 단위) + 페이지 전체 요청
const elementNotes = new Map()
let pageNote = ''

// 삭제된 요소 추적 (element ref 사라지므로 식별자와 원본 스타일 저장)
// { identifier, tagName, original, deletedAt }
const deletedElements = []

// Undo/Redo 스택 (요소 단위)
const undoStack = []
const redoStack = []

// 요소별 직전 커밋 인라인 스타일 (단계별 undo용)
const lastCommittedInline = new WeakMap()

// 킷(내 킷) 관련 추적
//   kitRefs: 스타일 모드로 적용된 요소 -> { itemId, itemName, mode: 'style' }
//   kitSwaps: 통째로 교체된 새 요소(newEl) -> { oldEl, oldHTML, itemId, itemName, mode: 'block', identifier }
const kitRefs = new Map()
const kitSwaps = new Map()

function snapshotInline(element) {
  const snap = {}
  trackedProperties.forEach(prop => {
    snap[prop] = element.style[prop] || ''
  })
  return snap
}

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

export function captureOriginalText(element) {
  if (!element || originalTexts.has(element)) return
  originalTexts.set(element, element.textContent == null ? '' : String(element.textContent))
}

function readText(element) {
  return !element || element.textContent == null ? '' : String(element.textContent)
}

function syncTextChange(element) {
  if (!element) return
  if (!originalTexts.has(element)) captureOriginalText(element)
  const original = originalTexts.get(element)
  const current = readText(element)
  if (current === original) textChangedElements.delete(element)
  else textChangedElements.set(element, { original, current })
}

export function updateCurrentText(element) {
  if (!element) return
  if (!originalTexts.has(element)) captureOriginalText(element)

  const original = originalTexts.get(element)
  const current = readText(element)
  syncTextChange(element)

  const previous = lastCommittedText.has(element)
    ? lastCommittedText.get(element)
    : original
  if (previous !== current) {
    undoStack.push({
      type: 'text',
      element,
      previousText: previous,
      identifier: getElementIdentifier(element),
    })
    lastCommittedText.set(element, current)
    redoStack.length = 0
  }
}

// 요소에 자연어 메모 설정 (빈 문자열/공백이면 메모 제거)
export function setNote(element, text) {
  if (!element) return
  const trimmed = text == null ? '' : String(text).trim()

  if (!trimmed) {
    elementNotes.delete(element)
    return
  }

  // 스타일 변경이 없어도 추적 대상에 포함시켜 삭제/카운트 로직과 일관되게 유지
  if (!originalStyles.has(element)) {
    captureOriginal(element)
  }

  elementNotes.set(element, trimmed)
}

// 요소의 메모 조회
export function getNote(element) {
  return elementNotes.has(element) ? elementNotes.get(element) : null
}

// 모든 요소별 메모 (element -> text)
export function getAllNotes() {
  return new Map(elementNotes)
}

// 페이지 전체 요청 메모 설정/조회
export function setPageNote(text) {
  pageNote = text == null ? '' : String(text).trim()
}

export function getPageNote() {
  return pageNote || null
}

// 요소에 킷 참조 설정 (스타일 모드 적용 시). getKitRef 로 조회 가능하고
// getChanges/getAllChanges 결과에 _kit 으로 포함된다.
export function setKitRef(element, ref) {
  if (!element) return
  kitRefs.set(element, ref)
}

export function getKitRef(element) {
  return kitRefs.get(element) || null
}

function kitInfoFor(element) {
  const swap = kitSwaps.get(element)
  if (swap) {
    return { itemId: swap.itemId, itemName: swap.itemName, mode: swap.mode, originalHTML: swap.oldHTML }
  }
  const ref = kitRefs.get(element)
  if (ref) {
    return { itemId: ref.itemId, itemName: ref.itemName, mode: ref.mode }
  }
  return null
}

export function getChanges(element) {
  const styles = trackedElements.has(element) ? trackedElements.get(element) : {}
  const text = textChangedElements.get(element)
  const note = elementNotes.get(element)
  const kit = kitInfoFor(element)
  const merged = (text || note || kit) ? Object.assign({}, styles) : styles
  if (text) merged._text = text
  if (note) merged._note = note
  if (kit) merged._kit = kit
  return merged
}

export function getAllChanges() {
  const result = new Map()

  trackedElements.forEach((changes, element) => {
    if (Object.keys(changes).length > 0) {
      result.set(element, Object.assign({}, changes))
    }
  })

  textChangedElements.forEach((text, element) => {
    const existing = result.get(element) || {}
    existing._text = text
    result.set(element, existing)
  })

  elementNotes.forEach((note, element) => {
    const existing = result.get(element) || {}
    existing._note = note
    result.set(element, existing)
  })

  kitRefs.forEach((ref, element) => {
    if (kitSwaps.has(element)) return
    const existing = result.get(element) || {}
    existing._kit = { itemId: ref.itemId, itemName: ref.itemName, mode: ref.mode }
    result.set(element, existing)
  })

  // 통째로 교체된 요소는 스타일 변경이 없어도 항상 포함
  kitSwaps.forEach((swap, element) => {
    const existing = result.get(element) || {}
    existing._kit = { itemId: swap.itemId, itemName: swap.itemName, mode: swap.mode, originalHTML: swap.oldHTML }
    result.set(element, existing)
  })

  return result
}

export function removeElement(element) {
  originalStyles.delete(element)
  trackedElements.delete(element)
  lastCommittedInline.delete(element)
  originalTexts.delete(element)
  textChangedElements.delete(element)
  lastCommittedText.delete(element)
  elementNotes.delete(element)
  kitRefs.delete(element)
  kitSwaps.delete(element)
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

function isOverlayNode(element) {
  if (!element || !element.tagName) return true
  const tag = element.tagName.toLowerCase()
  return tag === 'vis-bug' || tag.startsWith('visbug')
}

// 킷 교체 기록용: data-selected/data-label-id 를 제거한 outerHTML, 길이 제한
function cleanedOuterHTML(element, maxLen = 4000) {
  if (!element) return ''
  let html = ''
  try {
    const clone = element.cloneNode ? element.cloneNode(true) : null
    if (clone && clone.removeAttribute) {
      clone.removeAttribute('data-selected')
      clone.removeAttribute('data-label-id')
    }
    html = (clone && clone.outerHTML) || element.outerHTML || ''
  } catch (e) {
    html = element.outerHTML || ''
  }
  if (html.length > maxLen) html = html.slice(0, maxLen) + '...'
  return html
}

// 요소 삭제 추적
export function trackDeletion(element) {
  if (!element || !element.parentElement || isOverlayNode(element)) return

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

  // 삭제 히스토리 표시용 (clonedNode는 AI 프롬프트 HTML 스니펫용)
  deletedElements.push({
    deletionId,
    identifier,
    tagName: element.tagName.toLowerCase(),
    original,
    deletedAt: Date.now(),
    clonedNode,
  })

  // 기존 추적에서 제거
  removeElement(element)
}

// 킷 아이템으로 요소를 통째로 교체한 것을 추적 (undo/redo, AI 프롬프트 반영)
export function trackKitSwap({ oldEl, newEl, item, mode }) {
  if (!oldEl || !newEl || !item) return

  const identifier = getElementIdentifier(oldEl)
  const oldHTML = cleanedOuterHTML(oldEl, 4000)
  const parent = oldEl.parentElement

  // 교체되어 사라지는 oldEl 의 기존 추적 상태는 더 이상 의미가 없으므로 정리
  removeElement(oldEl)

  kitSwaps.set(newEl, {
    oldEl,
    oldHTML,
    itemId: item.id,
    itemName: item.name,
    mode: mode || 'block',
    identifier,
  })

  undoStack.push({
    type: 'kit',
    oldEl,
    newEl,
    oldHTML,
    parent,
    itemId: item.id,
    itemName: item.name,
    identifier,
  })

  // Redo 스택 초기화 (새 변경이 생기면 redo 불가)
  redoStack.length = 0
}

// 삭제된 요소 목록 조회
export function getDeletedElements() {
  return [...deletedElements]
}

export function clearAll() {
  trackedElements.clear()
  textChangedElements.clear()
  elementNotes.clear()
  pageNote = ''
  deletedElements.length = 0  // 삭제 기록도 초기화
  undoStack.length = 0
  redoStack.length = 0
  kitRefs.clear()
  kitSwaps.clear()
  // WeakMap doesn't need clearing - GC handles it
}

export function hasChanges() {
  if (deletedElements.length > 0) return true
  if (textChangedElements.size > 0) return true
  if (elementNotes.size > 0) return true
  if (pageNote) return true
  if (kitSwaps.size > 0) return true
  for (const [, changes] of trackedElements) {
    if (Object.keys(changes).length > 0) return true
  }
  return false
}

export function getTrackedCount() {
  const unique = new Set()
  trackedElements.forEach((changes, element) => {
    if (Object.keys(changes).length > 0) unique.add(element)
  })
  textChangedElements.forEach((_, element) => unique.add(element))
  elementNotes.forEach((_, element) => unique.add(element))
  kitSwaps.forEach((_, element) => unique.add(element))
  return unique.size + deletedElements.length + (pageNote ? 1 : 0)
}

// 요소 고유 ID 가져오기
export function getElementId(element) {
  if (!elementIds.has(element)) {
    elementIds.set(element, nextElementId++)
  }
  return elementIds.get(element)
}

// Undo 스택에 현재 상태 저장 (변경 완료 시 호출)
// 직전 커밋 인라인을 push한 뒤 현재 인라인으로 lastCommitted를 갱신한다.
export function pushToUndoStack(element) {
  const original = originalStyles.get(element)
  if (!original) return

  const previous = lastCommittedInline.has(element)
    ? lastCommittedInline.get(element)
    : { ...original._inline }

  undoStack.push({
    type: 'style',
    element,
    originalInline: { ...previous },
    identifier: getElementIdentifier(element)
  })

  lastCommittedInline.set(element, snapshotInline(element))

  // Redo 스택 초기화 (새 변경이 생기면 redo 불가)
  redoStack.length = 0
}

function dropDeletedRecord(deletionId) {
  const deletedIndex = deletedElements.findIndex(d => d.deletionId === deletionId)
  if (deletedIndex >= 0) {
    deletedElements.splice(deletedIndex, 1)
  }
}

// Undo: 마지막 변경 요소 복원
export function undo() {
  while (undoStack.length) {
    const last = undoStack.pop()
    if (!last) return null

    // 삭제 undo 처리
    if (last.type === 'deletion') {
      const { deletionId, element, parent, nextSibling, identifier, original } = last

      // 오버레이/이미 분리된 노드는 복원할 수 없으므로 건너뛰고 다음 항목으로
      if (!parent || !parent.isConnected || isOverlayNode(element)) {
        dropDeletedRecord(deletionId)
        continue
      }

      dropDeletedRecord(deletionId)

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

    if (last.type === 'text') {
      const { element, previousText, identifier } = last
      const currentText = readText(element)
      redoStack.push({ type: 'text', element, currentText, identifier })
      if (element) element.textContent = previousText
      lastCommittedText.set(element, previousText)
      syncTextChange(element)
      return { type: 'text', element, identifier }
    }

    // 킷 교체 undo 처리 (통째로 교체 -> 원래 요소로 복원)
    if (last.type === 'kit') {
      const { oldEl, newEl, oldHTML, parent, itemId, itemName, identifier } = last

      // 이미 DOM에서 분리된 경우 복원할 수 없으므로 건너뛰고 다음 항목으로
      if (!newEl || !newEl.isConnected) {
        kitSwaps.delete(newEl)
        continue
      }

      newEl.replaceWith(oldEl)
      kitSwaps.delete(newEl)

      redoStack.push({ type: 'kit', oldEl, newEl, oldHTML, parent, itemId, itemName, identifier })

      return { type: 'kit', element: oldEl, identifier }
    }

    // 스타일 변경 undo 처리
    const { element, originalInline, identifier } = last

    // 현재 상태를 redo 스택에 저장
    const currentInline = snapshotInline(element)
    redoStack.push({ type: 'style', element, currentInline, identifier })

    // 직전 커밋 스타일로 복원 (최초 원본이 아니라 한 단계)
    trackedProperties.forEach(prop => {
      element.style[prop] = originalInline[prop] || ''
    })

    lastCommittedInline.set(element, { ...originalInline })
    updateCurrent(element)

    return { type: 'style', element, identifier }
  }

  return null
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

  if (last.type === 'text') {
    const { element, currentText, identifier } = last
    const previousText = element && element.textContent == null ? '' : String(element.textContent)
    undoStack.push({ type: 'text', element, previousText, identifier })
    if (element) element.textContent = currentText
    lastCommittedText.set(element, currentText)
    syncTextChange(element)
    return { type: 'text', element, identifier }
  }

  // 킷 교체 redo 처리 (다시 통째로 교체)
  if (last.type === 'kit') {
    const { oldEl, newEl, oldHTML, parent, itemId, itemName, identifier } = last

    if (!oldEl || !oldEl.isConnected) return null

    oldEl.replaceWith(newEl)
    kitSwaps.set(newEl, { oldEl, oldHTML, itemId, itemName, mode: 'block', identifier })

    undoStack.push({ type: 'kit', oldEl, newEl, oldHTML, parent, itemId, itemName, identifier })

    return { type: 'kit', element: newEl, identifier }
  }

  // 스타일 변경 redo 처리
  const { element, currentInline, identifier } = last

  // 현재 상태를 undo 스택에 저장
  const originalInline = snapshotInline(element)
  undoStack.push({ type: 'style', element, originalInline, identifier })

  if (!originalStyles.has(element)) {
    captureOriginal(element)
  }

  // 변경된 스타일로 복원
  trackedProperties.forEach(prop => {
    element.style[prop] = currentInline[prop] || ''
  })

  lastCommittedInline.set(element, { ...currentInline })
  updateCurrent(element)

  return { type: 'style', element, identifier }
}

// undo 스택의 읽기 전용 스냅샷 (히스토리 패널 타임트래블 미리보기/되돌리기 용)
// 스택을 변형하지 않으므로 미리보기 목적으로 안전하게 사용 가능
export function getUndoStackSnapshot() {
  return undoStack.map(entry => ({ ...entry }))
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

// 비교 모드용: 모든 변경 요소를 원본으로 토글 (스타일 + 텍스트)
// 미리보기 전용 - trackedElements/textChangedElements 등 추적 상태는 건드리지 않는다
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
      results.push({ element, kind: 'style', savedCurrent: current })
    }
  })

  if (showOriginal) {
    textChangedElements.forEach((textInfo, element) => {
      if (!element) return
      const savedText = readText(element)
      element.textContent = textInfo.original
      results.push({ element, kind: 'text', savedText })
    })

    // 통째로 교체된 요소도 원래 요소로 임시 교체
    kitSwaps.forEach((swap, newEl) => {
      if (!newEl || !newEl.isConnected || !newEl.parentNode) return
      newEl.parentNode.replaceChild(swap.oldEl, newEl)
      results.push({ element: newEl, kind: 'kit', oldEl: swap.oldEl, newEl })
    })
  }

  return results
}

// 비교 모드 해제: 변경된 상태로 복원 (스타일 + 텍스트)
export function restoreFromCompare(savedStates) {
  savedStates.forEach(entry => {
    if (!entry || !entry.element) return

    if (entry.kind === 'text') {
      entry.element.textContent = entry.savedText
      return
    }

    if (entry.kind === 'kit') {
      const { oldEl, newEl } = entry
      if (oldEl && oldEl.parentNode) oldEl.parentNode.replaceChild(newEl, oldEl)
      return
    }

    const { element, savedCurrent } = entry
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
  captureOriginalText,
  updateCurrentText,
  cssColorToHex,
  formatTrackedValue,
  getChanges,
  getAllChanges,
  getOriginalStyles,
  removeElement,
  trackDeletion,
  getDeletedElements,
  setKitRef,
  getKitRef,
  trackKitSwap,
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
  setNote,
  getNote,
  getAllNotes,
  setPageNote,
  getPageNote,
  getUndoStackSnapshot,
}

// Expose to window for E2E testing
if (typeof window !== 'undefined') {
  window.ChangeTracker = ChangeTracker
}

export default ChangeTracker
