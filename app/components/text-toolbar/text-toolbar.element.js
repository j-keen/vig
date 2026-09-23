// Canva 스타일 플로팅 텍스트 미니 툴바
// Floating mini toolbar for text formatting: bold/italic/underline, font
// size gauge, font family, text/background color, alignment, and a
// collapsible row of line-height/letter-spacing/opacity sliders.
//
// Every value change goes through ChangeTracker so it's undoable with
// Ctrl+Z, but continuous gestures (typing in the size field, dragging a
// slider, hovering a font/color option) only preview live and commit
// (captureOriginal -> ... -> updateCurrent + pushToUndoStack) exactly once,
// on release/blur/Enter/click - see beginLiveEdit/previewLive/commitLiveEdit
// below. Escape cancels back to the last committed value.

import { ChangeTracker } from '../../features/change-tracker'
import { collectPageFonts } from '../../utilities/palette'
import { showPropHint, hidePropHint } from '../../features/prop-hint'
import { TextToolbarStyles } from './text-toolbar.styles'
import './palette-popover.element'

const FONT_SIZE_MIN = 8
const FONT_SIZE_MAX = 96

const LINE_HEIGHT_MIN = 0.8
const LINE_HEIGHT_MAX = 3

const LETTER_SPACING_MIN = -2
const LETTER_SPACING_MAX = 10

