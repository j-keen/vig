// 오른쪽 사이드 패널 셸 - 속성/이력 탭을 담는 유일한 패널
// <visbug-side-panel> 은 화면 오른쪽에 고정되며, 속성(visbug-props)과
// 이력(visbug-history) 컴포넌트를 <slot> 으로 받아 탭으로 전환해 보여준다.
// 기존에 왼쪽 플로팅 툴바가 하던 설정(⚙) 팝오버와 AI 복사 버튼도 여기 헤더로 옮겨왔다.

import { Settings } from '../../features/settings'
import { AIFormatter } from '../../features/ai-formatter'
import { ChangeTracker } from '../../features/change-tracker'
import { HumanFormatter } from '../../features/human-formatter'
import sidePanelCss from './side-panel.element.css'

const BADGE_POLL_MS = 500

function isUndoRedoCombo(e) {
  return (e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)
}

// "태그.클래스" 형태로 요소 이름을 만든다. data-*/js- 로 시작하는 유틸리티성
// 클래스는 건너뛰고 실제 의미 있어 보이는 첫 클래스만 사용한다.
function elementLabel(el) {
  if (!el) return '선택 없음'
  const tag = el.tagName ? el.tagName.toLowerCase() : 'node'
  const cls = Array.from(el.classList || [])
    .find(c => c && !/^(js-|data-)/.test(c))
  return cls ? `${tag}.${cls}` : tag
}

export class SidePanel extends HTMLElement {
  constructor() {
    super()
    this.$shadow = this.attachShadow({ mode: 'closed' })
    this.visbug = null
    this._activeTab = 'props'
    this._lastSeenCount = 0
    this._badgeInterval = null
    this._unregisterTheme = null
    this._offSettings = null
    this._onSelectedUpdate = sel => this.updateElementName(sel && sel[0])
  }

  connectedCallback() {
    this.$shadow.innerHTML = this.render()

    const style = document.createElement('style')
    style.textContent = sidePanelCss
    this.$shadow.appendChild(style)

    this.setAttribute('popover', 'manual')
    this.showPopover && this.showPopover()

    this._unregisterTheme = Settings.registerPanel(this)

    this.setupCollapse()
    this.setupTabs()
    this.setupAICopy()
    this.setupSettingsPopover()
    this.startBadgeWatch()

    if (this.visbug && this.visbug.selectorEngine) {
      this.visbug.selectorEngine.onSelectedUpdate(this._onSelectedUpdate)
      this.updateElementName(this.visbug.selectorEngine.selection()[0])
    }

    // 셸 안에서의 키 입력이 페이지 단축키(hotkeys-js)로 새지 않게 (Ctrl+Z / Ctrl+Shift+Z 제외)
    this.$shadow.addEventListener('keydown', e => { if (!isUndoRedoCombo(e)) e.stopPropagation() })
    this.$shadow.addEventListener('keyup', e => { if (!isUndoRedoCombo(e)) e.stopPropagation() })
    // 셸 안에서의 마우스 다운이 페이지 선택/드래그로 번지지 않게
    this.$shadow.addEventListener('mousedown', e => e.stopPropagation())
  }

  disconnectedCallback() {
    this.stopBadgeWatch()
    this._unregisterTheme && this._unregisterTheme()
    this._offSettings && this._offSettings()
    this._offCollapse && this._offCollapse()
    if (this.visbug && this.visbug.selectorEngine) {
      this.visbug.selectorEngine.removeSelectedCallback(this._onSelectedUpdate)
    }
    this.hidePopover && this.hidePopover()
  }

  render() {
    return `
      <div class="shell">
        <div class="header">
          <button class="btn-collapse" data-collapse-toggle title="접기/펼치기" aria-label="접기/펼치기">⋮</button>
          <div class="collapsed-label">DesignPoke</div>
          <div class="header-main">
            <div class="element-name">선택 없음</div>
            <div class="header-actions">
              <button class="btn-ai-copy" data-ai-copy title="AI로 복사 (Alt+클릭: 초기화)">🤖</button>
              <button class="btn-settings" data-settings-toggle title="설정">⚙</button>
              <span class="toast" hidden></span>
            </div>
          </div>
        </div>
        <div class="tabs" role="tablist">
          <button class="tab" data-tab="props" role="tab" aria-selected="true">속성</button>
          <button class="tab" data-tab="history" role="tab" aria-selected="false">
            이력 <span class="badge" hidden>0</span>
          </button>
        </div>
        <div class="body">
          <div class="tab-panel" data-tab-panel="props"><slot name="props"></slot></div>
          <div class="tab-panel" data-tab-panel="history" hidden><slot name="history"></slot></div>
        </div>
        <div class="settings-popover" hidden>
          <div class="row"><b>테마</b>
            <label><input type="radio" name="theme" value="auto"> 자동</label>
            <label><input type="radio" name="theme" value="dark"> 다크</label>
            <label><input type="radio" name="theme" value="light"> 라이트</label>
          </div>
          <div class="row"><b>투명도</b>
            <input type="range" name="opacity" min="30" max="100" step="5"> <span class="opacity-value">100%</span>
          </div>
          <div class="row">
            <button type="button" name="reset-positions">패널 위치 초기화</button>
          </div>
          <div class="row version-row"><small>DesignPoke <span class="version">dev</span></small></div>
        </div>
      </div>
    `
  }

