// 깊이별 요소 선택 피처
// Alt+Wheel로 DOM 트리 깊이를 탐색하고 선택하는 기능
//
// 흐름:
//   1. Alt+Wheel → 깊이 탐색 (오버레이 표시)
//   2. Alt 키를 놓거나 클릭 → 현재 깊이의 요소 선택
//   3. ESC → 선택 없이 취소

import { isOffBounds, deepElementFromPoint } from '../utilities/'
import {
  getAncestorChain, getSiblingsAtDepth,
} from '../utilities/depth'

const state = {
  active: false,
  currentDepth: 0,
  currentChain: [],
  currentElement: null,
  mouseX: 0,
  mouseY: 0,
  overlays: [],
  rafId: null,
}

export function DepthSelector(visbug, selectorEngine) {
  const page = document.body

  const on_wheel = e => {
    if (!e.altKey) return

    e.preventDefault()
    e.stopPropagation()

    state.mouseX = e.clientX
    state.mouseY = e.clientY

    // 휠 방향으로 깊이 변경
    const delta = e.deltaY > 0 ? 1 : -1

    if (!state.active) {
      // 처음 활성화: 현재 마우스 위치에서 체인 구성
      const leaf = deepElementFromPoint(e.clientX, e.clientY)
      if (!leaf || isOffBounds(leaf)) return

      state.currentChain = getAncestorChain(leaf)
      if (state.currentChain.length === 0) return

      state.active = true
      state.currentDepth = state.currentChain.length - 1 // 최하위에서 시작
    }

    // 깊이 이동
    state.currentDepth = Math.max(0, Math.min(
      state.currentDepth + delta,
      state.currentChain.length - 1
    ))

    // rAF로 오버레이 업데이트
    if (state.rafId) cancelAnimationFrame(state.rafId)
    state.rafId = requestAnimationFrame(() => updateOverlays())
  }

  const on_mousemove = e => {
    // Alt 키를 누른 상태에서만 체인 재계산
    if (!state.active || !e.altKey) return

    state.mouseX = e.clientX
    state.mouseY = e.clientY

    const leaf = deepElementFromPoint(e.clientX, e.clientY)
    if (!leaf || isOffBounds(leaf)) return

    const newChain = getAncestorChain(leaf)
    if (newChain.length === 0) return

    state.currentChain = newChain
    state.currentDepth = Math.min(state.currentDepth, newChain.length - 1)

    if (state.rafId) cancelAnimationFrame(state.rafId)
    state.rafId = requestAnimationFrame(() => updateOverlays())
  }

  // document에 등록 (capture) → body의 selectable보다 먼저 실행
  const on_click = e => {
    if (!state.active) return

    // selectable의 click 핸들러가 실행되지 않도록 차단
    e.preventDefault()
    e.stopImmediatePropagation()

    selectCurrentAndDeactivate()
  }

  // Alt 키를 놓으면 자동 선택
  const on_keyup = e => {
    if (e.key === 'Alt' && state.active) {
      selectCurrentAndDeactivate()
    }
  }

  const on_keydown = e => {
    if (e.key === 'Escape' && state.active) {
      e.preventDefault()
      e.stopPropagation()
      deactivate() // ESC = 선택 없이 취소
    }
  }

  const selectCurrentAndDeactivate = () => {
    const target = state.currentElement
    deactivate()

    if (target && !isOffBounds(target)) {
      // 기존 선택 해제 후 깊이 요소 선택
      selectorEngine.unselect_all({ silent: true })
      selectorEngine.select(target)
    }
  }

  const updateOverlays = () => {
    removeOverlays()

    const element = state.currentChain[state.currentDepth]
    if (!element) return

    state.currentElement = element

    // 주요 요소 오버레이
    const primaryOverlay = document.createElement('visbug-depth-highlight')
    const tag = element.tagName.toLowerCase()
    const depthLabel = `${tag} 깊이 ${state.currentDepth}/${state.currentChain.length - 1}`

    primaryOverlay.position = {
      el: element,
      node_label_id: 'depth-primary',
      isPrimary: true,
      depthLabel,
    }

    document.body.appendChild(primaryOverlay)
    state.overlays.push(primaryOverlay)

    // 형제 요소 오버레이
    const siblings = getSiblingsAtDepth(element)
    siblings.forEach((sibling, i) => {
      const siblingOverlay = document.createElement('visbug-depth-highlight')
      siblingOverlay.position = {
        el: sibling,
        node_label_id: `depth-sibling-${i}`,
        isPrimary: false,
        depthLabel: null,
      }

      document.body.appendChild(siblingOverlay)
      state.overlays.push(siblingOverlay)
    })
  }

  const removeOverlays = () => {
    state.overlays.forEach(overlay => {
      try { overlay.hidePopover && overlay.hidePopover() } catch(e) {}
      overlay.remove()
    })
    state.overlays = []
  }

  const deactivate = () => {
    if (state.rafId) cancelAnimationFrame(state.rafId)
    removeOverlays()

    state.active = false
    state.currentDepth = 0
    state.currentChain = []
    state.currentElement = null
  }

  // 이벤트 리스너 등록
  // click은 document에 등록 → body의 selectable보다 capture 단계에서 먼저 실행
  document.addEventListener('click', on_click, true)
  document.addEventListener('keyup', on_keyup)
  document.addEventListener('keydown', on_keydown, true)
  page.addEventListener('wheel', on_wheel, { passive: false })
  page.addEventListener('mousemove', on_mousemove)

  // 클린업 함수 반환
  return () => {
    deactivate()
    document.removeEventListener('click', on_click, true)
    document.removeEventListener('keyup', on_keyup)
    document.removeEventListener('keydown', on_keydown, true)
    page.removeEventListener('wheel', on_wheel)
    page.removeEventListener('mousemove', on_mousemove)
  }
}
