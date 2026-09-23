import $ from 'blingblingjs'
import { HandleStyles } from '../styles.store'
import { clamp } from '../../utilities/numbers'
import { ChangeTracker } from '../../features/index.js'

export class Handle extends HTMLElement {

  constructor() {
    super()
    this.$shadow = this.attachShadow({mode: 'closed'})
    this.styles = [HandleStyles]
  }

  connectedCallback() {
    this.$shadow.adoptedStyleSheets = this.styles
    this.$shadow.innerHTML = this.render()
    
    this.button = this.$shadow.querySelector('button')
    this._onResizeStart = this.on_element_resize_start.bind(this)
    this.button.addEventListener('pointerdown', this._onResizeStart)

    this.placement = this.getAttribute('placement')
  }

  static get observedAttributes() {
    return ['placement']
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'placement') {
      this.placement = newValue
    }
  }

  on_element_resize_start(e) {
    e.preventDefault()
    e.stopPropagation()

    if (e.button !== 0) return

    const placement = this.placement
    const handlesEl = e.composedPath().find(el => el.tagName === 'VISBUG-HANDLES')
    const nodeLabelId = handlesEl.getAttribute('data-label-id')
    const [sourceEl] = $(`[data-label-id="${nodeLabelId}"]`)

    if (!sourceEl) return

    // 크기 변경 전 원본 스타일 캡처
    ChangeTracker.captureOriginal(sourceEl)

    const { x: initialX, y: initialY } = e
    const initialStyle = getComputedStyle(sourceEl)
    const initialWidth = parseFloat(initialStyle.width)
    const initialHeight = parseFloat(initialStyle.height)
    const initialTransform = new DOMMatrix(initialStyle.transform)
    const initialDiagonal = Math.sqrt(initialWidth ** 2 + initialHeight ** 2)
    const aspectRatio = initialHeight > 0 ? initialWidth / initialHeight : 1

    const hasStart  = placement.endsWith('-start')
    const hasEnd    = placement.endsWith('-end')
    const hasTop    = placement.startsWith('top')
    const hasBottom = placement.startsWith('bottom')
    const isCorner  = (hasStart || hasEnd) && (hasTop || hasBottom)

    // 조합키 (Figma 방식)
    //   기본(모서리): 비율 유지 / Shift: 자유 비율 / Alt: 중심 기준 / Shift+Alt: 자식 포함 배율(transform scale)
    const useScaleMode = e.shiftKey && e.altKey
    const modifiers = { shift: e.shiftKey, alt: e.altKey }

    // flex/grid 자식 요소의 크기 제약 해제 (일반 모드에서만)
    if (!useScaleMode) {
      const parentDisplay = sourceEl.parentElement
        ? getComputedStyle(sourceEl.parentElement).display
        : ''
      const isFlex = parentDisplay.includes('flex')
      const isGrid = parentDisplay.includes('grid')

      if (isFlex) {
        sourceEl.style.flexGrow = '0'
        sourceEl.style.flexShrink = '0'
        sourceEl.style.flexBasis = 'auto'
      }

      if (isFlex || isGrid) {
        sourceEl.style.minWidth = '0'
        sourceEl.style.maxWidth = 'none'
        sourceEl.style.minHeight = '0'
        sourceEl.style.maxHeight = 'none'
      }
    }

    const originalElTransition = sourceEl.style.transition
    const originalDocumentCursor = document.body.style.cursor
    const originalDocumentUserSelect = document.body.style.userSelect
    sourceEl.style.transition = 'none'
    document.body.style.cursor = getComputedStyle(this).getPropertyValue('--cursor')
    document.body.style.userSelect = 'none'

    // 드래그 도중 조합키를 바꿔도 반영되도록 키 상태 추적
    const onKeyChange = ev => {
      modifiers.shift = ev.shiftKey
      modifiers.alt   = ev.altKey
    }
    document.addEventListener('keydown', onKeyChange, true)
    document.addEventListener('keyup', onKeyChange, true)

    document.addEventListener('pointermove', on_element_resize_move)

    function on_element_resize_move(e) {
      e.preventDefault()
      e.stopPropagation()

      const newX = clamp(0, e.clientX, document.documentElement.clientWidth)
      const newY = clamp(0, e.clientY, document.documentElement.clientHeight)

      const diffX = newX - initialX
      const diffY = newY - initialY

      // Shift+Alt: transform scale로 하위 요소 포함 비율 유지 크기 조정
      if (useScaleMode) {
        let scaleX = 1, scaleY = 1
        let originX = '50%', originY = '50%'

        if (hasStart) { scaleX = (initialWidth - diffX) / initialWidth; originX = '100%' }
        if (hasEnd)   { scaleX = (initialWidth + diffX) / initialWidth; originX = '0%' }
        if (hasTop)   { scaleY = (initialHeight - diffY) / initialHeight; originY = '100%' }
        if (hasBottom){ scaleY = (initialHeight + diffY) / initialHeight; originY = '0%' }

        // 코너 핸들: 대각선 거리 기반 균일 스케일 (비율 유지)
        if (isCorner) {
          const newDiag = Math.sqrt((initialWidth * scaleX) ** 2 + (initialHeight * scaleY) ** 2)
          const uniformScale = newDiag / initialDiagonal
          scaleX = uniformScale
          scaleY = uniformScale
        }

        scaleX = Math.max(0.1, scaleX)
        scaleY = Math.max(0.1, scaleY)

        requestAnimationFrame(() => {
          sourceEl.style.transformOrigin = `${originX} ${originY}`
          sourceEl.style.transform = `scale(${scaleX}, ${scaleY})`
        })
        return
      }

      const { width, height, tx, ty } = computeResize({
        placement, initialWidth, initialHeight, diffX, diffY, aspectRatio,
        proportional: isCorner && !modifiers.shift,
        fromCenter: modifiers.alt,
      })

      const newTranslate = initialTransform.translate(tx, ty).transformPoint()
      const touchesWidth  = hasStart || hasEnd || isCorner || modifiers.alt
      const touchesHeight = hasTop || hasBottom || isCorner || modifiers.alt

      requestAnimationFrame(() => {
        if (touchesWidth)  sourceEl.style.width  = `${width}px`
        if (touchesHeight) sourceEl.style.height = `${height}px`
        if (tx || ty || sourceEl.style.transform)
          sourceEl.style.transform = `translate(${newTranslate.x}px, ${newTranslate.y}px)`
      })
    }

    document.addEventListener('pointerup', on_element_resize_end, { once: true })
    document.addEventListener('mouseleave', on_element_resize_end, { once: true })

    function on_element_resize_end() {
      document.removeEventListener('pointermove', on_element_resize_move)
      document.removeEventListener('keydown', onKeyChange, true)
      document.removeEventListener('keyup', onKeyChange, true)
      document.body.style.cursor = originalDocumentCursor
      document.body.style.userSelect = originalDocumentUserSelect
      sourceEl.style.transition = originalElTransition

      // 크기 변경 완료 후 현재 스타일 기록 및 undo 스택에 저장
      ChangeTracker.updateCurrent(sourceEl)
      ChangeTracker.pushToUndoStack(sourceEl)
    }
  }

  disconnectedCallback() {
    if (this.button && this._onResizeStart)
      this.button.removeEventListener('pointerdown', this._onResizeStart)
  }

  render() {
    return `
      <button type="button" aria-label="Resize"></button>
    `
  }
}

