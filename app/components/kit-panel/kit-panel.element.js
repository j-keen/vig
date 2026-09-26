// 내 킷 탭 - 다른 사이트에서 캡처한 UI 조각(킷)을 저장/열람하고, 선택한 요소에
// 미리보기(호버)/적용(클릭)한다. 이 컴포넌트는 독립 패널이 아니라 우측 사이드
// 패널(app/components/side-panel)의 light-DOM 자식으로 슬롯되는 콘텐츠다.

import hotkeys from 'hotkeys-js'
import { Kit } from '../../features/kit'
import { Settings } from '../../features/settings'
import { KitPanelStyles } from './kit-panel.styles'

const HOTKEY = 'ctrl+shift+k'
const HOVER_DELAY_MS = 120
const DELETE_CONFIRM_MS = 2000
const TOAST_MS = 1500
const PREVIEW_REF_WIDTH = 220

const KIND_LABEL = { auto: '자동', style: '모양만', block: '통째로' }

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export class KitPanel extends HTMLElement {
  constructor() {
    super()
    this.$shadow = this.attachShadow({ mode: 'closed' })
    this._visbug = null
    this._rendered = false

    this._items = []
    this._entries = new Map() // key -> { variants: item[] }
    this._variantIndex = new Map() // key -> current index

    this._selected = []
    this._mode = 'auto' // 자동 | style | block (toggle)
    this._query = ''

    this._hoveredCard = null
    this._hoverTimer = null
    this._activePreview = null // { revert, cardEl }
    this._deleteArmed = new Map() // itemId -> timeoutId

    this._unregisterTheme = null
    this._offKitChange = null
    this._onSelectedUpdate = null
    this._onHotkey = e => { e.preventDefault(); this.quickSave() }
  }

  set visbug(vb) {
    this._visbug = vb
    this.ensureRendered()
    if (vb && vb.selectorEngine) {
      this._onSelectedUpdate = sel => this.handleSelectionChange(sel)
      vb.selectorEngine.onSelectedUpdate(this._onSelectedUpdate)
      this.handleSelectionChange(vb.selectorEngine.selection())
    }
  }

  get visbug() {
    return this._visbug
  }

  connectedCallback() {
    this.ensureRendered()
    this._unregisterTheme = Settings.registerPanel(this)
    hotkeys(HOTKEY, this._onHotkey)
  }

  disconnectedCallback() {
    this.clearHoverPreview()
    this._unregisterTheme && this._unregisterTheme()
    this._offKitChange && this._offKitChange()
    if (this._visbug && this._visbug.selectorEngine && this._onSelectedUpdate) {
      this._visbug.selectorEngine.removeSelectedCallback(this._onSelectedUpdate)
    }
    hotkeys.unbind(HOTKEY, this._onHotkey)
    this._deleteArmed.forEach(timer => clearTimeout(timer))
    this._deleteArmed.clear()
    clearTimeout(this._toastTimer)
  }

  ensureRendered() {
    if (this._rendered) return
    this._rendered = true
    this.$shadow.innerHTML = this.render()
    this.applyStyles()
    this.setupInteractions()
    this.updateSelectionState()

    Kit.load().then(items => {
      this._items = items || []
      this.renderList()
    })
    this._offKitChange = Kit.onChange(items => {
      this._items = items || []
      this.renderList()
    })
  }

  applyStyles() {
    const style = document.createElement('style')
    style.textContent = KitPanelStyles
    this.$shadow.appendChild(style)
  }

  render() {
    return `
      <div class="panel">
        <div class="toolbar">
          <button type="button" class="btn-save" data-save disabled>+ 현재 선택 저장</button>
          <button type="button" class="btn-import" data-import-trigger title="가져오기">가져오기</button>
          <input type="file" accept="application/json,.json" data-import-input hidden>
          <button type="button" class="btn-export" data-export title="내보내기">내보내기</button>
        </div>

        <div class="save-form" data-save-form hidden>
          <input type="text" class="save-name" data-save-name placeholder="이름" autocomplete="off">
          <input type="text" class="save-group" data-save-group list="dp-kit-group-list" placeholder="그룹 (선택)" autocomplete="off">
          <datalist id="dp-kit-group-list" data-group-list></datalist>
          <select class="save-kind" data-save-kind title="적용 방식">
            <option value="auto">자동</option>
            <option value="style">모양만</option>
            <option value="block">통째로</option>
          </select>
          <div class="save-actions">
            <button type="button" class="btn-confirm-save" data-confirm-save>저장</button>
            <button type="button" class="btn-cancel-save" data-cancel-save>취소</button>
          </div>
        </div>

        <div class="search-row">
          <input type="text" class="search-input" data-search placeholder="이름·태그·그룹 검색" autocomplete="off">
        </div>

        <div class="mode-toggle" data-mode-toggle role="radiogroup" aria-label="적용 모드">
          <label><input type="radio" name="dp-kit-mode" value="auto" checked> 자동</label>
          <label><input type="radio" name="dp-kit-mode" value="style"> 모양만</label>
          <label><input type="radio" name="dp-kit-mode" value="block"> 통째로</label>
        </div>

        <div class="selection-hint" data-selection-hint>페이지에서 요소를 선택하면 킷을 입힐 수 있어요</div>

        <div class="list" data-list>
          <div class="section" data-section="builtin">
            <div class="section-title">기본 킷</div>
            <div class="cards" data-cards="builtin"></div>
          </div>
          <div class="section" data-section="user">
            <div class="section-title">내 킷</div>
            <div class="cards" data-cards="user"></div>
            <div class="empty-user" data-empty-user hidden>저장된 킷이 없습니다</div>
          </div>
        </div>

        <span class="toast" data-toast hidden></span>
      </div>
    `
  }

  setupInteractions() {
    // 패널 내부 키 입력이 페이지 단축키(hotkeys-js)로 새지 않게
    this.$shadow.addEventListener('keydown', e => e.stopPropagation())
    this.$shadow.addEventListener('keyup', e => e.stopPropagation())
    this.$shadow.addEventListener('mousedown', e => e.stopPropagation())

    this.setupSaveForm()
    this.setupImportExport()
    this.setupSearch()
    this.setupModeToggle()
    this.setupList()
  }

  // ---- 상단 바: 저장 / 가져오기 / 내보내기 -----------------------------------

  setupSaveForm() {
    const root = this.$shadow
    const saveBtn = root.querySelector('[data-save]')
    const form = root.querySelector('[data-save-form]')
    const nameInput = root.querySelector('[data-save-name]')
    const groupInput = root.querySelector('[data-save-group]')
    const kindSelect = root.querySelector('[data-save-kind]')
    const groupList = root.querySelector('[data-group-list]')

    saveBtn.addEventListener('click', () => {
      if (this._selected.length === 0) return
      const captured = Kit.capture(this._selected[0])
      nameInput.value = captured.name
      groupInput.value = ''
      kindSelect.value = 'auto'
      groupList.innerHTML = this.collectGroups()
        .map(g => `<option value="${escapeHtml(g)}"></option>`).join('')
      form.hidden = false
      nameInput.focus()
      nameInput.select()
    })

    const submit = () => {
      if (this._selected.length === 0) { form.hidden = true; return }
      const name = nameInput.value.trim()
      if (!name) return
      const captured = Kit.capture(this._selected[0], {
        name,
        group: groupInput.value.trim() || null,
        kind: kindSelect.value,
      })
      Kit.add(captured)
      form.hidden = true
      this.showToast('킷에 저장됨')
    }

    const cancel = () => { form.hidden = true }

    form.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); submit() }
      else if (e.key === 'Escape') { e.preventDefault(); cancel() }
    })

    root.querySelector('[data-confirm-save]').addEventListener('click', submit)
    root.querySelector('[data-cancel-save]').addEventListener('click', cancel)
  }

  collectGroups() {
    const groups = new Set()
    this._items.forEach(i => { if (i.group) groups.add(i.group) })
    return Array.from(groups)
  }

  quickSave() {
    if (this._selected.length === 0) return
    const captured = Kit.capture(this._selected[0])
    Kit.add(captured)
    this.showToast('킷에 저장됨')
  }

  setupImportExport() {
    const root = this.$shadow
    const importTrigger = root.querySelector('[data-import-trigger]')
    const importInput = root.querySelector('[data-import-input]')
    const exportBtn = root.querySelector('[data-export]')

    importTrigger.addEventListener('click', () => importInput.click())

    importInput.addEventListener('change', async () => {
      const file = importInput.files && importInput.files[0]
      importInput.value = ''
      if (!file) return
      const text = await file.text()
      const result = Kit.importJSON(text)
      const skippedText = result.skipped ? ` · ${result.skipped}개 건너뜀` : ''
      this.showToast(`${result.added}개 가져옴${skippedText}`)
    })

    exportBtn.addEventListener('click', () => {
      const json = Kit.exportJSON()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'designpoke-kit.json'
      document.body.appendChild(a)
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    })
  }

  setupSearch() {
    const input = this.$shadow.querySelector('[data-search]')
    input.addEventListener('input', () => {
      this._query = input.value.trim().toLowerCase()
      this.renderList()
    })
  }

  setupModeToggle() {
    this.$shadow.querySelectorAll('input[name="dp-kit-mode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) this._mode = radio.value
      })
    })
  }

  // ---- 목록 렌더링 -------------------------------------------------------

  renderList() {
    const matches = it => {
      if (!this._query) return true
      const hay = [it.name, it.group, ...(it.tags || [])].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(this._query)
    }

    const builtinItems = this._items.filter(i => i.builtin && matches(i))
    const userItems = this._items.filter(i => !i.builtin)
    const userItemsFiltered = userItems.filter(matches)

    this._entries.clear()
    this.renderSection('builtin', this.buildEntries(builtinItems))
    this.renderSection('user', this.buildEntries(userItemsFiltered))

    const emptyUser = this.$shadow.querySelector('[data-empty-user]')
    if (emptyUser) emptyUser.hidden = userItems.length > 0

    this.updateSelectionState()
  }

  // 아이템마다 카드를 하나씩 만든다 (그룹으로 합쳐 대표 하나만 보여주지 않는다).
  // 같은 그룹에 변형이 여럿이면(Kit.variantsOf(item).length > 1) 그 카드에
  // ◀ ▶ 스위처가 붙어서, 그 카드에서 그룹 내 다른 변형으로 바꿔볼 수 있다.
  // (처음에는 항상 자기 자신을 보여준다.)
  buildEntries(items) {
    const entries = []
    items.forEach(it => {
      const key = `item:${it.id}`
      const variants = it.group ? (Kit.variantsOf(it) || [it]) : [it]
      const ownIndex = Math.max(0, variants.findIndex(v => v.id === it.id))
      this._entries.set(key, { variants, ownIndex })
      entries.push({ key, variants, ownIndex })
    })
    return entries
  }

  renderSection(section, entries) {
    const container = this.$shadow.querySelector(`[data-cards="${section}"]`)
    if (!container) return
    container.innerHTML = entries.map(entry => this.cardHTML(entry)).join('')
  }

  currentItemFor(entry) {
    const idx = this.variantIndexFor(entry.key, entry.variants.length, entry.ownIndex)
    return entry.variants[idx]
  }

  variantIndexFor(key, len, fallback = 0) {
    if (!this._variantIndex.has(key)) return ((fallback % len) + len) % len
    const raw = this._variantIndex.get(key)
    return ((raw % len) + len) % len
  }

  cardHTML(entry) {
    const item = this.currentItemFor(entry)
    const idx = this.variantIndexFor(entry.key, entry.variants.length, entry.ownIndex)
    const kindLabel = KIND_LABEL[item.kind] || '자동'
    const hasVariants = entry.variants.length > 1

    return `
      <div class="kit-card" data-key="${escapeHtml(entry.key)}" data-id="${escapeHtml(item.id)}" tabindex="0">
        <div class="preview" data-preview>${this.previewHTML(item)}</div>
        <div class="meta">
          <span class="name" data-name>${escapeHtml(item.name)}</span>
          <span class="kind-badge" data-kind="${escapeHtml(item.kind)}">${kindLabel}</span>
        </div>
        ${hasVariants ? `
          <div class="variant-switch">
            <button type="button" class="variant-btn" data-variant-prev title="이전 변형">◀</button>
            <span class="variant-pos">${idx + 1}/${entry.variants.length}</span>
            <button type="button" class="variant-btn" data-variant-next title="다음 변형">▶</button>
          </div>` : ''}
        ${!item.builtin ? `
          <div class="user-actions">
            <button type="button" class="btn-rename" data-rename title="이름 변경">✎</button>
            <button type="button" class="btn-delete" data-delete title="삭제">×</button>
          </div>` : ''}
        <div class="hover-mode-label" data-hover-label hidden></div>
      </div>
    `
  }

  previewHTML(item) {
    const naturalWidth = (item.size && item.size.w) || PREVIEW_REF_WIDTH
    const scale = Math.min(1, PREVIEW_REF_WIDTH / naturalWidth)
    return `<div class="preview-inner" style="transform: translate(-50%, -50%) scale(${scale});">${item.html}</div>`
  }

  // ---- 카드 상호작용 (호버 미리보기 / 클릭 적용 / 변형 전환 / 이름변경 / 삭제) ----

  setupList() {
    const list = this.$shadow.querySelector('[data-list]')
    list.addEventListener('mouseover', e => this.onCardMouseOver(e))
    list.addEventListener('mouseout', e => this.onCardMouseOut(e))
    list.addEventListener('click', e => this.onListClick(e))
    list.addEventListener('keydown', e => this.onListKeydown(e))
  }

  onCardMouseOver(e) {
    const card = e.target.closest('.kit-card')
    if (!card || this._hoveredCard === card) return
    this.clearHoverPreview()
    this._hoveredCard = card
    if (this._selected.length === 0) return

    const key = card.dataset.key
    this._hoverTimer = setTimeout(() => this.startHoverPreview(card, key), HOVER_DELAY_MS)
  }

  onCardMouseOut(e) {
    const card = e.target.closest('.kit-card')
    if (!card || card !== this._hoveredCard) return
    if (card.contains(e.relatedTarget)) return
    this._hoveredCard = null
    this.clearHoverPreview()
  }

  startHoverPreview(card, key) {
    const entry = this._entries.get(key)
    if (!entry || this._selected.length === 0) return
    const item = this.currentItemFor(entry)
    const target = this._selected[0]
    if (!target || !target.isConnected) return

    const mode = this.resolveMode(target, item)
    let handle
    try {
      handle = Kit.preview(target, item, mode)
    } catch (e) {
      return
    }
    this._activePreview = { revert: handle && handle.revert, cardEl: card }

    const label = card.querySelector('[data-hover-label]')
    if (label) {
      label.textContent = mode === 'style' ? '모양만 미리보기' : '통째로 미리보기'
      label.hidden = false
    }
  }

  clearHoverPreview() {
    clearTimeout(this._hoverTimer)
    this._hoverTimer = null
    if (this._activePreview) {
      const { revert, cardEl } = this._activePreview
      try { revert && revert() } catch (e) { /* noop */ }
      if (cardEl) {
        const label = cardEl.querySelector('[data-hover-label]')
        if (label) label.hidden = true
      }
      this._activePreview = null
    }
  }

  resolveMode(target, item) {
    if (this._mode === 'style' || this._mode === 'block') return this._mode
    return Kit.autoMode(target, item)
  }

  onListClick(e) {
    const card = e.target.closest('.kit-card')
    if (!card) return
    const key = card.dataset.key

    if (e.target.closest('[data-variant-prev]')) { this.cycleVariant(key, -1); return }
    if (e.target.closest('[data-variant-next]')) { this.cycleVariant(key, 1); return }
    if (e.target.closest('[data-rename]')) { this.startRename(card, key); return }
    if (e.target.closest('[data-delete]')) { this.handleDeleteClick(card, key); return }

    this.applyItem(key)
  }

  onListKeydown(e) {
    if (e.key !== '[' && e.key !== ']') return
    const card = e.target.closest ? e.target.closest('.kit-card') : null
    if (!card) return
    e.preventDefault()
    this.cycleVariant(card.dataset.key, e.key === '[' ? -1 : 1)
  }

  cycleVariant(key, delta) {
    const entry = this._entries.get(key)
    if (!entry || entry.variants.length <= 1) return
    const len = entry.variants.length
    const cur = this.variantIndexFor(key, len, entry.ownIndex)
    this._variantIndex.set(key, ((cur + delta) % len + len) % len)
    this.clearHoverPreview()
    this.renderList()
  }

  applyItem(key) {
    if (this._selected.length === 0) return
    const entry = this._entries.get(key)
    if (!entry) return
    const item = this.currentItemFor(entry)
    const target = this._selected[0]
    if (!target || !target.isConnected) return

    this.clearHoverPreview()

    const mode = this.resolveMode(target, item)
    const result = Kit.apply(target, item, mode)

    if (result && result.element && result.element !== target &&
        this._visbug && this._visbug.selectorEngine) {
      this._visbug.selectorEngine.unselect_all({ silent: true })
      this._visbug.selectorEngine.select(result.element)
    }

    this.showToast(`'${item.name}' 적용됨 · Ctrl+Z로 되돌리기`)
  }

  startRename(card, key) {
    const entry = this._entries.get(key)
    if (!entry) return
    const item = this.currentItemFor(entry)
    const nameEl = card.querySelector('[data-name]')
    if (!nameEl) return

    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'rename-input'
    input.value = item.name
    nameEl.replaceWith(input)
    input.focus()
    input.select()

    let done = false
    const commit = () => {
      if (done) return
      done = true
      const value = input.value.trim()
      if (value && value !== item.name) Kit.update(item.id, { name: value })
      else this.renderList()
    }

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit() }
      else if (e.key === 'Escape') { e.preventDefault(); done = true; this.renderList() }
    })
    input.addEventListener('blur', () => commit())
  }

  handleDeleteClick(card, key) {
    const entry = this._entries.get(key)
    if (!entry) return
    const item = this.currentItemFor(entry)
    const btn = card.querySelector('[data-delete]')
    if (!btn) return

    if (this._deleteArmed.has(item.id)) {
      clearTimeout(this._deleteArmed.get(item.id))
      this._deleteArmed.delete(item.id)
      Kit.remove(item.id)
      return
    }

    btn.textContent = '확실?'
    btn.classList.add('confirm')
    const timer = setTimeout(() => {
      this._deleteArmed.delete(item.id)
      btn.textContent = '×'
      btn.classList.remove('confirm')
    }, DELETE_CONFIRM_MS)
    this._deleteArmed.set(item.id, timer)
  }

  // ---- 선택 상태 ----------------------------------------------------------

  handleSelectionChange(selected) {
    this.clearHoverPreview()
    this._selected = Array.isArray(selected) ? selected.slice() : []
    this.updateSelectionState()
  }

  updateSelectionState() {
    const hasSelection = this._selected.length > 0
    const saveBtn = this.$shadow.querySelector('[data-save]')
    if (saveBtn) saveBtn.disabled = !hasSelection
    const hint = this.$shadow.querySelector('[data-selection-hint]')
    if (hint) hint.hidden = hasSelection
    this.$shadow.querySelectorAll('.kit-card').forEach(card => {
      card.classList.toggle('dimmed', !hasSelection)
    })
  }

  // ---- 토스트 --------------------------------------------------------------

  showToast(message) {
    const toast = this.$shadow.querySelector('[data-toast]')
    if (!toast) return
    toast.textContent = message
    toast.hidden = false
    clearTimeout(this._toastTimer)
    this._toastTimer = setTimeout(() => { toast.hidden = true }, TOAST_MS)
  }
}

customElements.define('visbug-kit-panel', KitPanel)
