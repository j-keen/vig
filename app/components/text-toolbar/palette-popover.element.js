// 색상 팔레트 팝오버 - 텍스트 툴바의 글자색/배경색 스와치에서 열림
// A small floating popover: page-color chips + native color input + eyedropper.

import { TinyColor } from '@ctrl/tinycolor'
import { collectPageColors } from '../../utilities/palette'
import { PalettePopoverStyles } from './palette-popover.styles'

function isUndoRedoCombo(e) {
  return (e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)
}

export class PalettePopover extends HTMLElement {
  constructor() {
    super()
    this.$shadow = this.attachShadow({ mode: 'closed' })
    this.onPick = null
    this._boundOutsideClick = this._handleOutsideClick.bind(this)
    this._boundEyedropperClick = null
  }

  connectedCallback() {
    this.$shadow.innerHTML = this.render()
    const style = document.createElement('style')
    style.textContent = PalettePopoverStyles
    this.$shadow.appendChild(style)

    this.style.position = 'absolute'
    this.style.zIndex = '2147483647'
    this.style.display = 'none'

    this.$shadow.addEventListener('keydown', e => { if (!isUndoRedoCombo(e)) e.stopPropagation() })
    this.$shadow.addEventListener('keyup', e => { if (!isUndoRedoCombo(e)) e.stopPropagation() })
    this.$shadow.addEventListener('click', e => e.stopPropagation())

    const swatches = this.$shadow.querySelector('.swatches')
    swatches.addEventListener('click', e => {
      const chip = e.target.closest('[data-hex]')
      if (!chip) return
      this._pick(chip.dataset.hex)
    })

    const colorInput = this.$shadow.querySelector('.native-color')
    colorInput.addEventListener('input', e => this._pick(e.target.value))

    const eyedropperBtn = this.$shadow.querySelector('.eyedropper')
    eyedropperBtn.addEventListener('click', () => this._pickWithEyedropper())
  }

  disconnectedCallback() {
    document.removeEventListener('mousedown', this._boundOutsideClick, true)
  }

  render() {
    return `
      <div class="popover">
        <div class="swatches"></div>
        <div class="row">
          <input class="native-color" type="color" title="색상 선택" value="#000000" />
          <button class="eyedropper" title="스포이드로 페이지 색상 추출" type="button">스포이드</button>
        </div>
      </div>
    `
  }

  _renderSwatches() {
    const swatches = this.$shadow.querySelector('.swatches')
    const colors = collectPageColors()

    if (!colors.length) {
      swatches.innerHTML = `<div class="empty">색상 없음</div>`
      return
    }

    swatches.innerHTML = colors
      .map(hex => `<button class="swatch" type="button" data-hex="${hex}" style="background:${hex}" title="${hex}"></button>`)
      .join('')
  }

  _pick(hex) {
    if (this.onPick) this.onPick(hex)
    const colorInput = this.$shadow.querySelector('.native-color')
    if (colorInput) colorInput.value = hex
  }

  async _pickWithEyedropper() {
    if (typeof window.EyeDropper === 'function') {
      try {
        const dropper = new window.EyeDropper()
        const result = await dropper.open()
        if (result && result.sRGBHex) this._pick(result.sRGBHex)
      } catch (e) {
        // user cancelled - noop
      }
      return
    }

    // Fallback: one-shot capture-phase click anywhere on the page to sample
    // its computed color (background if opaque, otherwise foreground text color).
    this.hide()
    const btn = this.$shadow.querySelector('.eyedropper')
    if (btn) btn.classList.add('picking')

    const handler = e => {
      e.preventDefault()
      e.stopPropagation()
      document.removeEventListener('click', handler, true)
      if (btn) btn.classList.remove('picking')

      const style = window.getComputedStyle(e.target)
      const bg = new TinyColor(style.backgroundColor)
      const chosen = bg.getAlpha() > 0 ? bg : new TinyColor(style.color)

      if (chosen.isValid) this._pick(`#${chosen.toHex()}`)
    }

    document.addEventListener('click', handler, true)
  }

  _handleOutsideClick(e) {
    if (this.style.display === 'none') return
    if (e.composedPath && e.composedPath().includes(this)) return
    this.hide()
  }

  show(x, y, currentColor) {
    this._renderSwatches()

    const colorInput = this.$shadow.querySelector('.native-color')
    if (colorInput && currentColor && /^#[0-9a-f]{6}$/i.test(currentColor))
      colorInput.value = currentColor

    this.style.left = `${x}px`
    this.style.top = `${y}px`
    this.style.display = 'block'

    document.addEventListener('mousedown', this._boundOutsideClick, true)
  }

  hide() {
    this.style.display = 'none'
    document.removeEventListener('mousedown', this._boundOutsideClick, true)
  }
}

customElements.define('visbug-palette', PalettePopover)
