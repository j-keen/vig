// Canva 스타일 플로팅 텍스트 미니 툴바
// Floating mini toolbar for text formatting: bold/italic/underline, font
// size, font family, text/background color, alignment. Applies changes
// through ChangeTracker so every action is undoable with Ctrl+Z.

import { ChangeTracker } from '../../features/change-tracker'
import { collectPageFonts } from '../../utilities/palette'
import { TextToolbarStyles } from './text-toolbar.styles'
import './palette-popover.element'

const FONT_SIZE_STEPS = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48]

const FALLBACK_FONTS = [
  'Arial, sans-serif',
  'Georgia, serif',
  "'Courier New', monospace",
  "'Malgun Gothic', sans-serif",
  "'Noto Sans KR', sans-serif",
]

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function firstFamily(fontFamilyValue) {
  return String(fontFamilyValue || '')
    .split(',')[0]
    .trim()
    .replace(/^['"]|['"]$/g, '')
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function isUndoRedoCombo(e) {
  return (e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)
}

export class TextToolbar extends HTMLElement {
  constructor() {
    super()
    this.$shadow = this.attachShadow({ mode: 'closed' })
    this._elements = []
    this._visible = false
    this._palette = null
  }

  connectedCallback() {
    this.$shadow.innerHTML = this.render()

    const style = document.createElement('style')
    style.textContent = TextToolbarStyles
    this.$shadow.appendChild(style)

    this.style.position = 'absolute'
    this.style.zIndex = '2147483647'
    this.style.display = 'none'

    // Keyboard events inside the toolbar must never leak out to hotkeys-js
    // (so typing in the size input / navigating the font select doesn't
    // trigger page shortcuts) - except Ctrl/Cmd+Z and +Shift+Z, which must
    // keep reaching the global undo/redo handler even when a toolbar
    // control has focus.
    this.$shadow.addEventListener('keydown', e => { if (!isUndoRedoCombo(e)) e.stopPropagation() })
    this.$shadow.addEventListener('keyup', e => { if (!isUndoRedoCombo(e)) e.stopPropagation() })

    this.setupControls()
    this.populateFontFamilies()

    this._onScroll = () => this.position()
    this._onResize = () => this.position()
    window.addEventListener('scroll', this._onScroll, true)
    window.addEventListener('resize', this._onResize)
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this._onScroll, true)
    window.removeEventListener('resize', this._onResize)
  }

  render() {
    return `
      <div class="toolbar" role="toolbar">
        <button class="btn" data-action="bold" title="굵게 (B)"><b>B</b></button>
        <button class="btn" data-action="italic" title="기울임 (I)"><i>I</i></button>
        <button class="btn" data-action="underline" title="밑줄 (U)"><u>U</u></button>
        <span class="sep"></span>
        <button class="btn" data-action="size-dec" title="글꼴 크기 축소">−</button>
        <input class="size-input" type="number" min="1" title="글꼴 크기" />
        <button class="btn" data-action="size-inc" title="글꼴 크기 확대">+</button>
        <span class="sep"></span>
        <select class="font-family" title="글꼴"></select>
        <span class="sep"></span>
        <button class="btn" data-action="text-color" title="글자색"><span class="swatch-dot" data-role="color-dot"></span></button>
        <button class="btn" data-action="bg-color" title="배경색"><span class="swatch-dot" data-role="bg-dot"></span></button>
        <span class="sep"></span>
        <button class="btn" data-action="align-left" title="왼쪽 정렬">L</button>
        <button class="btn" data-action="align-center" title="가운데 정렬">C</button>
        <button class="btn" data-action="align-right" title="오른쪽 정렬">R</button>
      </div>
    `
  }

  setupControls() {
    const toolbar = this.$shadow.querySelector('.toolbar')

    toolbar.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]')
      if (!btn) return
      e.preventDefault()
      e.stopPropagation()
      this.handleAction(btn.dataset.action, btn)
    })

    const sizeInput = this.$shadow.querySelector('.size-input')
    sizeInput.addEventListener('change', e => {
      const value = parseInt(e.target.value, 10)
      if (!value || value < 1) return
      this.applyToTargets(el => { el.style.fontSize = `${value}px` })
    })
    sizeInput.addEventListener('click', e => e.stopPropagation())

    const familySelect = this.$shadow.querySelector('.font-family')
    familySelect.addEventListener('change', e => {
      const value = e.target.value
      if (!value) return
      this.applyToTargets(el => { el.style.fontFamily = value })
    })
    familySelect.addEventListener('click', e => e.stopPropagation())
  }

  populateFontFamilies() {
    const select = this.$shadow.querySelector('.font-family')
    if (!select) return

    const pageFonts = collectPageFonts()

    const pageOptions = pageFonts
      .map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`)
      .join('')

    const fallbackOptions = FALLBACK_FONTS
      .map(f => `<option value="${escapeHtml(f)}">${escapeHtml(firstFamily(f))}</option>`)
      .join('')

    select.innerHTML = `
      <option value="" disabled selected hidden>글꼴 선택</option>
      ${pageOptions ? `<optgroup label="이 페이지의 글꼴">${pageOptions}</optgroup>` : ''}
      <optgroup label="기본 글꼴">${fallbackOptions}</optgroup>
    `
  }

  handleAction(action, btn) {
    const first = this._elements[0]
    if (!first) return
    const computed = window.getComputedStyle(first)

    switch (action) {
      case 'bold': {
        const isBold = parseInt(computed.fontWeight, 10) >= 600 || computed.fontWeight === 'bold'
        this.applyToTargets(el => { el.style.fontWeight = isBold ? '400' : '700' })
        break
      }
      case 'italic': {
        const isItalic = computed.fontStyle === 'italic'
        this.applyToTargets(el => { el.style.fontStyle = isItalic ? 'normal' : 'italic' })
        break
      }
      case 'underline': {
        const isUnderline = computed.textDecorationLine.includes('underline')
        this.applyToTargets(el => { el.style.textDecorationLine = isUnderline ? 'none' : 'underline' })
        break
      }
      case 'size-dec': {
        const current = parseInt(computed.fontSize, 10) || 16
        const smaller = FONT_SIZE_STEPS.filter(s => s < current)
        const next = smaller.length ? smaller[smaller.length - 1] : FONT_SIZE_STEPS[0]
        this.applyToTargets(el => { el.style.fontSize = `${next}px` })
        break
      }
      case 'size-inc': {
        const current = parseInt(computed.fontSize, 10) || 16
        const larger = FONT_SIZE_STEPS.filter(s => s > current)
        const next = larger.length ? larger[0] : FONT_SIZE_STEPS[FONT_SIZE_STEPS.length - 1]
        this.applyToTargets(el => { el.style.fontSize = `${next}px` })
        break
      }
      case 'text-color':
        this.openColorPopover('color', btn)
        break
      case 'bg-color':
        this.openColorPopover('backgroundColor', btn)
        break
      case 'align-left':
        this.applyToTargets(el => { el.style.textAlign = 'left' })
        break
      case 'align-center':
        this.applyToTargets(el => { el.style.textAlign = 'center' })
        break
      case 'align-right':
        this.applyToTargets(el => { el.style.textAlign = 'right' })
        break
    }
  }

  // Resolves the actual style target(s) for the next change. When there is
  // a live (non-collapsed) selection range inside one of our contenteditable
  // elements, wrap that range in a <span> and style just the span so partial
  // text can be formatted independently of its parent.
  getTargets() {
    const sel = window.getSelection && window.getSelection()

    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const range = sel.getRangeAt(0)
      let node = range.commonAncestorContainer
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement

      const editableHost = node && node.closest && node.closest('[contenteditable="true"]')

      if (editableHost) {
        const span = document.createElement('span')
        try {
          range.surroundContents(span)
        } catch (e) {
          const frag = range.extractContents()
          span.appendChild(frag)
          range.insertNode(span)
        }
        return [span]
      }
    }

    return this._elements
  }

  applyToTargets(mutator) {
    const targets = this.getTargets()

    targets.forEach(el => {
      ChangeTracker.captureOriginal(el)
      mutator(el)
      ChangeTracker.updateCurrent(el)
      ChangeTracker.pushToUndoStack(el)
    })

    this.syncControlsFromSelection()
    this.position()
    return targets
  }

  ensurePalette() {
    if (!this._palette) {
      this._palette = document.createElement('visbug-palette')
      document.body.appendChild(this._palette)
    }
    return this._palette
  }

  openColorPopover(prop, anchorBtn) {
    const palette = this.ensurePalette()
    const rect = anchorBtn.getBoundingClientRect()
    const scrollX = window.scrollX || window.pageXOffset
    const scrollY = window.scrollY || window.pageYOffset

    const first = this._elements[0]
    const current = first
      ? ChangeTracker.cssColorToHex(window.getComputedStyle(first)[prop])
      : null

    palette.onPick = hex => {
      this.applyToTargets(el => { el.style[prop] = hex })
    }

    palette.show(rect.left + scrollX, rect.bottom + scrollY + 6, current)
  }

  syncControlsFromSelection() {
    const el = this._elements[0]
    if (!el) return

    const style = window.getComputedStyle(el)
    const shadow = this.$shadow

    const boldBtn = shadow.querySelector('[data-action="bold"]')
    if (boldBtn) boldBtn.classList.toggle('active',
      parseInt(style.fontWeight, 10) >= 600 || style.fontWeight === 'bold')

    const italicBtn = shadow.querySelector('[data-action="italic"]')
    if (italicBtn) italicBtn.classList.toggle('active', style.fontStyle === 'italic')

    const underlineBtn = shadow.querySelector('[data-action="underline"]')
    if (underlineBtn) underlineBtn.classList.toggle('active', style.textDecorationLine.includes('underline'))

    const sizeInput = shadow.querySelector('.size-input')
    if (sizeInput) sizeInput.value = parseInt(style.fontSize, 10) || ''

    const familySelect = shadow.querySelector('.font-family')
    if (familySelect) {
      const current = firstFamily(style.fontFamily)
      const hasOption = [...familySelect.options].some(o => firstFamily(o.value) === current)
      if (hasOption) familySelect.value = [...familySelect.options].find(o => firstFamily(o.value) === current).value
    }

    ;['left', 'center', 'right'].forEach(dir => {
      const btn = shadow.querySelector(`[data-action="align-${dir}"]`)
      if (!btn) return
      const matches = style.textAlign === dir || (dir === 'left' && (style.textAlign === 'start' || style.textAlign === ''))
      btn.classList.toggle('active', matches)
    })

    const colorDot = shadow.querySelector('[data-role="color-dot"]')
    if (colorDot) colorDot.style.background = ChangeTracker.cssColorToHex(style.color) || '#000000'

    const bgDot = shadow.querySelector('[data-role="bg-dot"]')
    if (bgDot) {
      const bgHex = ChangeTracker.cssColorToHex(style.backgroundColor)
      bgDot.style.background = (!bgHex || bgHex === '#00000000') ? 'transparent' : bgHex
    }
  }

  position() {
    if (!this._visible || !this._elements.length) return

    const rects = this._elements
      .filter(el => el && el.isConnected)
      .map(el => el.getBoundingClientRect())

    if (!rects.length) { this.hide(); return }

    const top = Math.min(...rects.map(r => r.top))
    const left = Math.min(...rects.map(r => r.left))
    const right = Math.max(...rects.map(r => r.right))

    const selfRect = this.getBoundingClientRect()
    const width = selfRect.width || 300
    const height = selfRect.height || 36

    const scrollX = window.scrollX || window.pageXOffset
    const scrollY = window.scrollY || window.pageYOffset

    let viewportX = left + (right - left) / 2 - width / 2
    let viewportY = top - height - 10

    // keep inside the viewport - flip below the element when there's no room above
    if (viewportY < 4) viewportY = clamp(top + 10, 4, window.innerHeight - height - 4)
    viewportX = clamp(viewportX, 4, Math.max(4, window.innerWidth - width - 4))

    this.style.left = `${viewportX + scrollX}px`
    this.style.top = `${viewportY + scrollY}px`
  }

  showFor(elements) {
    this._elements = (elements || []).filter(el => el && el.isConnected)

    if (!this._elements.length) {
      this.hide()
      return
    }

    this.populateFontFamilies()
    this.style.display = 'block'
    this._visible = true
    this.syncControlsFromSelection()
    this.position()
  }

  hide() {
    this._visible = false
    this.style.display = 'none'
    if (this._palette) this._palette.hide()
  }
}

customElements.define('visbug-text-toolbar', TextToolbar)
