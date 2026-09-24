// 패널 자유 이동 유틸
//   makeMovable({ host, handle, key })
//     host   : position:fixed 인 패널 호스트 요소 (visbug-props 등)
//     handle : 드래그 손잡이 (보통 shadow root 안의 헤더). 생략하면 host 전체
//     key    : 위치 저장 키 ('props' | 'history' | 'toolbar' ...). Settings.positions 에 저장
//   반환값: teardown 함수
//
//   - 저장된 위치가 있으면 복원(뷰포트 안으로 클램프), 없으면 CSS 기본 위치 유지
//   - 드래그 중에는 host 에 data-dragging 속성이 붙는다 (스타일용)
//   - 버튼/입력/링크 위에서 시작한 pointerdown 은 무시한다 (클릭 동작 보존)

import { Settings } from '../features/settings'

const INTERACTIVE = 'button, input, select, textarea, a, [contenteditable="true"], [data-no-drag]'
const MARGIN = 4

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

const clampToViewport = (host, left, top) => {
  const w = host.offsetWidth || 0
  const h = host.offsetHeight || 0
  return {
    left: clamp(left, MARGIN, Math.max(MARGIN, window.innerWidth - w - MARGIN)),
    top:  clamp(top,  MARGIN, Math.max(MARGIN, window.innerHeight - Math.min(h, 48) - MARGIN)),
  }
}

export function applySavedPosition(host, key) {
  const saved = Settings.getPanelPosition(key)
  if (!saved) return false
  const { left, top } = clampToViewport(host, saved.left, saved.top)
  host.style.left   = `${left}px`
  host.style.top    = `${top}px`
  host.style.right  = 'auto'
  host.style.bottom = 'auto'
  return true
}

export function makeMovable({ host, handle, key }) {
  if (!host) return () => {}
  const grip = handle || host
  let drag = null

  applySavedPosition(host, key)
  grip.style.cursor = grip.style.cursor || 'grab'
  grip.style.touchAction = 'none'

  const onDown = e => {
    if (e.button !== 0) return
    const path = e.composedPath ? e.composedPath() : [e.target]
    if (path.some(n => n !== grip && n.matches && n.matches(INTERACTIVE))) return

    const rect = host.getBoundingClientRect()
    drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, moved: false }
    host.setAttribute('data-dragging', 'true')
    grip.setPointerCapture && grip.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  const onMove = e => {
    if (!drag) return
    const { left, top } = clampToViewport(host, e.clientX - drag.dx, e.clientY - drag.dy)
    host.style.left   = `${left}px`
    host.style.top    = `${top}px`
    host.style.right  = 'auto'
    host.style.bottom = 'auto'
    drag.moved = true
  }

  const onUp = e => {
    if (!drag) return
    const wasMoved = drag.moved
    drag = null
    host.removeAttribute('data-dragging')
    grip.releasePointerCapture && e.pointerId != null && grip.hasPointerCapture && grip.hasPointerCapture(e.pointerId) && grip.releasePointerCapture(e.pointerId)
    if (wasMoved) {
      const rect = host.getBoundingClientRect()
      Settings.setPanelPosition(key, { left: Math.round(rect.left), top: Math.round(rect.top) })
    }
  }

  const onResize = () => {
    if (!host.style.left) return
    const { left, top } = clampToViewport(host, parseFloat(host.style.left), parseFloat(host.style.top))
    host.style.left = `${left}px`
    host.style.top  = `${top}px`
  }

  // 위치 초기화(Settings.resetPanelPositions) 시 CSS 기본 위치로 복귀
  const offSettings = Settings.onChange(s => {
    if (!s.positions[key] && host.style.left) {
      host.style.left = host.style.top = host.style.right = host.style.bottom = ''
    }
  })

  grip.addEventListener('pointerdown', onDown)
  grip.addEventListener('pointermove', onMove)
  grip.addEventListener('pointerup', onUp)
  grip.addEventListener('pointercancel', onUp)
  window.addEventListener('resize', onResize)

  return () => {
    grip.removeEventListener('pointerdown', onDown)
    grip.removeEventListener('pointermove', onMove)
    grip.removeEventListener('pointerup', onUp)
    grip.removeEventListener('pointercancel', onUp)
    window.removeEventListener('resize', onResize)
    offSettings()
  }
}

export const PanelDock = { makeMovable, applySavedPosition }
