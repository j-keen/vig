// Figma 스타일 속성 패널
// Properties Panel - shows/edits computed style values of the current selection

import { ChangeTracker } from '../../features/change-tracker'
import { showPropHint, hidePropHint } from '../../features/prop-hint'
import { PropsPanelStyles } from './props-panel.styles'

function computeSizeMax(el, prop) {
  if (!el) return 1000
  const computed = window.getComputedStyle(el)
  const current = parseFloat(computed[prop]) || 0
  const parent = el.parentElement
  const parentSize = parent ? (prop === 'width' ? parent.clientWidth : parent.clientHeight) : 0
  return Math.max(parentSize, current * 2, 100)
}

function computeRadiusMax(el) {
  if (!el) return 100
  const computed = window.getComputedStyle(el)
  const w = parseFloat(computed.width) || 0
  const h = parseFloat(computed.height) || 0
  return Math.max(Math.min(w, h) / 2, 1)
}

function readLineHeight(computed) {
  const lh = computed.lineHeight
  if (lh && lh.endsWith('px')) {
    const fs = parseFloat(computed.fontSize) || 16
    return round2(parseFloat(lh) / fs)
  }
  const n = parseFloat(lh)
  return Number.isNaN(n) ? 1.4 : n
}

// 스크럽/스테퍼/슬라이더로 조작 가능한 숫자 필드 목록
const NUM_FIELDS = [
  { section: 'position', prop: 'left', label: 'X', unit: 'px', min: -2000, max: 2000, step: 1 },
  { section: 'position', prop: 'top', label: 'Y', unit: 'px', min: -2000, max: 2000, step: 1 },
  { section: 'size', prop: 'width', label: 'W', unit: 'px', min: 0, step: 1,
    range: el => ({ min: 0, max: computeSizeMax(el, 'width'), step: 1 }) },
  { section: 'size', prop: 'height', label: 'H', unit: 'px', min: 0, step: 1,
    range: el => ({ min: 0, max: computeSizeMax(el, 'height'), step: 1 }) },
  { section: 'margin', prop: 'marginTop', label: '상', unit: 'px', min: 0, max: 200, step: 1 },
  { section: 'margin', prop: 'marginRight', label: '우', unit: 'px', min: 0, max: 200, step: 1 },
  { section: 'margin', prop: 'marginBottom', label: '하', unit: 'px', min: 0, max: 200, step: 1 },
  { section: 'margin', prop: 'marginLeft', label: '좌', unit: 'px', min: 0, max: 200, step: 1 },
  { section: 'padding', prop: 'paddingTop', label: '상', unit: 'px', min: 0, max: 200, step: 1 },
  { section: 'padding', prop: 'paddingRight', label: '우', unit: 'px', min: 0, max: 200, step: 1 },
  { section: 'padding', prop: 'paddingBottom', label: '하', unit: 'px', min: 0, max: 200, step: 1 },
  { section: 'padding', prop: 'paddingLeft', label: '좌', unit: 'px', min: 0, max: 200, step: 1 },
  { section: 'radius', prop: 'borderRadius', label: '반경', unit: 'px', min: 0, step: 1,
    range: el => ({ min: 0, max: computeRadiusMax(el), step: 1 }) },
  { section: 'font', prop: 'fontSize', label: '크기', unit: 'px', min: 8, max: 96, step: 1 },
  { section: 'font', prop: 'lineHeight', label: '줄간격', unit: '', min: 0.8, max: 3, step: 0.1,
    read: computed => readLineHeight(computed) },
  { section: 'font', prop: 'letterSpacing', label: '자간', unit: 'px', min: -2, max: 10, step: 0.5 },
]

const COLOR_FIELDS = [
  { prop: 'color', label: '글자색' },
  { prop: 'backgroundColor', label: '배경색' },
  { prop: 'borderColor', label: '테두리색' },
]

const FONT_WEIGHTS = ['300', '400', '500', '600', '700']

const clamp = (n, min, max) => Math.max(min, Math.min(max, n))

