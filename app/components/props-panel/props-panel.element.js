// Figma 스타일 속성 패널
// Properties Panel - shows/edits computed style values of the current selection

import { ChangeTracker } from '../../features/change-tracker'
import { PropsPanelStyles } from './props-panel.styles'

// 스크럽/방향키로 조작 가능한 숫자(px) 필드 목록
const NUM_FIELDS = [
  { section: 'position', prop: 'left', label: 'X' },
  { section: 'position', prop: 'top', label: 'Y' },
  { section: 'size', prop: 'width', label: 'W' },
  { section: 'size', prop: 'height', label: 'H' },
  { section: 'margin', prop: 'marginTop', label: '상' },
  { section: 'margin', prop: 'marginRight', label: '우' },
  { section: 'margin', prop: 'marginBottom', label: '하' },
  { section: 'margin', prop: 'marginLeft', label: '좌' },
  { section: 'padding', prop: 'paddingTop', label: '상' },
  { section: 'padding', prop: 'paddingRight', label: '우' },
  { section: 'padding', prop: 'paddingBottom', label: '하' },
  { section: 'padding', prop: 'paddingLeft', label: '좌' },
  { section: 'radius', prop: 'borderRadius', label: '반경' },
  { section: 'font', prop: 'fontSize', label: '크기' },
]

const COLOR_FIELDS = [
  { prop: 'color', label: '글자색' },
  { prop: 'backgroundColor', label: '배경색' },
  { prop: 'borderColor', label: '테두리색' },
]

const FONT_WEIGHTS = ['300', '400', '500', '600', '700']

const clamp = (n, min, max) => Math.max(min, Math.min(max, n))

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

