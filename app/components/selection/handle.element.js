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
    this.button.addEventListener('pointerdown', this.on_element_resize_start.bind(this))

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

    // Shift+드래그: scale 모드 (하위 요소 포함 비율 조정)
    const useScaleMode = e.shiftKey

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

    document.addEventListener('pointermove', on_element_resize_move)

    function on_element_resize_move(e) {
      e.preventDefault()
      e.stopPropagation()

      const newX = clamp(0, e.clientX, document.documentElement.clientWidth)
      const newY = clamp(0, e.clientY, document.documentElement.clientHeight)
    
      const diffX = newX - initialX
      const diffY = newY - initialY

      // Scale 모드: transform scale로 하위 요소 포함 비율 유지 크기 조정
      if (useScaleMode) {
        let scaleX, scaleY, originX, originY

        switch (placement) {
          case 'top-start':
            scaleX = (initialWidth - diffX) / initialWidth
            scaleY = (initialHeight - diffY) / initialHeight
            originX = '100%'; originY = '100%'
            break
          case 'top-center':
            scaleX = 1
            scaleY = (initialHeight - diffY) / initialHeight
            originX = '50%'; originY = '100%'
            break
          case 'top-end':
            scaleX = (initialWidth + diffX) / initialWidth
            scaleY = (initialHeight - diffY) / initialHeight
            originX = '0%'; originY = '100%'
            break
          case 'middle-start':
            scaleX = (initialWidth - diffX) / initialWidth
            scaleY = 1
            originX = '100%'; originY = '50%'
            break
          case 'middle-end':
            scaleX = (initialWidth + diffX) / initialWidth
            scaleY = 1
            originX = '0%'; originY = '50%'
            break
          case 'bottom-start':
            scaleX = (initialWidth - diffX) / initialWidth
            scaleY = (initialHeight + diffY) / initialHeight
            originX = '100%'; originY = '0%'
            break
          case 'bottom-center':
            scaleX = 1
            scaleY = (initialHeight + diffY) / initialHeight
            originX = '50%'; originY = '0%'
            break
          case 'bottom-end':
            scaleX = (initialWidth + diffX) / initialWidth
            scaleY = (initialHeight + diffY) / initialHeight
            originX = '0%'; originY = '0%'
            break
        }

        // 코너 핸들: 대각선 거리 기반 균일 스케일 (비율 유지)
        const isCorner = !placement.includes('middle') && !placement.includes('center')
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

      switch (placement) {
        case 'top-start': {
          const newWidth = initialWidth - diffX
          const newHeight = initialHeight - diffY
          const newTranslate = initialTransform.translate(diffX, diffY).transformPoint()

          requestAnimationFrame(() => {
            sourceEl.style.width = `${newWidth}px`
            sourceEl.style.height = `${newHeight}px`
            sourceEl.style.transform = `translate(${newTranslate.x}px, ${newTranslate.y}px)`
          })
          break
        }
        case 'top-center': {
          const newHeight = initialHeight - diffY
          const newTranslate = initialTransform.translate(0, diffY).transformPoint()

          requestAnimationFrame(() => {
            sourceEl.style.height = `${newHeight}px`
            sourceEl.style.transform = `translate(${newTranslate.x}px, ${newTranslate.y}px)`
          })
          break
        }
        case 'top-end': {
          const newWidth = initialWidth + diffX
          const newHeight = initialHeight - diffY
          const newTranslate = initialTransform.translate(0, diffY).transformPoint()

          requestAnimationFrame(() => {
            sourceEl.style.width = `${newWidth}px`
            sourceEl.style.height = `${newHeight}px`
            sourceEl.style.transform = `translate(${newTranslate.x}px, ${newTranslate.y}px)`
          })
          break
        }
        case 'middle-start': {
          const newWidth = initialWidth - diffX
          const newTranslate = initialTransform.translate(diffX).transformPoint()

          requestAnimationFrame(() => {
            sourceEl.style.width = `${newWidth}px`
            sourceEl.style.transform = `translate(${newTranslate.x}px, ${newTranslate.y}px)`
          })
          break
        }
        case 'middle-end': {
          const newWidth = initialWidth + diffX

          requestAnimationFrame(() => {
            sourceEl.style.width = `${newWidth}px`
          })
          break
        }
        case 'bottom-start': {
          const newWidth = initialWidth - diffX
          const newHeight = initialHeight + diffY
          const newTranslate = initialTransform.translate(diffX, 0).transformPoint()

          requestAnimationFrame(() => {
            sourceEl.style.width = `${newWidth}px`
            sourceEl.style.height = `${newHeight}px`
            sourceEl.style.transform = `translate(${newTranslate.x}px, ${newTranslate.y}px)`
          })
          break
        }
        case 'bottom-center': {
          const newHeight = initialHeight + diffY

          requestAnimationFrame(() => {
            sourceEl.style.height = `${newHeight}px`
          })
          break
        }
        case 'bottom-end': {
          const newWidth = initialWidth + diffX
          const newHeight = initialHeight + diffY

          requestAnimationFrame(() => {
            sourceEl.style.width = `${newWidth}px`
            sourceEl.style.height = `${newHeight}px`
          })
          break
        }
      }
    }

    document.addEventListener('pointerup', on_element_resize_end, { once: true })
    document.addEventListener('mouseleave', on_element_resize_end, { once: true })

    function on_element_resize_end() {
      document.removeEventListener('pointermove', on_element_resize_move)
      document.body.style.cursor = originalDocumentCursor
      document.body.style.userSelect = originalDocumentUserSelect
      sourceEl.style.transition = originalElTransition

      // 크기 변경 완료 후 현재 스타일 기록 및 undo 스택에 저장
      ChangeTracker.updateCurrent(sourceEl)
      ChangeTracker.pushToUndoStack(sourceEl)
    }
  }

  disconnectedCallback() {
    this.button.removeEventListener('pointerdown', this.on_element_resize_start.bind(this))
  }

  render() {
    return `
      <button type="button" aria-label="Resize"></button>
    `
  }
}

customElements.define('visbug-handle', Handle)