// 핸들 위치·조합키에 따른 새 크기와 이동량 계산 (순수 함수, 테스트용 export)
//   proportional: 모서리 핸들에서 가로세로 비율 유지
//   fromCenter:   중심을 고정하고 양쪽으로 확장 (Alt)
export function computeResize({
  placement, initialWidth, initialHeight, diffX, diffY, aspectRatio,
  proportional = false, fromCenter = false,
}) {
  const hasStart  = placement.endsWith('-start')
  const hasEnd    = placement.endsWith('-end')
  const hasTop    = placement.startsWith('top')
  const hasBottom = placement.startsWith('bottom')
  const ratio = aspectRatio || (initialHeight > 0 ? initialWidth / initialHeight : 1)

  const factor = fromCenter ? 2 : 1
  let width  = initialWidth
  let height = initialHeight

  if (hasStart)  width  = initialWidth  - diffX * factor
  if (hasEnd)    width  = initialWidth  + diffX * factor
  if (hasTop)    height = initialHeight - diffY * factor
  if (hasBottom) height = initialHeight + diffY * factor

  if (proportional) {
    const dw = Math.abs(width  - initialWidth)  / (initialWidth  || 1)
    const dh = Math.abs(height - initialHeight) / (initialHeight || 1)
    if (dw >= dh) height = width / ratio
    else          width  = height * ratio
  }

  width  = Math.max(1, width)
  height = Math.max(1, height)

  let tx = 0, ty = 0
  if (fromCenter) {
    tx = -(width  - initialWidth)  / 2
    ty = -(height - initialHeight) / 2
  }
  else {
    if (hasStart) tx = initialWidth  - width
    if (hasTop)   ty = initialHeight - height
  }

  // -0 정규화
  return { width, height, tx: tx || 0, ty: ty || 0 }
}

if (typeof window !== 'undefined') {
  window.DesignPokeResize = { computeResize }
}

customElements.define('visbug-handle', Handle)