  // ---- 접기/펼치기 -----------------------------------------------------

  setupCollapse() {
    const toggle = this.$shadow.querySelector('[data-collapse-toggle]')
    const applyCollapsed = s => {
      const collapsed = !!(s.positions && s.positions.sidePanelCollapsed)
      this.toggleAttribute('data-collapsed', collapsed)
    }
    applyCollapsed(Settings.get())
    this._offCollapse = Settings.onChange(applyCollapsed)
    Settings.load().then(applyCollapsed)

    toggle.addEventListener('click', e => {
      e.stopPropagation()
      const next = !this.hasAttribute('data-collapsed')
      this.toggleAttribute('data-collapsed', next)
      Settings.set({ positions: { sidePanelCollapsed: next } })
    })
  }

  // ---- 탭 ----------------------------------------------------------------

  setupTabs() {
    const tabs = Array.from(this.$shadow.querySelectorAll('.tab'))
    tabs.forEach(tab => {
      tab.addEventListener('click', () => this.selectTab(tab.dataset.tab))
    })
  }

  selectTab(name) {
    if (this._activeTab === name) return
    this._activeTab = name

    this.$shadow.querySelectorAll('.tab').forEach(tab => {
      tab.setAttribute('aria-selected', String(tab.dataset.tab === name))
    })
    this.$shadow.querySelectorAll('.tab-panel').forEach(panel => {
      panel.toggleAttribute('hidden', panel.dataset.tabPanel !== name)
    })

    if (name === 'history') {
      this._lastSeenCount = HumanFormatter.getChangeCount()
      this.setBadge(0)
    }
  }

  // ---- 변경 이력 배지 -----------------------------------------------------

  startBadgeWatch() {
    this._lastSeenCount = HumanFormatter.getChangeCount()
    this._badgeInterval = setInterval(() => {
      const count = HumanFormatter.getChangeCount()
      if (this._activeTab === 'props' && count > this._lastSeenCount) {
        this.setBadge(count)
      } else if (this._activeTab === 'history') {
        this._lastSeenCount = count
      }
    }, BADGE_POLL_MS)
  }

  stopBadgeWatch() {
    if (this._badgeInterval) {
      clearInterval(this._badgeInterval)
      this._badgeInterval = null
    }
  }

  setBadge(count) {
    const badge = this.$shadow.querySelector('.badge')
    if (!badge) return
    if (count > 0) {
      badge.textContent = String(count)
      badge.hidden = false
    } else {
      badge.hidden = true
    }
  }

  // ---- 현재 선택된 요소 이름 -----------------------------------------------

  updateElementName(el) {
    const nameEl = this.$shadow.querySelector('.element-name')
    if (!nameEl) return
    nameEl.textContent = elementLabel(el)
  }

  // ---- AI로 복사 ------------------------------------------------------------

  setupAICopy() {
    const btn = this.$shadow.querySelector('[data-ai-copy]')
    if (!btn) return

    btn.addEventListener('click', async e => {
      e.stopPropagation()
      if (e.altKey) {
        ChangeTracker.clearAll()
        this.showToast('초기화 완료')
        return
      }
      const result = await AIFormatter.copyAllChangesForAI()
      this.showToast(result.success ? '복사 완료' : (result.message || '복사 실패'))
    })
  }

  showToast(message) {
    const toast = this.$shadow.querySelector('.toast')
    if (!toast) return
    toast.textContent = message
    toast.hidden = false
    clearTimeout(this._toastTimer)
    this._toastTimer = setTimeout(() => { toast.hidden = true }, 1500)
  }

  // ---- 설정(⚙) 팝오버 -------------------------------------------------------

  setupSettingsPopover() {
    const root = this.$shadow
    const toggle = root.querySelector('[data-settings-toggle]')
    const popover = root.querySelector('.settings-popover')
    if (!toggle || !popover) return

    const versionEl = popover.querySelector('.version')
    const vb = document.querySelector('vis-bug')
    if (versionEl) versionEl.textContent = (vb && vb.getAttribute('version')) || 'dev'

    const sync = s => {
      root.querySelectorAll('input[name="theme"]').forEach(r => { r.checked = r.value === s.theme })
      const range = root.querySelector('input[name="opacity"]')
      const out = root.querySelector('.opacity-value')
      if (range) range.value = String(Math.round(s.opacity * 100))
      if (out) out.textContent = `${Math.round(s.opacity * 100)}%`
    }

    this._offSettings = Settings.onChange(sync)
    Settings.load().then(sync)

    toggle.addEventListener('click', e => {
      e.stopPropagation()
      const open = popover.hasAttribute('hidden')
      popover.toggleAttribute('hidden', !open)
    })

    root.querySelectorAll('input[name="theme"]').forEach(r =>
      r.addEventListener('change', () => Settings.set({ theme: r.value })))

    const range = root.querySelector('input[name="opacity"]')
    range && range.addEventListener('input', () => Settings.set({ opacity: Number(range.value) / 100 }))

    const reset = root.querySelector('button[name="reset-positions"]')
    reset && reset.addEventListener('click', () => Settings.resetPanelPositions())

    popover.addEventListener('click', e => e.stopPropagation())
  }
}

customElements.define('visbug-side-panel', SidePanel)
