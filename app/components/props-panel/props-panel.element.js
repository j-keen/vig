// Figma 스타일 속성 패널
// Properties Panel - shows/edits computed style values of the current selection
// 이 컴포넌트는 독립 패널이 아니라 우측 사이드 패널(app/components/side-panel)의
// light-DOM 자식으로 슬롯되는 콘텐츠다. 자체 위치/드래그/popover 를 갖지 않는다.

import { ChangeTracker } from '../../features/change-tracker'
import { showPropHint, hidePropHint } from '../../features/prop-hint'
import { Settings } from '../../features/settings'
import { moveElement } from '../../features/move'
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

// 스크럽/슬라이더로 조작 가능한 숫자 필드 목록 (한 줄: 라벨 + 게이지바 + 입력)
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
  { section: 'font', prop: 'letterSpacing', label: '자간', unit: 'px', min: -2, max: 10, step: 0.5, read: cs => cs.letterSpacing === 'normal' ? 0 : (parseFloat(cs.letterSpacing) || 0) },
  { section: 'flex', prop: 'gap', label: '간격', unit: 'px', min: 0, max: 200, step: 1 },
]

const COLOR_FIELDS = [
  { prop: 'color', label: '글자색' },
  { prop: 'backgroundColor', label: '배경색' },
  { prop: 'borderColor', label: '테두리색' },
]

const FONT_WEIGHTS = ['300', '400', '500', '600', '700']

// 정렬(Flex) 섹션 버튼들 - { prop, value, text }
const FLEX_DIRECTION_BUTTONS = [
  { value: 'row', text: '가로' },
  { value: 'column', text: '세로' },
]
const FLEX_JUSTIFY_BUTTONS = [
  { value: 'flex-start', text: '시작' },
  { value: 'center', text: '가운데' },
  { value: 'flex-end', text: '끝' },
  { value: 'space-between', text: '사이' },
  { value: 'space-evenly', text: '균등' },
]
const FLEX_ALIGN_BUTTONS = [
  { value: 'flex-start', text: '시작' },
  { value: 'center', text: '가운데' },
  { value: 'flex-end', text: '끝' },
  { value: 'stretch', text: '늘이기' },
]

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

// 한 줄 게이지 행: [라벨][게이지바][입력+단위]
function numRowHTML(field) {
  const { prop, label, unit } = field
  return `
    <div class="num-row" data-row-prop="${prop}">
      <label class="num-label" data-prop="${prop}" title="드래그: 값 변경 (Shift ×10)">${label}</label>
      <input type="range" class="range-input" data-prop="${prop}" min="${field.min ?? 0}" max="${field.max ?? 100}" step="${field.step ?? 1}">
      <div class="input-wrap">
        <input class="num-input" data-prop="${prop}" type="text" inputmode="decimal" autocomplete="off">
        ${unit ? `<span class="unit">${unit}</span>` : ''}
      </div>
    </div>
  `
}

