import hotkeys    from 'hotkeys-js'

import {
  Handles, Handle, Label, Overlay, Gridlines, Corners,
  Hotkeys, Metatip, Ally, Distance, BoxModel, Grip,
  HistoryPanel, SidePanel
} from '../'

import {
  Selectable, Moveable, Padding, Margin, EditText, Font,
  Flex, Guides, Position,
  ColorPicker, HueShift,
  AICopy,
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

// <vis-bug> 는 이제 화면에 아무것도 그리지 않는 "숨은 컨트롤러"다.
// 실제 UI는 오른쪽 사이드 패널(<visbug-side-panel>, 속성/이력 탭)이 전부 맡는다.
// 여기서는 선택 엔진 · 색상 피커 · 안내선 · 깊이 선택 · 도구 전환(hotkeys)만 관리한다.
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

    // 오른쪽 사이드 패널 셸: 속성(visbug-props) / 이력(visbug-history) 탭을 담는다
    this.sidePanel = document.createElement('visbug-side-panel')
    this.sidePanel.visbug = this

    this.historyPanel = document.createElement('visbug-history')
    this.historyPanel.setAttribute('slot', 'history')
    this.sidePanel.appendChild(this.historyPanel)

    // 히스토리 패널에서 요소 클릭 시 선택
    this.historyPanel.addEventListener('select-element', (e) => {
      const { element } = e.detail
      if (element && element.isConnected) {
        this.selectorEngine.unselect_all({silent: true})
        this.selectorEngine.select(element)
      }
    })

    // 워커 통합 훅: 속성 패널(visbug-props) — 정의돼 있을 때만 마운트
    if (customElements.get('visbug-props')) {
      this.propsPanel = document.createElement('visbug-props')
      this.propsPanel.visbug = this
      this.propsPanel.setAttribute('slot', 'props')
      this.sidePanel.appendChild(this.propsPanel)
    }

    // 내 킷 탭 (visbug-kit-panel) — 정의돼 있을 때만 마운트
    if (customElements.get('visbug-kit-panel')) {
      this.kitPanel = document.createElement('visbug-kit-panel')
      this.kitPanel.slot = 'kit'
      this.kitPanel.visbug = this
      this.sidePanel.appendChild(this.kitPanel)
    }

    document.body.appendChild(this.sidePanel)

    if (typeof Features.Notes === 'function') {
      this.notesFeature = Features.Notes(this)
    }
    // 텍스트 미니 툴바: 텍스트가 있는 요소를 선택하면 도구와 무관하게 표시
    if (typeof Features.TextToolbarFeature === 'function') {
      this.textToolbarFeature = Features.TextToolbarFeature(this)
    }

    // 기본 도구: 선택/이동 (position)
    this.toolSelected('position')
  }

  disconnectedCallback() {
    this.deactivate_feature && this.deactivate_feature()
    this.guidesFeature && this.guidesFeature()
    this.depthFeature && this.depthFeature()
    this.sidePanel && this.sidePanel.remove()
    this.notesFeature && this.notesFeature()
    this.textToolbarFeature && this.textToolbarFeature()
    Features.PropHint && Features.PropHint.teardownPropHint()
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

    Object.entries(this.toolbar_model).forEach(([key, value]) =>
      hotkeys(key, e => {
        e.preventDefault()
        this.toolSelected(value.tool, e)
      })
    )

    hotkeys(`${metaKey}+/,${metaKey}+.`, e =>
      this.$shadow.host.style.display =
        this.$shadow.host.style.display === 'none'
          ? 'block'
          : 'none')
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

  // 도구 전환 API. 예전에는 툴바 <li> 엘리먼트를 받았지만, 툴바가 없어진 지금은
  // 도구 이름 문자열만 받는다 (하위 호환을 위해 dataset.tool을 가진 엘리먼트도 허용).
  toolSelected(name, e) {
    const toolName = typeof name === 'string'
      ? name
      : (name && name.dataset && name.dataset.tool)

    if (!toolName) return

    // aicopy는 액션 버튼: 현재 도구를 바꾸지 않고 복사만 수행 (Alt+클릭은 초기화)
    if (toolName === 'aicopy') {
      this.aicopy(e)
      this.flashActionButton()
      return
    }

    if (this.active_tool_name === toolName) return

    if (this.active_tool_name) {
      this.deactivate_feature && this.deactivate_feature()
    }

    this.active_tool_name = toolName
    if (typeof this[toolName] === 'function') this[toolName]()
  }

  // 예전엔 툴바 버튼을 잠깐 밝게 깜빡였지만, 버튼이 없어졌으므로 아무 것도 하지 않는다.
  flashActionButton() {}

  render() {
    return `
      <ol colors hidden>
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
    return this.active_tool_name
  }
}

customElements.define('vis-bug', VisBug)
