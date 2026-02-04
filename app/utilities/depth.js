// 깊이별 요소 탐색 유틸리티
// Alt+Wheel로 DOM 트리를 깊이 단위로 탐색하기 위한 함수들

import { deepElementFromPoint } from './common'

// 박스 타입 display 속성 목록
const BOX_DISPLAY_TYPES = new Set([
  'block', 'flex', 'grid', 'inline-block', 'inline-flex', 'inline-grid',
  'list-item', 'table', 'table-cell', 'table-row', 'flow-root',
])

/**
 * 요소가 박스 타입인지 확인
 * display 속성이 block, flex, grid 등 시각적 박스를 형성하는지 판별
 */
export function isBoxType(element) {
  if (!element || element.nodeType !== 1) return false
  if (element === document.documentElement || element === document.body) return true

  const display = window.getComputedStyle(element).display
  return BOX_DISPLAY_TYPES.has(display)
}

/**
 * 요소에서 body까지의 박스타입 조상 체인 반환
 * @returns {Element[]} [body, ..., parent, element] 순서 (body가 인덱스 0)
 */
export function getAncestorChain(element) {
  const chain = []
  let current = element

  while (current && current !== document.documentElement) {
    if (isBoxType(current)) {
      chain.unshift(current)
    }
    current = current.parentElement
  }

  return chain
}

/**
 * body로부터의 깊이 계산 (박스 타입 요소만 카운트)
 * @returns {number} 0-based 깊이 (body = 0)
 */
export function computeDepth(element) {
  let depth = 0
  let current = element

  while (current && current !== document.body && current !== document.documentElement) {
    current = current.parentElement
    if (current && isBoxType(current)) {
      depth++
    }
  }

  return depth
}

/**
 * 대상 요소와 같은 깊이에 있는 뷰포트 내 형제 박스 요소들 반환
 * 성능을 위해 뷰포트 내 요소만 탐색
 */
export function getSiblingsAtDepth(targetElement) {
  const targetDepth = computeDepth(targetElement)
  const siblings = []

  // 뷰포트 영역 계산
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  // 같은 부모 아래의 형제들 먼저 수집
  const parent = targetElement.parentElement
  if (!parent) return siblings

  for (const child of parent.children) {
    if (child === targetElement) continue
    if (!isBoxType(child)) continue

    // 뷰포트 내에 있는지 확인
    const rect = child.getBoundingClientRect()
    if (rect.bottom < 0 || rect.top > viewportHeight) continue
    if (rect.right < 0 || rect.left > viewportWidth) continue

    siblings.push(child)
  }

  return siblings
}

/**
 * 좌표 위치에서 특정 깊이의 요소 찾기
 * @param {number} x - clientX
 * @param {number} y - clientY
 * @param {number} depthIndex - 조상 체인에서의 인덱스 (0 = body)
 * @returns {{ element: Element, chain: Element[], depth: number, maxDepth: number } | null}
 */
export function elementAtDepthFromPoint(x, y, depthIndex) {
  const leaf = deepElementFromPoint(x, y)
  if (!leaf) return null

  const chain = getAncestorChain(leaf)
  if (chain.length === 0) return null

  // 깊이 인덱스를 체인 범위 내로 클램핑
  const clampedIndex = Math.max(0, Math.min(depthIndex, chain.length - 1))
  const element = chain[clampedIndex]

  return {
    element,
    chain,
    depth: clampedIndex,
    maxDepth: chain.length - 1,
  }
}