const HINT_HIDE_DELAY = 120
const HOLD_REPEAT_DELAY = 400
const HOLD_REPEAT_INTERVAL = 60

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
    this._live = null
    this._hintTimer = null
    this._fontMenuOutsideHandler = null
    this._fontMenuEscHandler = null
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
    // (so typing in the size input / navigating sliders doesn't trigger
    // page shortcuts) - except Ctrl/Cmd+Z and +Shift+Z, which must keep
    // reaching the global undo/redo handler even when a toolbar control
    // has focus.
    this.$shadow.addEventListener('keydown', e => { if (!isUndoRedoCombo(e)) e.stopPropagation() })
    this.$shadow.addEventListener('keyup', e => { if (!isUndoRedoCombo(e)) e.stopPropagation() })

    this.setupControls()
    this.setupPropHints()
    this.populateFontFamilies()

    this._onScroll = () => this.position()
    this._onResize = () => this.position()
    window.addEventListener('scroll', this._onScroll, true)
    window.addEventListener('resize', this._onResize)
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this._onScroll, true)
    window.removeEventListener('resize', this._onResize)
    this.abortLiveState()
  }

  render() {
    return `
      <div class="toolbar" role="toolbar">
        <div class="row1">
          <button class="btn" data-action="bold" data-prop="fontWeight" title="굵게 (B)"><b>B</b></button>
          <button class="btn" data-action="italic" data-prop="fontStyle" title="기울임 (I)"><i>I</i></button>
          <button class="btn" data-action="underline" data-prop="textDecorationLine" title="밑줄 (U)"><u>U</u></button>
          <span class="sep"></span>

          <div class="gauge" data-prop="fontSize">
            <button class="stepper" data-step="dec" type="button" title="글꼴 크기 줄이기 (Shift: 10씩, 길게 누르면 계속)">▼</button>
            <input class="size-input" type="number" min="${FONT_SIZE_MIN}" max="${FONT_SIZE_MAX}" title="글꼴 크기 (숫자 입력)" />
            <button class="stepper" data-step="inc" type="button" title="글꼴 크기 늘리기 (Shift: 10씩, 길게 누르면 계속)">▲</button>
            <input class="size-range" type="range" min="${FONT_SIZE_MIN}" max="${FONT_SIZE_MAX}" step="1" title="글꼴 크기 (드래그하여 조정)" />
          </div>

          <span class="sep"></span>

          <div class="font-picker">
            <button class="font-trigger" type="button" title="글꼴 (호버로 미리보기)">글꼴 ▾</button>
            <div class="font-menu" hidden></div>
          </div>

          <span class="sep"></span>

          <button class="btn" data-action="text-color" data-prop="color" title="글자색"><span class="swatch-dot" data-role="color-dot"></span></button>
          <button class="btn" data-action="bg-color" data-prop="backgroundColor" title="배경색"><span class="swatch-dot" data-role="bg-dot"></span></button>
          <span class="sep"></span>
          <button class="btn" data-action="align-left" data-prop="textAlign" title="왼쪽 정렬">L</button>
          <button class="btn" data-action="align-center" data-prop="textAlign" title="가운데 정렬">C</button>
          <button class="btn" data-action="align-right" data-prop="textAlign" title="오른쪽 정렬">R</button>
          <span class="sep"></span>
          <button class="more-toggle" type="button" title="줄 간격 / 자간 / 투명도 더보기">더보기 ▾</button>
        </div>
        <div class="row2" hidden>
          <label class="slider-group" title="줄 간격">
            <span class="slider-label">줄 간격</span>
            <input class="line-height-range" data-prop="lineHeight" type="range" min="${LINE_HEIGHT_MIN}" max="${LINE_HEIGHT_MAX}" step="0.1" title="줄 간격 (드래그하여 조정)" />
          </label>
          <label class="slider-group" title="자간">
            <span class="slider-label">자간</span>
            <input class="letter-spacing-range" data-prop="letterSpacing" type="range" min="${LETTER_SPACING_MIN}" max="${LETTER_SPACING_MAX}" step="0.5" title="자간 (드래그하여 조정)" />
          </label>
          <label class="slider-group" title="투명도">
            <span class="slider-label">투명도</span>
            <input class="opacity-range" data-prop="opacity" type="range" min="0" max="100" step="1" title="투명도 (드래그하여 조정)" />
          </label>
        </div>
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

    // stop pointerdown on any control from being treated as a page click too
    toolbar.addEventListener('pointerdown', e => e.stopPropagation())

    this.setupSizeGauge()
    this.setupFontPicker()
    this.setupMoreToggle()

    this.setupSlider({
      selector: '.line-height-range',
      prop: 'lineHeight',
      format: v => v.toFixed(1),
      apply: v => v.toFixed(1),
    })

    this.setupSlider({
      selector: '.letter-spacing-range',
      prop: 'letterSpacing',
      format: v => `${v}px`,
      apply: v => `${v}px`,
    })

    this.setupSlider({
      selector: '.opacity-range',
      prop: 'opacity',
      format: v => `${Math.round(v)}%`,
      apply: v => String(v / 100),
    })
  }

  // Generic hover/focus -> showPropHint wiring for every control that
  // declares a `data-prop`. Live gestures (sliders/inputs) additionally
  // call showHintFor() with the *live* value from their own input handler.
  setupPropHints() {
    this.$shadow.querySelectorAll('[data-prop]').forEach(node => {
      const prop = node.dataset.prop
      const show = () => this.showHintFor(prop, this.currentDisplayValue(prop))
      node.addEventListener('mouseenter', show)
      node.addEventListener('focus', show)
      node.addEventListener('mouseleave', () => this.scheduleHideHint())
      node.addEventListener('blur', () => this.scheduleHideHint())
    })
  }

  setupSizeGauge() {
    const numberInput = this.$shadow.querySelector('.size-input')
    const rangeInput = this.$shadow.querySelector('.size-range')
    const decBtn = this.$shadow.querySelector('[data-step="dec"]')
    const incBtn = this.$shadow.querySelector('[data-step="inc"]')

    const format = raw => `${Math.round(clamp(raw, FONT_SIZE_MIN, FONT_SIZE_MAX))}px`

    const syncSizeInputs = raw => {
      const rounded = Math.round(clamp(raw, FONT_SIZE_MIN, FONT_SIZE_MAX))
      numberInput.value = rounded
      rangeInput.value = rounded
    }

    numberInput.addEventListener('input', () => {
      const raw = parseFloat(numberInput.value)
      if (Number.isNaN(raw)) return
      const value = format(raw)
      this.previewLive('fontSize', () => value)
      rangeInput.value = clamp(raw, FONT_SIZE_MIN, FONT_SIZE_MAX)
      this.showHintFor('fontSize', value)
    })
    numberInput.addEventListener('change', () => this.commitLiveEdit())
    numberInput.addEventListener('blur', () => this.commitLiveEdit())
    numberInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { this.commitLiveEdit(); numberInput.blur() }
      else if (e.key === 'Escape') { this.cancelLiveEdit(); numberInput.blur() }
    })
    numberInput.addEventListener('click', e => e.stopPropagation())

    rangeInput.addEventListener('pointerdown', () => this.beginLiveEdit('fontSize'))
    rangeInput.addEventListener('input', () => {
      const raw = parseFloat(rangeInput.value)
      const value = format(raw)
      this.previewLive('fontSize', () => value)
      numberInput.value = Math.round(raw)
      this.showHintFor('fontSize', value)
    })
    rangeInput.addEventListener('change', () => this.commitLiveEdit())
    rangeInput.addEventListener('pointerup', () => this.commitLiveEdit())
    rangeInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.cancelLiveEdit()
    })

    let holdTimeout = null
    let holdInterval = null

    const step = (dir, shiftKey) => {
      this.beginLiveEdit('fontSize')
      const first = this._elements[0]
      if (!first) return
      const current = parseFloat(window.getComputedStyle(first).fontSize) || 16
      const amount = shiftKey ? 10 : 1
      const next = clamp(current + dir * amount, FONT_SIZE_MIN, FONT_SIZE_MAX)
      const value = format(next)
      this.previewLive('fontSize', () => value)
      syncSizeInputs(next)
      this.showHintFor('fontSize', value)
    }

    const startHold = (dir, e) => {
      step(dir, e.shiftKey)
      clearTimeout(holdTimeout)
      clearInterval(holdInterval)
      holdTimeout = setTimeout(() => {
        holdInterval = setInterval(() => step(dir, e.shiftKey), HOLD_REPEAT_INTERVAL)
      }, HOLD_REPEAT_DELAY)
    }

    const stopHold = () => {
      clearTimeout(holdTimeout)
      clearInterval(holdInterval)
      holdTimeout = null
      holdInterval = null
      this.commitLiveEdit()
    }

    ;[[decBtn, -1], [incBtn, 1]].forEach(([btn, dir]) => {
      btn.addEventListener('pointerdown', e => {
        e.preventDefault()
        try { btn.setPointerCapture(e.pointerId) } catch (err) { /* ignore */ }
        startHold(dir, e)
      })
      btn.addEventListener('pointerup', stopHold)
      btn.addEventListener('pointercancel', stopHold)
    })
  }

  // Wires a <input type="range"> to a style property with the standard
  // begin-on-touch / preview-on-input / commit-once-on-release contract.
  setupSlider({ selector, prop, format, apply }) {
    const input = this.$shadow.querySelector(selector)
    if (!input) return

    input.addEventListener('pointerdown', () => this.beginLiveEdit(prop))
    input.addEventListener('input', () => {
      const raw = parseFloat(input.value)
      if (Number.isNaN(raw)) return
      const value = apply(raw)
      this.previewLive(prop, () => value)
      this.showHintFor(prop, format(raw))
    })
    input.addEventListener('change', () => this.commitLiveEdit())
    input.addEventListener('pointerup', () => this.commitLiveEdit())
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.cancelLiveEdit()
    })
  }

  setupMoreToggle() {
    const toggle = this.$shadow.querySelector('.more-toggle')
    const row2 = this.$shadow.querySelector('.row2')

    toggle.addEventListener('click', e => {
      e.stopPropagation()
      const willShow = row2.hasAttribute('hidden')
      if (willShow) row2.removeAttribute('hidden')
      else row2.setAttribute('hidden', '')
      toggle.textContent = willShow ? '간략히 ▴' : '더보기 ▾'
      toggle.title = willShow ? '간략히 보기' : '줄 간격 / 자간 / 투명도 더보기'
      this.position()
    })
  }

  setupFontPicker() {
    const trigger = this.$shadow.querySelector('.font-trigger')

    trigger.addEventListener('click', e => {
      e.stopPropagation()
      const menu = this.$shadow.querySelector('.font-menu')
      if (menu.hasAttribute('hidden')) this.openFontMenu()
      else this.closeFontMenu()
    })
  }

  openFontMenu() {
    const menu = this.$shadow.querySelector('.font-menu')
    const pageFonts = collectPageFonts()

    let html = ''
    if (pageFonts.length) {
      html += `<div class="font-menu-group">이 페이지의 글꼴</div>`
      html += pageFonts
        .map(f => `<div class="font-menu-row" data-value="${escapeHtml(f)}" style="font-family:${escapeHtml(f)}">${escapeHtml(f)}</div>`)
        .join('')
    }
    html += `<div class="font-menu-group">기본 글꼴</div>`
    html += FALLBACK_FONTS
      .map(f => `<div class="font-menu-row" data-value="${escapeHtml(f)}" style="font-family:${escapeHtml(f)}">${escapeHtml(firstFamily(f))}</div>`)
      .join('')

    menu.innerHTML = html

    this.beginLiveEdit('fontFamily')

    menu.querySelectorAll('.font-menu-row').forEach(row => {
      row.addEventListener('mouseenter', () => {
        const value = row.dataset.value
        this.previewLive('fontFamily', () => value)
        this.showHintFor('fontFamily', firstFamily(value))
      })
      row.addEventListener('mouseleave', () => {
        this.revertPreview('fontFamily')
        this.scheduleHideHint()
      })
      row.addEventListener('click', e => {
        e.stopPropagation()
        const value = row.dataset.value
        this.previewLive('fontFamily', () => value)
        this.commitLiveEdit()
        this.closeFontMenu()
      })
    })

    menu.removeAttribute('hidden')

    this._fontMenuOutsideHandler = e => {
      const trigger = this.$shadow.querySelector('.font-trigger')
      const path = e.composedPath ? e.composedPath() : []
      if (path.includes(trigger) || path.includes(menu)) return
      this.closeFontMenu()
    }
    this._fontMenuEscHandler = e => {
      if (e.key === 'Escape') this.closeFontMenu()
    }

    window.addEventListener('mousedown', this._fontMenuOutsideHandler, true)
    window.addEventListener('keydown', this._fontMenuEscHandler, true)
  }

  closeFontMenu() {
    const menu = this.$shadow.querySelector('.font-menu')
    if (!menu || menu.hasAttribute('hidden')) return

    menu.setAttribute('hidden', '')

    if (this._fontMenuOutsideHandler) {
      window.removeEventListener('mousedown', this._fontMenuOutsideHandler, true)
      this._fontMenuOutsideHandler = null
    }
    if (this._fontMenuEscHandler) {
      window.removeEventListener('keydown', this._fontMenuEscHandler, true)
      this._fontMenuEscHandler = null
    }

    // if the menu closed without a click-to-select, revert any hover preview
    if (this._live && this._live.prop === 'fontFamily') this.cancelLiveEdit()
    this.scheduleHideHint()
  }

  populateFontFamilies() {
    // kept for the trigger label sync; the actual options are (re)built
    // lazily in openFontMenu() so they always reflect the latest page fonts.
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

  // ---- one-shot (discrete) changes: bold/italic/underline/align/colors ----

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

  // ---- continuous (live-preview) gestures: size/family/color ----
  //
  // beginLiveEdit captures the original style exactly once per gesture.
  // previewLive applies a value directly to the live DOM without touching
  // ChangeTracker (so it never flickers the undo stack). commitLiveEdit
  // finalizes with a single updateCurrent+pushToUndoStack per element.
  // cancelLiveEdit/revertPreview roll the live DOM value back.

  beginLiveEdit(prop) {
    if (this._live && this._live.prop === prop) return this._live
    if (this._live) this.cancelLiveEdit()

    const targets = this.getTargets()
    const previousValues = new Map()
    targets.forEach(el => {
      ChangeTracker.captureOriginal(el)
      previousValues.set(el, el.style[prop] || '')
    })

    this._live = { prop, targets, previousValues }
    return this._live
  }

  previewLive(prop, valueFn) {
    const live = this.beginLiveEdit(prop)
    live.targets.forEach(el => { el.style[prop] = valueFn(el) })
  }

  revertPreview(prop) {
    const live = this._live
    if (!live || live.prop !== prop) return
    live.targets.forEach(el => { el.style[prop] = live.previousValues.get(el) || '' })
  }

  commitLiveEdit() {
    if (!this._live) return
    const { targets } = this._live

    targets.forEach(el => {
      ChangeTracker.updateCurrent(el)
      ChangeTracker.pushToUndoStack(el)
    })

    this._live = null
    this.syncControlsFromSelection()
    this.position()
  }

  cancelLiveEdit() {
    if (!this._live) return
    const { prop, targets, previousValues } = this._live

    targets.forEach(el => {
      el.style[prop] = previousValues.get(el) || ''
      ChangeTracker.updateCurrent(el)
    })

    this._live = null
    this.syncControlsFromSelection()
    this.position()
  }

  abortLiveState() {
    this.closeFontMenu()
    if (this._live) this.cancelLiveEdit()
    clearTimeout(this._hintTimer)
    hidePropHint()
  }

  // ---- color popover wiring ----

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

    this.beginLiveEdit(prop)

    const first = this._elements[0]
    const current = first
      ? ChangeTracker.cssColorToHex(window.getComputedStyle(first)[prop])
      : null

    palette.onPreview = hex => {
      this.previewLive(prop, () => hex)
      this.showHintFor(prop, hex)
    }
    palette.onCommit = hex => {
      this.previewLive(prop, () => hex)
      this.commitLiveEdit()
    }
    palette.onCancel = () => {
      this.revertPreview(prop)
      this.scheduleHideHint()
    }

    palette.show(rect.left + scrollX, rect.bottom + scrollY + 6, current)
  }

  // ---- prop-hint helpers ----

  currentDisplayValue(prop) {
    const el = this._elements[0]
    if (!el) return ''
    const cs = window.getComputedStyle(el)

    switch (prop) {
      case 'color':
      case 'backgroundColor':
        return ChangeTracker.cssColorToHex(cs[prop]) || cs[prop]
      case 'opacity': {
        const op = parseFloat(cs.opacity)
        return `${Math.round((Number.isNaN(op) ? 1 : op) * 100)}%`
      }
      case 'fontWeight':
        return cs.fontWeight
      default:
        return cs[prop]
    }
  }

  showHintFor(prop, value) {
    clearTimeout(this._hintTimer)
    const el = this._elements[0]
    if (!el) return
    showPropHint(el, prop, { value })
  }

  scheduleHideHint() {
    clearTimeout(this._hintTimer)
    this._hintTimer = setTimeout(() => hidePropHint(), HINT_HIDE_DELAY)
  }

  // ---- selection sync / positioning ----

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

    const fontSizePx = parseFloat(style.fontSize) || 16
    const sizeInput = shadow.querySelector('.size-input')
    if (sizeInput) sizeInput.value = Math.round(fontSizePx)
    const sizeRange = shadow.querySelector('.size-range')
    if (sizeRange) sizeRange.value = clamp(Math.round(fontSizePx), FONT_SIZE_MIN, FONT_SIZE_MAX)

    const fontTrigger = shadow.querySelector('.font-trigger')
    if (fontTrigger) fontTrigger.textContent = `${firstFamily(style.fontFamily) || '글꼴'} ▾`

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

    const lineHeightRange = shadow.querySelector('.line-height-range')
    if (lineHeightRange) {
      let ratio
      if (style.lineHeight === 'normal') ratio = 1.2
      else {
        const lhPx = parseFloat(style.lineHeight)
        ratio = fontSizePx ? lhPx / fontSizePx : 1.2
      }
      lineHeightRange.value = clamp(ratio, LINE_HEIGHT_MIN, LINE_HEIGHT_MAX).toFixed(1)
    }

    const letterSpacingRange = shadow.querySelector('.letter-spacing-range')
    if (letterSpacingRange) {
      const ls = style.letterSpacing === 'normal' ? 0 : (parseFloat(style.letterSpacing) || 0)
      letterSpacingRange.value = clamp(ls, LETTER_SPACING_MIN, LETTER_SPACING_MAX)
    }

    const opacityRange = shadow.querySelector('.opacity-range')
    if (opacityRange) {
      const op = parseFloat(style.opacity)
      opacityRange.value = Math.round((Number.isNaN(op) ? 1 : op) * 100)
    }
  }

  position() {
    if (this._live) return // don't reposition/flicker mid-gesture
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
    this.abortLiveState()

    this._elements = (elements || []).filter(el => el && el.isConnected)

    if (!this._elements.length) {
      this.hide()
      return
    }

    this.style.display = 'block'
    this._visible = true
    this.syncControlsFromSelection()
    this.position()
  }

  hide() {
    this.abortLiveState()
    this._visible = false
    this.style.display = 'none'
    if (this._palette) this._palette.hide()
  }
}

customElements.define('visbug-text-toolbar', TextToolbar)
