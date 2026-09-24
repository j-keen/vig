import $ from 'blingblingjs'
import { handleLabelText } from './label-text'
import { createCallbackSystem } from './callback-system'
import { createClipboardHandlers } from './clipboard-handlers'
import { createOverlayUI } from './overlay-ui'
import { createEventHandlers } from './event-handlers'

import { canMoveLeft, canMoveRight } from '../move'
import { watchImagesForUpload } from '../imageswap'
import { draggable } from '../position'
import { ChangeTracker } from '../change-tracker'

import { createClassname, isOffBounds } from '../../utilities/'
import { getCSSSelector } from '../ai-formatter'

export function Selectable(visbug) {
  let selected            = []
  let labels              = []
  let handles             = []
  let draggables          = []  // 드래그 가능한 요소들 추적
  let handlesHidden       = false
  const selectorPaths     = new WeakMap()  // 선택 요소 → CSS 경로 (프레임워크 재렌더 후 재선택용)

  const { onSelectedUpdate, removeSelectedCallback, tellWatchers } = createCallbackSystem(() => selected)
  const { on_copy, on_cut, on_paste, on_copy_styles, on_paste_styles } = createClipboardHandlers({ getSelected: () => selected })

  const overlayUI = createOverlayUI({
    getActiveTool: () => visbug.activeTool,
    labels,
    handles,
    setHandlesHidden: v => { handlesHidden = v },
    onQuerySelect: el => select(el),
  })

  const select = el => {
    const id = handles.length
    const tool = visbug.activeTool

    el.setAttribute('data-selected', true)
    el.setAttribute('data-label-id', id)
    try { selectorPaths.set(el, getCSSSelector(el)) } catch (e) {}

    overlayUI.clearHover()

    overlayUI.overlayMetaUI({
      el,
      id,
      no_label:
           tool === 'guides'
        || tool === 'margin'
        || tool === 'move',
    })

    $('visbug-metatip, visbug-ally').forEach(tip => {
      tip.hidePopover && tip.hidePopover()
      tip.showPopover && tip.showPopover()
    })

    // 드래그 이동 항상 활성화 (다중 선택 시 함께 이동)
    const dragState = draggable({
      el,
      getSiblings: () => selected  // 현재 선택된 모든 요소 반환
    })
    draggables.push(dragState)

    selected.unshift(el)
    tellWatchers()
  }

  const selection = () =>
    selected

  const unselect = id => {
    [...labels, ...handles]
      .filter(node =>
          node.getAttribute('data-label-id') === id)
        .forEach(node =>
          node.remove())

    const removed = selected.filter(node =>
      node.getAttribute('data-label-id') === id)

    removed.forEach(node =>
      $(node).attr({
        'data-selected':      null,
        'data-selected-hide': null,
        'data-label-id':      null,
        'data-pseudo-select':         null,
        'data-measuring':     null,
        'data-outward':       null,
    }))

    draggables = draggables.filter(d => {
      if (removed.includes(d.el)) {
        d.teardown && d.teardown()
        return false
      }
      return true
    })

    selected = selected.filter(node => node.getAttribute('data-label-id') !== id)

    tellWatchers()
  }

  const unselect_all = ({silent = false} = {}) => {
    selected
      .forEach(el =>
        $(el).attr({
          'data-selected':      null,
          'data-selected-hide': null,
          'data-label-id':      null,
          'data-pseudo-select': null,
          'data-outward':       null,
        }))

    $('[data-pseudo-select]').forEach(hover =>
      hover.removeAttribute('data-pseudo-select'))

    Array.from([
      ...$('visbug-handles'),
      ...$('visbug-label'),
      ...$('visbug-hover'),
      ...$('visbug-distance'),
    ]).forEach(el =>
      el.remove())

    // 드래그 정리
    draggables.forEach(d => d.teardown && d.teardown())
    draggables = []

    labels.length   = 0
    handles.length  = 0
    selected  = []
    handlesHidden = false

    !silent && tellWatchers()
  }

  const delete_all = () => {
    const selected_after_delete = selected.map(el => {
      if (canMoveRight(el))     return canMoveRight(el)
      else if (canMoveLeft(el)) return canMoveLeft(el)
      else if (el.parentNode)   return el.parentNode
    })

    // 삭제 전에 추적 기록
    selected.forEach(el => ChangeTracker.trackDeletion(el))

    Array.from([...selected, ...labels, ...handles]).forEach(el =>
      el.remove())

    labels.length   = 0
    handles.length  = 0
    selected  = []

    selected_after_delete.forEach(el => {
      if (!el || !el.isConnected) return
      const tag = (el.tagName || '').toLowerCase()
      if (tag === 'vis-bug' || tag.startsWith('visbug')) return
      select(el)
    })
  }

  const expandSelection = ({query, all = false}) => {
    if (all) {
      const unselecteds = $(query + ':not([data-selected])')
      unselecteds.forEach(select)
    }
    else {
      const potentials = $(query)
      if (!potentials) return

      const [anchor] = selected
      const root_node_index = potentials.reduce((index, node, i) =>
        node == anchor
          ? index = i
          : index
      , null)

      if (root_node_index !== null) {
        if (!potentials[root_node_index + 1]) {
          const potential = potentials.filter(el => !el.attr('data-selected'))[0]
          if (potential) select(potential)
        }
        else {
          select(potentials[root_node_index + 1])
        }
      }
    }
  }

  const combineNodeNameAndClass = node =>
    `${node.nodeName.toLowerCase()}${createClassname(node)}`

  const eventHandlers = createEventHandlers({
    visbug,
    getSelected:        () => selected,
    getHandles:         () => handles,
    getHandlesHidden:   () => handlesHidden,
    setHandlesHidden:   v => { handlesHidden = v },
    select,
    unselect,
    unselect_all,
    delete_all,
    expandSelection,
    combineNodeNameAndClass,
    overlayHoverUI:     overlayUI.overlayHoverUI,
    clearHover:         overlayUI.clearHover,
    getHoverState:      overlayUI.getHoverState,
    on_copy, on_cut, on_paste, on_copy_styles, on_paste_styles,
  })

  // 선택 유지: React 등 프레임워크가 요소를 다시 그려 DOM 노드가 교체되면
  // 같은 CSS 경로의 새 노드를 찾아 조용히 재선택한다 (핸들·패널이 사라지지 않게)
  let reselectScheduled = false
  const reselectReplacedNodes = () => {
    reselectScheduled = false
    const lost = selected.filter(el => !el.isConnected)
    if (!lost.length) return

    const survivors    = selected.filter(el => el.isConnected)
    const replacements = lost
      .map(el => {
        const path = selectorPaths.get(el)
        if (!path) return null
        let found = null
        try { found = document.querySelector(path) } catch (e) { return null }
        if (!found || !found.isConnected || isOffBounds(found) || survivors.includes(found)) return null
        return found
      })
      .filter(Boolean)

    unselect_all({silent: true})
    ;[...survivors, ...replacements].reverse().forEach(el => select(el))
  }

  const domObserver = new MutationObserver(records => {
    if (reselectScheduled || !selected.length) return
    const touched = records.some(r => r.removedNodes.length)
    if (!touched) return
    reselectScheduled = true
    requestAnimationFrame(reselectReplacedNodes)
  })
  domObserver.observe(document.body, { childList: true, subtree: true })

  const disconnect = () => {
    domObserver.disconnect()
    unselect_all()
    eventHandlers.unlisten()
  }

  watchImagesForUpload()
  eventHandlers.listen()

  return {
    select,
    selection,
    unselect_all,
    onSelectedUpdate,
    removeSelectedCallback,
    disconnect,
  }
}

export { handleLabelText } from './label-text'