function flexButtonsHTML(prop, buttons) {
  return buttons.map(b =>
    `<button type="button" class="flex-btn" data-flex-prop="${prop}" data-flex-value="${b.value}">${b.text}</button>`
  ).join('')
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
    this._unregisterTheme = null
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

    // 전역 설정(테마/불투명도)을 등록하면 data-theme 속성과 style.opacity 가
    // Settings 에 의해 자동으로 적용·갱신된다. (위치/드래그는 셸이 담당)
    this._unregisterTheme = Settings.registerPanel(this)
  }

  disconnectedCallback() {
    this.disconnectObserver()
    hidePropHint()
    if (this._visbug && this._visbug.selectorEngine && this._onSelectedUpdate) {
      this._visbug.selectorEngine.removeSelectedCallback(this._onSelectedUpdate)
    }
    this._unregisterTheme && this._unregisterTheme()
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
    const gapRow = NUM_FIELDS.filter(f => f.section === 'flex').map(numRowHTML).join('')

    return `
      <div class="panel">
        <div class="empty-hint">요소를 클릭하면 속성이 여기 표시됩니다</div>
        <div class="body" hidden>
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
            <div class="row tight">${margin}</div>
          </section>

          <section>
            <div class="section-title">안쪽 여백</div>
            <div class="row tight">${padding}</div>
          </section>

          <section>
            <div class="section-title">둥근 모서리</div>
            <div class="row">${radius}</div>
          </section>

          <section>
            <div class="section-title">투명도</div>
            <div class="num-row" data-row-prop="opacity">
              <span class="num-label" aria-hidden="true">비율</span>
              <input type="range" class="opacity-input range-input" min="0" max="100" step="1" value="100">
              <div class="input-wrap">
                <span class="opacity-value">100</span><span class="unit">%</span>
              </div>
            </div>
          </section>

          <section>
            <div class="section-title">글꼴</div>
            <div class="row">${fontNums}</div>
            <div class="select-row" data-row-prop="fontWeight">
              <select class="select-input font-weight-input" title="글자 굵기">
                ${FONT_WEIGHTS.map(w => `<option value="${w}">${w}</option>`).join('')}
              </select>
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

          <section class="section-flex">
            <div class="section-title">정렬 (Flex)</div>
            <div class="hint flex-hint">선택한 요소가 컨테이너일 때 자식 배치</div>
            <button type="button" class="flex-make-btn" data-flex-prop="display" data-flex-value="flex">flex로 만들기</button>
            <div class="flex-controls" hidden>
              <div class="flex-group-label">방향</div>
              <div class="flex-btn-row">${flexButtonsHTML('flexDirection', FLEX_DIRECTION_BUTTONS)}</div>
              <div class="flex-group-label">가로 정렬</div>
              <div class="flex-btn-row">${flexButtonsHTML('justifyContent', FLEX_JUSTIFY_BUTTONS)}</div>
              <div class="flex-group-label">세로 정렬</div>
              <div class="flex-btn-row">${flexButtonsHTML('alignItems', FLEX_ALIGN_BUTTONS)}</div>
              <div class="flex-group-label">간격</div>
              <div class="row">${gapRow}</div>
            </div>
          </section>

          <section class="section-order">
            <div class="section-title">순서</div>
            <div class="order-row">
              <button type="button" class="order-btn" data-move-dir="left" title="이전 형제와 교체">◀</button>
              <button type="button" class="order-btn" data-move-dir="right" title="다음 형제와 교체">▶</button>
              <button type="button" class="order-btn" data-move-dir="up" title="부모 밖으로 이동">▲</button>
              <button type="button" class="order-btn" data-move-dir="down" title="다음 형제 안으로 이동">▼</button>
            </div>
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
    this.setupFlexSection()
    this.setupOrder()
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

  // ---- numeric px/unitless fields (typing / arrows / slider / scrub) ----

  setupNumField(field) {
    const { prop, unit = '' } = field
    const row = this.$shadow.querySelector(`.num-row[data-row-prop="${prop}"]`)
    if (!row) return
    const input = row.querySelector('.num-input')
    const slider = row.querySelector('.range-input')
    const label = row.querySelector('.num-label')

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
      if (valueEl) valueEl.textContent = `${pct}`
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

  // ---- 정렬 (Flex) ----

  setupFlexSection() {
    const section = this.$shadow.querySelector('.section-flex')
    if (!section) return
    const buttons = Array.from(section.querySelectorAll('.flex-make-btn, .flex-btn'))

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this._selected.length === 0) return
        const prop = btn.dataset.flexProp
        const value = btn.dataset.flexValue
        this.previewStyle(prop, value)
        this.showHintFor(prop, value)
        this.commitSession()
        this.scheduleHideHint()
        this.refresh()
      })
    })
  }

  updateFlexSection(computed) {
    const section = this.$shadow.querySelector('.section-flex')
    if (!section) return
    const isFlex = computed.display === 'flex' || computed.display === 'inline-flex'
    const makeBtn = section.querySelector('.flex-make-btn')
    const controls = section.querySelector('.flex-controls')
    if (makeBtn) makeBtn.hidden = isFlex
    if (controls) controls.hidden = !isFlex
    if (!isFlex) return

    this.setActiveFlexButtons(section, 'flexDirection', computed.flexDirection)
    this.setActiveFlexButtons(section, 'justifyContent', computed.justifyContent)
    this.setActiveFlexButtons(section, 'alignItems', computed.alignItems)
  }

  setActiveFlexButtons(section, prop, value) {
    section.querySelectorAll(`.flex-btn[data-flex-prop="${prop}"]`).forEach(btn => {
      btn.classList.toggle('active', btn.dataset.flexValue === value)
    })
  }

  // ---- 순서 (DOM 이동) ----

  setupOrder() {
    const buttons = Array.from(this.$shadow.querySelectorAll('.order-btn'))
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const el = this._selected[0]
        if (!el || !this._visbug || !this._visbug.selectorEngine) return
        const dir = btn.dataset.moveDir
        moveElement(el, dir)
        this._visbug.selectorEngine.unselect_all({ silent: true })
        this._visbug.selectorEngine.select(el)
      })
    })
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
    this.refresh()
    this.observeSelection()
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
  }

  updateOpacityDisplay(el, computed, { skipFocused = false, active = null } = {}) {
    const input = this.$shadow.querySelector('.opacity-input')
    const valueEl = this.$shadow.querySelector('.opacity-value')
    if (!input || (skipFocused && input === active)) return
    const pct = clamp(Math.round((parseFloat(computed.opacity) || 0) * 100), 0, 100)
    input.value = pct
    if (valueEl) valueEl.textContent = `${pct}`
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
    this.updateFlexSection(computed)
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
    if (['display', 'flexDirection', 'justifyContent', 'alignItems'].includes(prop)) {
      this.updateFlexSection(computed)
    }
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
    const emptyHint = this.$shadow.querySelector('.empty-hint')
    const body = this.$shadow.querySelector('.body')
    if (emptyHint) emptyHint.hidden = true
    if (body) body.hidden = false
  }

  hidePanel() {
    const emptyHint = this.$shadow.querySelector('.empty-hint')
    const body = this.$shadow.querySelector('.body')
    if (emptyHint) emptyHint.hidden = false
    if (body) body.hidden = true
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