function getFieldRange(field, el) {
  if (typeof field.range === 'function') return field.range(el)
  return { min: field.min ?? 0, max: field.max ?? 100, step: field.step ?? 1 }
}

function readFieldValue(field, computed) {
  if (typeof field.read === 'function') return field.read(computed)
  const raw = parseFloat(computed[field.prop])
  return Number.isNaN(raw) ? null : raw
}

function formatFieldValue(field, value) {
  return `${round2(value)}${field.unit || ''}`
}

function rgbToHex(value) {
  if (!value) return '#000000'
  const v = String(value).trim()
  if (v.charAt(0) === '#') return v.length === 4
    ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
    : v
  const m = v.match(/rgba?\(([^)]+)\)/i)
  if (!m) return '#000000'
  const parts = m[1].split(',').map(s => parseFloat(s.trim()))
  const [r, g, b] = parts
  const toHex = n => clamp(Math.round(n || 0), 0, 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function normalizeHex(value) {
  return value.length === 4
    ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
    : value
}

function numRowHTML(field) {
  const { prop, label, unit } = field
  return `
    <div class="num-row" data-row-prop="${prop}">
      <div class="num-row-top">
        <label class="num-label" data-prop="${prop}" title="드래그: 값 변경 (Shift ×10)">${label}</label>
        <div class="stepper">
          <button type="button" class="step-btn" data-dir="1" data-prop="${prop}" title="증가 (Shift: ×10)">▲</button>
          <button type="button" class="step-btn" data-dir="-1" data-prop="${prop}" title="감소 (Shift: ×10)">▼</button>
        </div>
        <div class="input-wrap">
          <input class="num-input" data-prop="${prop}" type="text" inputmode="decimal" autocomplete="off">
          ${unit ? `<span class="unit">${unit}</span>` : ''}
        </div>
      </div>
      <input type="range" class="range-input" data-prop="${prop}" min="${field.min ?? 0}" max="${field.max ?? 100}" step="${field.step ?? 1}">
    </div>
  `
}

export class PropsPanel extends HTMLElement {
  constructor() {
    super()
    this.$shadow = this.attachShadow({ mode: 'closed' })
    this._visbug = null
    this._onSelectedUpdate = null
    this._selected = []
    this._observer = null
    this._rendered = false
    this._positionDisabled = true
    this._scrubbing = false
    this._suppressNextBlur = false
    this._session = null // 진행 중인 실시간 편집 제스처 { prop, startValues: Map<el,string> }
    this._hideHintTimer = null
  }

  set visbug(vb) {
    this._visbug = vb
    this.ensureRendered()
    if (vb && vb.selectorEngine) {
      this._onSelectedUpdate = sel => this.handleSelectionChange(sel)
      vb.selectorEngine.onSelectedUpdate(this._onSelectedUpdate)
    }
  }

  get visbug() {
    return this._visbug
  }

  connectedCallback() {
    this.ensureRendered()

    this.style.position = 'fixed'
    this.style.top = '72px'
    this.style.right = '12px'
    this.style.left = 'auto'
    this.style.width = 'auto'
    this.style.maxWidth = '240px'
    this.style.zIndex = '2147483646'
    this.style.pointerEvents = 'none'

    this.setAttribute('popover', 'manual')
    this.showPopover && this.showPopover()
  }

  disconnectedCallback() {
    this.disconnectObserver()
    hidePropHint()
    if (this._visbug && this._visbug.selectorEngine && this._onSelectedUpdate) {
      this._visbug.selectorEngine.removeSelectedCallback(this._onSelectedUpdate)
    }
    this.hidePopover && this.hidePopover()
  }

  ensureRendered() {
    if (this._rendered) return
    this._rendered = true
    this.$shadow.innerHTML = this.render()
    this.applyStyles()
    this.setupInteractions()
    this.hidePanel()
  }

  applyStyles() {
    const style = document.createElement('style')
    style.textContent = PropsPanelStyles
    this.$shadow.appendChild(style)
  }

  render() {
    const position = NUM_FIELDS.filter(f => f.section === 'position').map(numRowHTML).join('')
    const size = NUM_FIELDS.filter(f => f.section === 'size').map(numRowHTML).join('')
    const margin = NUM_FIELDS.filter(f => f.section === 'margin').map(numRowHTML).join('')
    const padding = NUM_FIELDS.filter(f => f.section === 'padding').map(numRowHTML).join('')
    const radius = NUM_FIELDS.filter(f => f.section === 'radius').map(numRowHTML).join('')
    const fontNums = NUM_FIELDS.filter(f => f.section === 'font').map(numRowHTML).join('')

    return `
      <div class="panel" hidden>
        <div class="header">
          <span class="label">요소 없음</span>
        </div>
        <div class="body">
          <section class="section-position">
            <div class="section-title">위치</div>
            <div class="hint" hidden>이동하면 활성화</div>
            <div class="row">${position}</div>
          </section>

          <section>
            <div class="section-title">크기</div>
            <div class="row">${size}</div>
          </section>

          <section>
            <div class="section-title">바깥 여백</div>
            <div class="row">${margin}</div>
          </section>

          <section>
            <div class="section-title">안쪽 여백</div>
            <div class="row">${padding}</div>
          </section>

          <section>
            <div class="section-title">둥근 모서리</div>
            <div class="row">${radius}</div>
          </section>

          <section>
            <div class="section-title">투명도</div>
            <div class="opacity-row" data-row-prop="opacity">
              <input type="range" class="opacity-input" min="0" max="100" step="1" value="100">
              <span class="opacity-value">100%</span>
            </div>
          </section>

          <section>
            <div class="section-title">글꼴</div>
            <div class="row">${fontNums}</div>
            <div class="row field-wrap" data-row-prop="fontWeight" style="margin-top:6px;">
              <div class="field" style="min-width: 100%;">
                <select class="select-input font-weight-input" title="글자 굵기">
                  ${FONT_WEIGHTS.map(w => `<option value="${w}">${w}</option>`).join('')}
                </select>
              </div>
            </div>
          </section>

          <section>
            <div class="section-title">정렬</div>
            <div class="align-row" data-row-prop="textAlign">
              <button type="button" class="align-btn" data-align="left" title="왼쪽 정렬">좌</button>
              <button type="button" class="align-btn" data-align="center" title="가운데 정렬">중</button>
              <button type="button" class="align-btn" data-align="right" title="오른쪽 정렬">우</button>
            </div>
          </section>

          <section>
            <div class="section-title">색상</div>
            ${COLOR_FIELDS.map(c => `
              <div class="color-row" data-row-prop="${c.prop}">
                <span class="color-label">${c.label}</span>
                <input type="color" class="color-input" data-prop="${c.prop}">
                <input type="text" class="hex-input" data-prop="${c.prop}" autocomplete="off" spellcheck="false">
              </div>
            `).join('')}
          </section>
        </div>
      </div>
    `
  }

  setupInteractions() {
    // 패널 내부 키보드 이벤트가 페이지 단축키(hotkeys-js)로 전파되지 않도록 차단
    this.$shadow.addEventListener('keydown', e => {
      e.stopPropagation()
      if (e.key === 'Escape') {
        e.preventDefault()
        this.cancelSession()
      }
    })
    this.$shadow.addEventListener('keyup', e => e.stopPropagation())

    NUM_FIELDS.forEach(field => this.setupNumField(field))
    this.setupOpacity()
    this.setupFontWeight()
    this.setupAlign()
    COLOR_FIELDS.forEach(field => this.setupColor(field))
  }

  // ---- session: live preview (no ChangeTracker) + single commit per gesture ----

  startSession(prop) {
    if (this._session && this._session.prop === prop) return this._session
    if (this._session) this.commitSession()
    this._session = {
      prop,
      startValues: new Map(this._selected.map(el => [el, el.style[prop] || ''])),
    }
    return this._session
  }

  previewStyle(prop, cssValue) {
    if (this._selected.length === 0) return
    this.startSession(prop)
    this.captureForEdit()
    this._selected.forEach(el => { el.style[prop] = cssValue })
  }

  commitSession() {
    if (!this._session) return
    this.commitEdit()
    this._session = null
  }

  cancelSession() {
    if (!this._session) return
    const { prop, startValues } = this._session
    startValues.forEach((val, el) => { el.style[prop] = val })
    this._session = null
    this.refreshField(prop)
  }

  captureForEdit() {
    this._selected.forEach(el => ChangeTracker.captureOriginal(el))
  }

  commitEdit() {
    this._selected.forEach(el => {
      ChangeTracker.updateCurrent(el)
      ChangeTracker.pushToUndoStack(el)
    })
  }

  isPositionProp(prop) {
    return prop === 'left' || prop === 'top'
  }

  isFieldDisabled(prop) {
    return this.isPositionProp(prop) && this._positionDisabled
  }

  // ---- prop hint (오버레이) ----

  showHintFor(prop, valueText) {
    if (this._selected.length === 0) return
    clearTimeout(this._hideHintTimer)
    showPropHint(this._selected[0], prop, { value: valueText })
    this.setActiveRow(prop)
  }

  scheduleHideHint() {
    clearTimeout(this._hideHintTimer)
    this._hideHintTimer = setTimeout(() => {
      hidePropHint()
      this.setActiveRow(null)
    }, 120)
  }

  setActiveRow(prop) {
    this.$shadow.querySelectorAll('.active-row').forEach(el => el.classList.remove('active-row'))
    if (!prop) return
    const row = this.$shadow.querySelector(`[data-row-prop="${prop}"]`)
    if (row) row.classList.add('active-row')
  }

  bindRowHover(row, prop, getDisplayValue) {
    if (!row) return
    const show = () => this.showHintFor(prop, getDisplayValue())
    const hide = () => this.scheduleHideHint()
    row.addEventListener('mouseenter', show)
    row.addEventListener('mouseleave', hide)
    row.addEventListener('focusin', show)
    row.addEventListener('focusout', hide)
  }

  // ---- numeric px/unitless fields (typing / arrows / stepper / slider / scrub) ----

  setupNumField(field) {
    const { prop, unit = '' } = field
    const row = this.$shadow.querySelector(`.num-row[data-row-prop="${prop}"]`)
    if (!row) return
    const input = row.querySelector('.num-input')
    const slider = row.querySelector('.range-input')
    const label = row.querySelector('.num-label')
    const stepButtons = Array.from(row.querySelectorAll('.step-btn'))

    const displayValue = () => (input.value !== '' ? `${input.value}${unit}` : '')

    const syncInput = value => { input.value = round2(value) }
    const syncSlider = value => {
      if (!slider) return
      const range = getFieldRange(field, this._selected[0])
      slider.value = clamp(value, range.min, range.max)
    }

    const preview = value => {
      this.previewStyle(prop, formatFieldValue(field, value))
      this.showHintFor(prop, `${round2(value)}${unit}`)
    }

    const commit = () => {
      this.commitSession()
      this.scheduleHideHint()
    }

    this.bindRowHover(row, prop, displayValue)

    input.addEventListener('input', () => {
      if (this.isFieldDisabled(prop)) return
      const v = parseFloat(input.value)
      if (Number.isNaN(v)) return
      preview(v)
      syncSlider(v)
    })

    input.addEventListener('keydown', e => {
      if (this.isFieldDisabled(prop)) return
      if (e.key === 'Enter') {
        e.preventDefault()
        const v = parseFloat(input.value)
        if (!Number.isNaN(v)) { preview(v); syncSlider(v); commit() }
        this._suppressNextBlur = true
        input.blur()
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        const delta = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1)
        const cur = parseFloat(input.value) || 0
        const next = cur + delta
        syncInput(next)
        preview(next)
        syncSlider(next)
        commit()
      }
    })

    input.addEventListener('blur', () => {
      if (this._suppressNextBlur) { this._suppressNextBlur = false; return }
      if (this.isFieldDisabled(prop)) return
      const v = parseFloat(input.value)
      if (!Number.isNaN(v)) { preview(v); syncSlider(v); commit() }
      else this.refresh()
    })

    if (slider) {
      slider.addEventListener('input', () => {
        if (this.isFieldDisabled(prop)) return
        const v = parseFloat(slider.value)
        preview(v)
        syncInput(v)
      })
      slider.addEventListener('change', () => commit())
    }

    stepButtons.forEach(btn => {
      const dir = parseInt(btn.dataset.dir, 10)
      let repeatTimeout = null
      let repeatInterval = null

      const doStep = shiftKey => {
        const delta = dir * (shiftKey ? 10 : 1)
        const cur = parseFloat(input.value) || 0
        const next = cur + delta
        syncInput(next)
        preview(next)
        syncSlider(next)
      }

      const onDown = e => {
        if (this.isFieldDisabled(prop)) return
        e.preventDefault()
        doStep(e.shiftKey)

        repeatTimeout = setTimeout(() => {
          repeatInterval = setInterval(() => doStep(e.shiftKey), 40)
        }, 250)

        const stop = () => {
          clearTimeout(repeatTimeout)
          clearInterval(repeatInterval)
          repeatTimeout = null
          repeatInterval = null
          document.removeEventListener('mouseup', stop)
          commit()
        }
        document.addEventListener('mouseup', stop)
      }

      btn.addEventListener('mousedown', onDown)
    })

    label.addEventListener('mousedown', e => {
      if (this.isFieldDisabled(prop) || this._selected.length === 0) return
      e.preventDefault()

      const startX = e.clientX
      const startValue = parseFloat(input.value) || 0
      this._scrubbing = true
      this.showHintFor(prop, displayValue())

      const onMove = me => {
        const delta = (me.clientX - startX) * (me.shiftKey ? 10 : 1)
        const next = startValue + delta
        syncInput(next)
        preview(next)
        syncSlider(next)
      }

      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        this._scrubbing = false
        commit()
      }

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    })
  }

  // ---- opacity slider ----

  setupOpacity() {
    const row = this.$shadow.querySelector('[data-row-prop="opacity"]')
    const input = this.$shadow.querySelector('.opacity-input')
    const valueEl = this.$shadow.querySelector('.opacity-value')
    if (!input) return

    this.bindRowHover(row, 'opacity', () => `${input.value}%`)

    input.addEventListener('input', () => {
      const pct = clamp(parseInt(input.value, 10) || 0, 0, 100)
      this.previewStyle('opacity', String(pct / 100))
      if (valueEl) valueEl.textContent = `${pct}%`
      this.showHintFor('opacity', `${pct}%`)
    })

    input.addEventListener('change', () => {
      this.commitSession()
      this.scheduleHideHint()
    })
  }

  // ---- font weight ----

  setupFontWeight() {
    const row = this.$shadow.querySelector('[data-row-prop="fontWeight"]')
    const select = this.$shadow.querySelector('.font-weight-input')
    if (!select) return

    this.bindRowHover(row, 'fontWeight', () => select.value)

    select.addEventListener('change', () => {
      this.previewStyle('fontWeight', select.value)
      this.showHintFor('fontWeight', select.value)
      this.commitSession()
      this.scheduleHideHint()
    })
  }

  // ---- text align ----

  setupAlign() {
    const row = this.$shadow.querySelector('[data-row-prop="textAlign"]')
    const buttons = Array.from(this.$shadow.querySelectorAll('.align-btn'))

    this.bindRowHover(row, 'textAlign', () => {
      const active = buttons.find(b => b.classList.contains('active'))
      return active ? active.dataset.align : ''
    })

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const align = btn.dataset.align
        this.previewStyle('textAlign', align)
        this.showHintFor('textAlign', align)
        this.commitSession()
        this.scheduleHideHint()
        this.setActiveAlign(align)
      })
    })
  }

  setActiveAlign(align) {
    this.$shadow.querySelectorAll('.align-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.align === align)
    })
  }

  // ---- colors ----

  setupColor(colorField) {
    const { prop } = colorField
    const row = this.$shadow.querySelector(`[data-row-prop="${prop}"]`)
    if (!row) return
    const colorInput = row.querySelector('.color-input')
    const hexInput = row.querySelector('.hex-input')

    this.bindRowHover(row, prop, () => hexInput.value)

    colorInput.addEventListener('input', () => {
      hexInput.value = colorInput.value
      this.previewStyle(prop, colorInput.value)
      this.showHintFor(prop, colorInput.value)
    })

    colorInput.addEventListener('change', () => {
      this.commitSession()
      this.scheduleHideHint()
    })

    hexInput.addEventListener('input', () => {
      const v = hexInput.value.trim()
      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) {
        const normalized = normalizeHex(v)
        colorInput.value = normalized
        this.previewStyle(prop, normalized)
        this.showHintFor(prop, normalized)
      }
    })

    hexInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault()
        this.commitHexNow(prop, hexInput, colorInput)
        this._suppressNextBlur = true
        hexInput.blur()
      }
    })

    hexInput.addEventListener('blur', () => {
      if (this._suppressNextBlur) { this._suppressNextBlur = false; return }
      this.commitHexNow(prop, hexInput, colorInput)
    })
  }

  commitHexNow(prop, hexInput, colorInput) {
    const value = hexInput.value.trim()
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
      this.refresh()
      this.scheduleHideHint()
      return
    }
    const normalized = normalizeHex(value)
    colorInput.value = normalized
    hexInput.value = normalized
    this.previewStyle(prop, normalized)
    this.commitSession()
    this.scheduleHideHint()
  }

  // ---- selection lifecycle ----

  handleSelectionChange(selected) {
    if (this._session) this.commitSession()
    this.disconnectObserver()
    this.scheduleHideHint()
    this._selected = Array.isArray(selected) ? selected.slice() : []

    if (this._selected.length === 0) {
      this.hidePanel()
      return
    }

    this.showPanel()
    this.updateHeader()
    this.refresh()
    this.observeSelection()
  }

  updateHeader() {
    const labelEl = this.$shadow.querySelector('.header .label')
    if (!labelEl) return

    if (this._selected.length > 1) {
      labelEl.textContent = `${this._selected.length}개 선택`
      return
    }

    const el = this._selected[0]
    const tag = el.tagName.toLowerCase()
    const firstClass = el.classList && el.classList.length ? `.${el.classList[0]}` : ''
    labelEl.textContent = `${tag}${firstClass}`
  }

  updateNumDisplay(field, el, computed, { skipFocused = false, active = null } = {}) {
    const { prop } = field
    const row = this.$shadow.querySelector(`.num-row[data-row-prop="${prop}"]`)
    if (!row) return
    const input = row.querySelector('.num-input')
    const slider = row.querySelector('.range-input')
    const label = row.querySelector('.num-label')

    const range = getFieldRange(field, el)
    if (slider) {
      slider.min = range.min
      slider.max = range.max
      slider.step = range.step
    }

    const disabled = this.isFieldDisabled(prop)

    if (!(skipFocused && (input === active || slider === active))) {
      const raw = readFieldValue(field, computed)
      if (raw != null) {
        input.value = round2(raw)
        if (slider) slider.value = clamp(raw, range.min, range.max)
      } else {
        input.value = ''
      }
    }

    input.disabled = disabled
    if (slider) slider.disabled = disabled
    if (label) label.classList.toggle('disabled', disabled)
    row.querySelectorAll('.step-btn').forEach(btn => { btn.disabled = disabled })
  }

  updateOpacityDisplay(el, computed, { skipFocused = false, active = null } = {}) {
    const input = this.$shadow.querySelector('.opacity-input')
    const valueEl = this.$shadow.querySelector('.opacity-value')
    if (!input || (skipFocused && input === active)) return
    const pct = clamp(Math.round((parseFloat(computed.opacity) || 0) * 100), 0, 100)
    input.value = pct
    if (valueEl) valueEl.textContent = `${pct}%`
  }

  updateFontWeightDisplay(computed, { skipFocused = false, active = null } = {}) {
    const select = this.$shadow.querySelector('.font-weight-input')
    if (!select || (skipFocused && select === active)) return
    select.value = normalizeWeight(computed.fontWeight)
  }

  updateColorDisplay(prop, computed, { skipFocused = false, active = null } = {}) {
    const row = this.$shadow.querySelector(`[data-row-prop="${prop}"]`)
    if (!row) return
    const colorInput = row.querySelector('.color-input')
    const hexInput = row.querySelector('.hex-input')
    const hex = rgbToHex(computed[prop])
    if (!(skipFocused && colorInput === active)) colorInput.value = hex
    if (!(skipFocused && hexInput === active)) hexInput.value = hex
  }

  // 선택된 첫 요소의 값을 다시 읽어 UI에 반영한다
  refresh() {
    if (this._selected.length === 0) return
    if (this._session) return

    const el = this._selected[0]
    const computed = window.getComputedStyle(el)
    const active = this.$shadow.activeElement

    this._positionDisabled = computed.position === 'static'
    this.updatePositionHint()

    NUM_FIELDS.forEach(field => this.updateNumDisplay(field, el, computed, { skipFocused: true, active }))
    this.updateOpacityDisplay(el, computed, { skipFocused: true, active })
    this.updateFontWeightDisplay(computed, { skipFocused: true, active })
    this.setActiveAlign(computed.textAlign)
    COLOR_FIELDS.forEach(c => this.updateColorDisplay(c.prop, computed, { skipFocused: true, active }))
  }

  // Escape로 세션을 취소한 뒤 해당 필드 하나만 강제로 실제 값으로 되돌린다 (포커스 여부 무시)
  refreshField(prop) {
    if (this._selected.length === 0) return
    const el = this._selected[0]
    const computed = window.getComputedStyle(el)

    const field = NUM_FIELDS.find(f => f.prop === prop)
    if (field) { this.updateNumDisplay(field, el, computed); return }
    if (prop === 'opacity') { this.updateOpacityDisplay(el, computed); return }
    if (prop === 'fontWeight') { this.updateFontWeightDisplay(computed); return }
    if (prop === 'textAlign') { this.setActiveAlign(computed.textAlign); return }
    if (COLOR_FIELDS.some(c => c.prop === prop)) { this.updateColorDisplay(prop, computed); return }
  }

  updatePositionHint() {
    const hint = this.$shadow.querySelector('.section-position .hint')
    if (hint) hint.hidden = !this._positionDisabled
  }

  observeSelection() {
    const el = this._selected[0]
    if (!el) return
    this._observer = new MutationObserver(() => this.refresh())
    this._observer.observe(el, { attributes: true, attributeFilter: ['style'] })
  }

  disconnectObserver() {
    if (this._observer) {
      this._observer.disconnect()
      this._observer = null
    }
  }

  showPanel() {
    const panel = this.$shadow.querySelector('.panel')
    if (panel) panel.hidden = false
  }

  hidePanel() {
    const panel = this.$shadow.querySelector('.panel')
    if (panel) panel.hidden = true
  }
}

function round2(n) {
  return Math.round(n * 100) / 100
}

function normalizeWeight(value) {
  if (value === 'normal') return '400'
  if (value === 'bold') return '700'
  if (FONT_WEIGHTS.indexOf(value) !== -1) return value
  // 가장 가까운 지원 값으로 스냅
  const num = parseInt(value, 10)
  if (Number.isNaN(num)) return '400'
  return FONT_WEIGHTS.reduce((closest, w) =>
    Math.abs(parseInt(w, 10) - num) < Math.abs(parseInt(closest, 10) - num) ? w : closest
  , '400')
}

customElements.define('visbug-props', PropsPanel)
