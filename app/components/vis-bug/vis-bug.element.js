import $          from 'blingblingjs'
import hotkeys    from 'hotkeys-js'

import {
  Handles, Handle, Label, Overlay, Gridlines, Corners,
  Hotkeys, Metatip, Ally, Distance, BoxModel, Grip,
  HistoryPanel
} from '../'

import {
  Selectable, Moveable, Padding, Margin, EditText, Font,
  Flex, Guides, Position, draggable,
  ColorPicker, HueShift,
  AICopy, setupAICopyTooltip,
  DepthSelector
} from '../../features/'
import * as Features from '../../features/'

import {
  VisBugStyles,
  VisBugLightStyles,
  VisBugDarkStyles
} from '../styles.store'

import { VisBugModel }            from './model'
import * as Icons                 from './vis-bug.icons'
import { PluginRegistry }         from '../../plugins/_registry'
import {
  metaKey,
  isPolyfilledCE,
  constructibleStylesheetSupport,
  schemeRule
} from '../../utilities/'

export default class VisBug extends HTMLElement {
  constructor() {
    super()

    this.toolbar_model  = VisBugModel
    this.$shadow        = this.attachShadow({mode: 'closed'})
    this.applyScheme    = schemeRule(
      this.$shadow,
      VisBugStyles, VisBugLightStyles, VisBugDarkStyles
    )
  }

  static get observedAttributes() {
    return ['color-scheme']
  }

  connectedCallback() {
    this._tutsBaseURL = this.getAttribute('tutsBaseURL') || 'tuts'

    this.setup()

    this.selectorEngine = Selectable(this)
    this.colorPicker = ColorPicker(this.$shadow, this.selectorEngine)

    // 안내선 항상 활성화 (배경 기능으로)
    this.guidesFeature = Guides(this.selectorEngine)

    // 깊이별 요소 선택 (Alt+Wheel 배경 기능)
    this.depthFeature = DepthSelector(this, this.selectorEngine)

    // 히스토리 패널 항상 표시
    this.historyPanel = document.createElement('visbug-history')
    document.body.appendChild(this.historyPanel)

    // 히스토리 패널에서 요소 클릭 시 선택
    this.historyPanel.addEventListener('select-element', (e) => {
      const { element } = e.detail
      if (element && element.isConnected) {
        this.selectorEngine.unselect_all({silent: true})
        this.selectorEngine.select(element)
      }
    })

    // 워커 통합 훅: 속성 패널(visbug-props), 메모 기능(Notes) — 정의돼 있을 때만 마운트
    if (customElements.get('visbug-props')) {
      this.propsPanel = document.createElement('visbug-props')
      this.propsPanel.visbug = this
      document.body.appendChild(this.propsPanel)
    }
    if (typeof Features.Notes === 'function') {
      this.notesFeature = Features.Notes(this)
    }
    // 텍스트 미니 툴바: 텍스트가 있는 요소를 선택하면 도구와 무관하게 표시
    if (typeof Features.TextToolbarFeature === 'function') {
      this.textToolbarFeature = Features.TextToolbarFeature(this)
    }

    // 기본 도구: 선택/이동 (position)
    this.toolSelected($('[data-tool="position"]', this.$shadow)[0])
  }

