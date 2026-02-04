import $          from 'blingblingjs'
import hotkeys    from 'hotkeys-js'

import {
  Handles, Handle, Label, Overlay, Gridlines, Corners,
  Hotkeys, Metatip, Ally, Distance, BoxModel, Grip,
  HistoryPanel
} from '../'

import {
  Selectable, Moveable, Padding, Margin,
  Flex, Guides, Position, draggable,
  AICopy, setupAICopyTooltip,
  DepthSelector
} from '../../features/'

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

    // 기본 도구: guides
    this.toolSelected($('[data-tool="guides"]', this.$shadow)[0])
  }

  disconnectedCallback() {
    this.deactivate_feature && this.deactivate_feature()
    this.guidesFeature && this.guidesFeature()
    this.depthFeature && this.depthFeature()
    this.historyPanel && this.historyPanel.remove()
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
      if (toolButton) this.toolSelected(toolButton) && e.stopPropagation();
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
          $(`[data-tool="${value.tool}"]`, this.$shadow)[0]
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
  }

  toolSelected(el) {
    if (typeof el === 'string')
      el = $(`[data-tool="${el}"]`, this.$shadow)[0]

    if (!el) return

    if (this.active_tool && this.active_tool.dataset.tool === el.dataset.tool) return

    if (this.active_tool) {
      this.active_tool.attr('data-active', null)
      this.deactivate_feature && this.deactivate_feature()
    }

    el.attr('data-active', true)
    this.active_tool = el
    this[el.dataset.tool]()
  }

  render() {
    return `
      <visbug-hotkeys></visbug-hotkeys>
      <ol constructible-support="${constructibleStylesheetSupport ? 'false':'true'}">
        ${Object.entries(this.toolbar_model).reduce((list, [key, tool]) => `
          ${list}
          <li aria-label="${tool.label} Tool" aria-description="${tool.description}" aria-hotkey="${key}" data-tool="${tool.tool}" data-active="${key == 'g'}">
            ${tool.icon}
            ${this.demoTip({key, ...tool})}
          </li>
        `,'')}
      </ol>
    `
  }

  demoTip({key, tool, label, description, instruction}) {
    return `
      <aside ${tool}>
        <figure>
          <img src="${this._tutsBaseURL}/${tool}.gif" alt="${description}" />
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

  aicopy() {
    this.deactivate_feature = AICopy(this)
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