function numRowHTML({ prop, label }) {
  return `
    <div class="field">
      <label class="num-label" data-prop="${prop}" title="드래그: 값 변경 (Shift ×10) · ↑↓: ±1 (Shift ±10)">${label}</label>
      <div class="input-wrap">
        <input class="num-input" data-prop="${prop}" type="text" inputmode="decimal" autocomplete="off">
        <span class="unit">px</span>
      </div>
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
    const fontSize = NUM_FIELDS.filter(f => f.section === 'font').map(numRowHTML).join('')

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
            <div class="opacity-row">
              <input type="range" class="opacity-input" min="0" max="100" step="1" value="100">
              <span class="opacity-value">100%</span>
            </div>
          </section>

          <section>
            <div class="section-title">글꼴</div>
            <div class="row">${fontSize}</div>
            <div class="row" style="margin-top:6px;">
              <div class="field" style="min-width: 100%;">
                <select class="select-input font-weight-input" title="글자 굵기">
                  ${FONT_WEIGHTS.map(w => `<option value="${w}">${w}</option>`).join('')}
                </select>
              </div>
            </div>
          </section>

          <section>
            <div class="section-title">정렬</div>
            <div class="align-row">
              <button type="button" class="align-btn" data-align="left" title="왼쪽 정렬">좌</button>
              <button type="button" class="align-btn" data-align="center" title="가운데 정렬">중</button>
              <button type="button" class="align-btn" data-align="right" title="오른쪽 정렬">우</button>
            </div>
          </section>

          <section>
            <div class="section-title">색상</div>
            ${COLOR_FIELDS.map(c => `
              <div class="color-row" data-color-row="${c.prop}">
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
    this.$shadow.addEventListener('keydown', e => e.stopPropagation())
    this.$shadow.addEventListener('keyup', e => e.stopPropagation())

    NUM_FIELDS.forEach(({ prop }) => this.setupNumField(prop))
    this.setupOpacity()
    this.setupFontWeight()
    this.setupAlign()
    COLOR_FIELDS.forEach(({ prop }) => this.setupColor(prop))
  }

  // ---- helpers shared by every editable control ----

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

  applyLiveValue(prop, px) {
    this._selected.forEach(el => {
      el.style[prop] = `${px}px`
    })
  }

  // ---- numeric px fields (typing / arrows / scrub) ----

  setupNumField(prop) {
    const input = this.$shadow.querySelector(`.num-input[data-prop="${prop}"]`)
    const label = this.$shadow.querySelector(`.num-label[data-prop="${prop}"]`)
    if (!input || !label) return

    input.addEventListener('keydown', e => {
      if (this.isFieldDisabled(prop)) return
      if (e.key === 'Enter') {
        e.preventDefault()
        this.commitTypedNumber(prop, input)
        // Enter already committed the value; suppress the blur that follows
        // input.blur() so we don't push a second, no-op undo entry.
        this._suppressNextBlur = true
        input.blur()
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        const delta = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1)
        const current = parseFloat(input.value)
        const next = (Number.isNaN(current) ? 0 : current) + delta
        input.value = round2(next)
        this.captureForEdit()
        this.applyLiveValue(prop, next)
        this.commitEdit()
      }
    })

    input.addEventListener('blur', () => {
      if (this._suppressNextBlur) { this._suppressNextBlur = false; return }
      if (this.isFieldDisabled(prop)) return
      this.commitTypedNumber(prop, input)
    })

    label.addEventListener('mousedown', e => {
      if (this.isFieldDisabled(prop) || this._selected.length === 0) return
      e.preventDefault()

      const startX = e.clientX
      const startValue = parseFloat(input.value) || 0
      this.captureForEdit()
      this._scrubbing = true

      const onMove = me => {
        const delta = (me.clientX - startX) * (me.shiftKey ? 10 : 1)
        const next = round2(startValue + delta)
        input.value = next
        this.applyLiveValue(prop, next)
      }

      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        this._scrubbing = false
        this.commitEdit()
      }

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    })
  }

  commitTypedNumber(prop, input) {
    const value = parseFloat(input.value)
    if (Number.isNaN(value)) {
      this.refresh()
      return
    }
    this.captureForEdit()
    this.applyLiveValue(prop, value)
    this.commitEdit()
  }

  // ---- opacity slider ----

  setupOpacity() {
    const input = this.$shadow.querySelector('.opacity-input')
    const valueEl = this.$shadow.querySelector('.opacity-value')
    if (!input) return

    input.addEventListener('input', () => {
      const pct = clamp(parseInt(input.value, 10) || 0, 0, 100)
      this.captureForEdit()
      this._selected.forEach(el => { el.style.opacity = String(pct / 100) })
      if (valueEl) valueEl.textContent = `${pct}%`
    })

    input.addEventListener('change', () => {
      this.commitEdit()
    })
  }

  // ---- font weight ----

  setupFontWeight() {
    const select = this.$shadow.querySelector('.font-weight-input')
    if (!select) return

    select.addEventListener('change', () => {
      this.captureForEdit()
      this._selected.forEach(el => { el.style.fontWeight = select.value })
      this.commitEdit()
    })
  }

  // ---- text align ----

  setupAlign() {
    const buttons = Array.from(this.$shadow.querySelectorAll('.align-btn'))
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const align = btn.dataset.align
        this.captureForEdit()
        this._selected.forEach(el => { el.style.textAlign = align })
        this.commitEdit()
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

  setupColor(prop) {
    const row = this.$shadow.querySelector(`.color-row[data-color-row="${prop}"]`)
    if (!row) return
    const colorInput = row.querySelector('.color-input')
    const hexInput = row.querySelector('.hex-input')

    colorInput.addEventListener('input', () => {
      hexInput.value = colorInput.value
    })

    colorInput.addEventListener('change', () => {
      this.captureForEdit()
      this._selected.forEach(el => { el.style[prop] = colorInput.value })
      this.commitEdit()
    })

    hexInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault()
        this.commitHex(prop, hexInput, colorInput)
        // Enter already committed the value; suppress the blur that follows
        // hexInput.blur() so we don't push a second, no-op undo entry.
        this._suppressNextBlur = true
        hexInput.blur()
      }
    })

    hexInput.addEventListener('blur', () => {
      if (this._suppressNextBlur) { this._suppressNextBlur = false; return }
      this.commitHex(prop, hexInput, colorInput)
    })
  }

  commitHex(prop, hexInput, colorInput) {
    const value = hexInput.value.trim()
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
      this.refresh()
      return
    }
    const normalized = value.length === 4
      ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
      : value
    colorInput.value = normalized
    hexInput.value = normalized
    this.captureForEdit()
    this._selected.forEach(el => { el.style[prop] = normalized })
    this.commitEdit()
  }

  // ---- selection lifecycle ----

  handleSelectionChange(selected) {
    this.disconnectObserver()
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

  // 선택된 첫 요소의 값을 다시 읽어 UI에 반영한다
  refresh() {
    if (this._selected.length === 0) return
    if (this._scrubbing) return

    const el = this._selected[0]
    const computed = window.getComputedStyle(el)
    const active = this.$shadow.activeElement

    this._positionDisabled = computed.position === 'static'
    this.updatePositionHint()

    NUM_FIELDS.forEach(({ prop }) => {
      const input = this.$shadow.querySelector(`.num-input[data-prop="${prop}"]`)
      if (!input || input === active) return
      const raw = parseFloat(computed[prop])
      input.value = Number.isNaN(raw) ? '' : round2(raw)
      input.disabled = this.isFieldDisabled(prop)
      const labelEl = this.$shadow.querySelector(`.num-label[data-prop="${prop}"]`)
      if (labelEl) labelEl.classList.toggle('disabled', this.isFieldDisabled(prop))
    })

    const opacityInput = this.$shadow.querySelector('.opacity-input')
    const opacityValue = this.$shadow.querySelector('.opacity-value')
    if (opacityInput && opacityInput !== active) {
      const pct = clamp(Math.round((parseFloat(computed.opacity) || 0) * 100), 0, 100)
      opacityInput.value = pct
      if (opacityValue) opacityValue.textContent = `${pct}%`
    }

    const weightSelect = this.$shadow.querySelector('.font-weight-input')
    if (weightSelect && weightSelect !== active) {
      weightSelect.value = normalizeWeight(computed.fontWeight)
    }

    this.setActiveAlign(computed.textAlign)

    COLOR_FIELDS.forEach(({ prop }) => {
      const row = this.$shadow.querySelector(`.color-row[data-color-row="${prop}"]`)
      if (!row) return
      const colorInput = row.querySelector('.color-input')
      const hexInput = row.querySelector('.hex-input')
      const hex = rgbToHex(computed[prop])
      if (colorInput !== active) colorInput.value = hex
      if (hexInput !== active) hexInput.value = hex
    })
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