  disconnectedCallback() {
    this.deactivate_feature && this.deactivate_feature()
    this.guidesFeature && this.guidesFeature()
    this.depthFeature && this.depthFeature()
    this.historyPanel && this.historyPanel.remove()
    this.propsPanel && this.propsPanel.remove()
    this.notesFeature && this.notesFeature()
    this.textToolbarFeature && this.textToolbarFeature()
    this.cleanup()
    this.selectorEngine.disconnect()
    hotkeys.unbind(
      Object.keys(this.toolbar_model).reduce((events, key) =>
        events += ',' + key, ''))
    hotkeys.unbind(`${metaKey}+/`)
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'color-scheme')
      this.applyScheme(newValue)
  }

  setup() {
    this.$shadow.innerHTML = this.render()

    this.hasAttribute('color-mode')
      ? this.getAttribute('color-mode')
      : this.setAttribute('color-mode', 'hex')

    this.hasAttribute('color-scheme')
      ? this.getAttribute('color-scheme')
      : this.setAttribute('color-scheme', 'auto')

    this.setAttribute('popover', 'manual')
    this.showPopover && this.showPopover()

    const main_ol = this.$shadow.querySelector('ol')
    const buttonPieces = $('li[data-tool], li[data-tool] *', main_ol)

    const clickEvent = (e, clickSurface) => {
      const target = clickSurface || e.target
      const toolButton = target.closest ? target.closest('[data-tool]') : null
      if (toolButton) {
        this.toolSelected(toolButton, e)
        e.stopPropagation && e.stopPropagation()
      }
    }

    Array.from(buttonPieces)
    .forEach(toolButton => {
      draggable({
        el:this,
        surface: toolButton,
        cursor: 'pointer',
        clickEvent: clickEvent
      })
    })

    draggable({
      el:this,
      surface: main_ol,
      cursor: 'grab',
    })

    Object.entries(this.toolbar_model).forEach(([key, value]) =>
      hotkeys(key, e => {
        e.preventDefault()
        this.toolSelected(
          $(`[data-tool="${value.tool}"]`, this.$shadow)[0],
          e
        )
      })
    )

    hotkeys(`${metaKey}+/,${metaKey}+.`, e =>
      this.$shadow.host.style.display =
        this.$shadow.host.style.display === 'none'
          ? 'block'
          : 'none')

    // AI 복사 버튼 호버 툴팁 설정
    setupAICopyTooltip(this.$shadow)
  }

  cleanup() {
    this.hidePopover && this.hidePopover()

    Array.from(document.body.children)
      .filter(node => node.nodeName.includes('VISBUG'))
      .forEach(el => el.remove())

    this.teardown && this.teardown()

    document.querySelectorAll('[data-pseudo-select=true]')
      .forEach(el =>
        el.removeAttribute('data-pseudo-select'))

    document.querySelectorAll('.visbug-notification').forEach(el => el.remove())
    const notifStyle = document.getElementById('visbug-notification-style')
    if (notifStyle) notifStyle.remove()
  }

  toolSelected(el, e) {
    if (typeof el === 'string')
      el = $(`[data-tool="${el}"]`, this.$shadow)[0]

    if (!el) return

    // aicopy is an action button: copy (or Alt+click clear) without leaving the current tool
    if (el.dataset.tool === 'aicopy') {
      this.aicopy(e)
      this.flashActionButton(el)
      return
    }

    if (this.active_tool && this.active_tool.dataset.tool === el.dataset.tool) return

    if (this.active_tool) {
      this.active_tool.attr('data-active', null)
      this.deactivate_feature && this.deactivate_feature()
    }

    el.attr('data-active', true)
    this.active_tool = el
    this[el.dataset.tool]()
  }

  flashActionButton(el) {
    if (!el || !el.style) return
    const previous = el.style.filter
    el.style.filter = 'brightness(1.8)'
    el.setAttribute('data-copied', 'true')
    clearTimeout(this._actionFlashTimer)
    this._actionFlashTimer = setTimeout(() => {
      el.style.filter = previous
      el.removeAttribute('data-copied')
    }, 280)
  }

  render() {
    return `
      <visbug-hotkeys></visbug-hotkeys>
      <ol constructible-support="${constructibleStylesheetSupport ? 'false':'true'}">
        ${Object.entries(this.toolbar_model).reduce((list, [key, tool]) => `
          ${list}
          <li aria-label="${tool.label} Tool" aria-description="${tool.description}" aria-hotkey="${key}" data-tool="${tool.tool}" data-active="${key == 'l'}">
            ${tool.icon}
            ${this.demoTip({key, ...tool})}
          </li>
        `,'')}
      </ol>
      <ol colors>
        <li class="color" id="foreground" aria-label="글자색" aria-description="글자 색을 바꿉니다">
          <input type="color">
          ${Icons.color_text}
        </li>
        <li class="color" id="background" aria-label="배경색" aria-description="배경 색을 바꿉니다">
          <input type="color">
          ${Icons.color_background}
        </li>
        <li class="color" id="border" aria-label="테두리색" aria-description="테두리 색을 바꿉니다">
          <input type="color">
          ${Icons.color_border}
        </li>
      </ol>
    `
  }

  demoTip({key, tool, label, description, instruction, hasGif}) {
    const img = hasGif === false
      ? ''
      : `<img src="${this._tutsBaseURL}/${tool}.gif" alt="${description}" onerror="this.style.display='none'" />`
    return `
      <aside ${tool}>
        <figure>
          ${img}
          <figcaption>
            <h2>
              ${label}
              <span hotkey>${key}</span>
            </h2>
            <p>${description}</p>
            ${instruction}
          </figcaption>
        </figure>
      </aside>
    `
  }

  // 도구 메서드들
  guides() {
    // 안내선은 이미 connectedCallback에서 활성화됨
    // 여기서는 추가 동작 없음 (이미 배경에서 실행 중)
    this.deactivate_feature = () => {}
  }

  position() {
    let feature = Position()
    this.selectorEngine.onSelectedUpdate(feature.onNodesSelected)
    this.deactivate_feature = () => {
      this.selectorEngine.removeSelectedCallback(feature.onNodesSelected)
      feature.disconnect()
    }
  }

  margin() {
    this.deactivate_feature = Margin(this.selectorEngine)
  }

  padding() {
    this.deactivate_feature = Padding(this.selectorEngine)
  }

  align() {
    this.deactivate_feature = Flex(this.selectorEngine)
  }

  move() {
    this.deactivate_feature = Moveable(this.selectorEngine)
  }

  text() {
    this.selectorEngine.onSelectedUpdate(EditText)
    this.deactivate_feature = () =>
      this.selectorEngine.removeSelectedCallback(EditText)
  }

  font() {
    this.deactivate_feature = Font(this.selectorEngine)
  }

  hueshift() {
    this.deactivate_feature = HueShift({
      Color:  this.colorPicker,
      Visbug: this.selectorEngine,
    })
  }

  aicopy(e) {
    AICopy(this, e)
  }

  execCommand(command) {
    const query = `/${command}`

    if (PluginRegistry.has(query))
      return PluginRegistry.get(query)({
        selected: this.selectorEngine.selection(),
        query
      })

    return Promise.resolve(new Error("Query not found"))
  }

  get activeTool() {
    return this.active_tool.dataset.tool
  }
}

customElements.define('vis-bug', VisBug)
