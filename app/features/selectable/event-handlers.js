import $ from 'blingblingjs'
import hotkeys from 'hotkeys-js'
import { canMoveLeft, canMoveRight } from '../move'
import { createMeasurements, clearMeasurements } from '../measurements'
import { createMarginVisual } from '../margin'
import { createPaddingVisual } from '../padding'
import { ChangeTracker } from '../change-tracker'
import { AIFormatter } from '../ai-formatter'
import { takeScreenshot } from '../screenshot'

import {
  metaKey,
  isOffBounds, deepElementFromPoint,
  isSelectorValid, findNearestChildElement, findNearestParentElement,
} from '../../utilities/'

export function createEventHandlers({
  visbug,
  getSelected,
  getHandles,
  getHandlesHidden,
  setHandlesHidden,
  select,
  unselect,
  unselect_all,
  delete_all,
  expandSelection,
  combineNodeNameAndClass,
  overlayHoverUI,
  clearHover,
  getHoverState,
  on_copy, on_cut, on_paste, on_copy_styles, on_paste_styles,
}) {
  const page = document.body

  const listen = () => {
    page.addEventListener('click', on_click, true)
    page.addEventListener('dblclick', on_dblclick, true)

    page.on('selectstart', on_selection)
    page.on('mousemove', on_hover)
    document.addEventListener('copy', on_copy)
    document.addEventListener('cut', on_cut)
    document.addEventListener('paste', on_paste)

    watchCommandKey()

    hotkeys(`${metaKey}+alt+c`, on_copy_styles)
    hotkeys(`${metaKey}+alt+v`, e => on_paste_styles())
    hotkeys('esc', on_esc)
    hotkeys(`${metaKey}+d`, on_duplicate)
    hotkeys('backspace,del,delete', on_delete)
    hotkeys('alt+del,alt+backspace', on_clearstyles)
    hotkeys(`${metaKey}+e,${metaKey}+shift+e`, on_expand_selection)
    hotkeys(`${metaKey}+g,${metaKey}+shift+g`, on_group)
    hotkeys('tab,shift+tab,enter,shift+enter', on_keyboard_traversal)
    hotkeys(`${metaKey}+shift+enter`, on_select_children)
    hotkeys(`shift+'`, on_select_parent)
    hotkeys(`${metaKey}+z`, on_undo)
    hotkeys(`${metaKey}+shift+z`, on_redo)
    hotkeys('alt+s', on_screenshot)
    hotkeys('shift+h', on_toggle_handles)
  }

  const unlisten = () => {
    page.removeEventListener('click', on_click, true)
    page.removeEventListener('dblclick', on_dblclick, true)

    page.off('selectstart', on_selection)
    page.off('mousemove', on_hover)

    document.removeEventListener('copy', on_copy)
    document.removeEventListener('cut', on_cut)
    document.removeEventListener('paste', on_paste)

    hotkeys.unbind(`esc,${metaKey}+d,backspace,del,delete,alt+del,alt+backspace,${metaKey}+e,${metaKey}+shift+e,${metaKey}+g,${metaKey}+shift+g,tab,shift+tab,enter,shift+enter,${metaKey}+z,${metaKey}+shift+z,alt+s,shift+h`)
  }

  const on_click = e => {
    const $target = deepElementFromPoint(e.clientX, e.clientY)
    const selected = getSelected()

    if (!$target) return
    if (isOffBounds($target) && !selected.filter(el => el == $target).length)
      return

    e.preventDefault()
    if (!e.altKey) e.stopPropagation()

    // Ctrl+클릭: 요소 선택 없이 바로 식별자 복사
    if (e.ctrlKey || e.metaKey) {
      const identifier = AIFormatter.getIdentifier($target)
      navigator.clipboard.writeText(identifier)
      return
    }

    if (!e.shiftKey) {
      unselect_all({silent:true})
      clearMeasurements()
    }

    if(e.shiftKey && $target.hasAttribute('data-selected'))
      unselect($target.getAttribute('data-label-id'))
    else
      select($target)
  }

  const on_dblclick = e => {
    e.preventDefault()
    e.stopPropagation()
    if (isOffBounds(e.target)) return
    visbug.toolSelected('text')
  }

  const watchCommandKey = e => {
    let did_hide = false

    document.onkeydown = function(e) {
      if (hotkeys.ctrl && getSelected().length) {
        $('visbug-handles, visbug-label, visbug-hover, visbug-grip').forEach(el =>
          el.style.display = 'none')

        did_hide = true
      }
    }

    document.onkeyup = function(e) {
      if (did_hide) {
        $('visbug-handles, visbug-label, visbug-hover, visbug-grip').forEach(el =>
          el.style.display = null)

        did_hide = false
      }
    }
  }

  const on_esc = _ => {
    if (getSelected().length === 0) {
      // 선택된 요소가 없으면 VisBug 닫기
      const visbugEl = document.querySelector('vis-bug')
      if (visbugEl) visbugEl.remove()
    } else {
      unselect_all()
    }
  }

  const on_duplicate = e => {
    const root_node = getSelected()[0]
    if (!root_node) return

    const deep_clone = root_node.cloneNode(true)
    deep_clone.removeAttribute('data-selected')
    root_node.parentNode.insertBefore(deep_clone, root_node.nextSibling)
    e.preventDefault()
  }

  let deleting = false
  const on_delete = e => {
    if (deleting || !getSelected().length) return
    deleting = true
    try {
      delete_all()
    } finally {
      deleting = false
    }
  }

  const on_clearstyles = e =>
    getSelected().forEach(el =>
      el.attr('style', null))

  const on_undo = e => {
    e.preventDefault()
    const result = ChangeTracker.undo()
    if (!result) return

    if (result.type === 'deletion') {
      // 삭제된 요소를 원래 위치에 다시 삽입
      const { element, parent, nextSibling } = result
      if (parent && parent.isConnected) {
        if (nextSibling && nextSibling.parentNode === parent) {
          parent.insertBefore(element, nextSibling)
        } else {
          parent.appendChild(element)
        }
        unselect_all({silent: true})
        select(element)
      }
    } else {
      // 스타일 변경 undo
      unselect_all({silent: true})
      select(result.element)
    }
  }

  const on_redo = e => {
    e.preventDefault()
    const result = ChangeTracker.redo()
    if (!result) return

    if (result.type === 'deletion') {
      // 요소를 다시 삭제
      const { element } = result
      unselect_all({silent: true})
      element.remove()
    } else {
      // 스타일 변경 redo
      unselect_all({silent: true})
      select(result.element)
    }
  }

  const on_screenshot = e => {
    e.preventDefault()
    takeScreenshot()
  }

  const on_toggle_handles = e => {
    e.preventDefault()
    const newVal = !getHandlesHidden()
    setHandlesHidden(newVal)
    getHandles().forEach(handle => {
      if (handle) {
        const handleShadow = handle.$shadow || handle.shadowRoot
        if (handleShadow) {
          handleShadow.querySelectorAll('visbug-handle').forEach(h => {
            h.style.display = newVal ? 'none' : null
          })
        }
      }
    })
  }

  const on_expand_selection = (e, {key}) => {
    e.preventDefault()

    const [root] = getSelected()
    if (!root) return

    const query = combineNodeNameAndClass(root)

    if (isSelectorValid(query))
      expandSelection({
        query,
        all: key.includes('shift'),
      })
  }

  const on_group = (e, {key}) => {
    e.preventDefault()
    const selected = getSelected()

    if (key.split('+').includes('shift')) {
      let $selected = [...selected]
      unselect_all()
      $selected.reverse().forEach(el => {
        let l = el.children.length
        while (el.children.length > 0) {
          var node = el.childNodes[el.children.length - 1]
          if (node.nodeName !== '#text')
            select(node)
          el.parentNode.prepend(node)
        }
        el.parentNode.removeChild(el)
      })
    }
    else {
      let div = document.createElement('div')
      selected[0].parentNode.prepend(
        selected.reverse().reduce((div, el) => {
          div.appendChild(el)
          return div
        }, div)
      )
      unselect_all()
      select(div)
    }
  }

  const on_selection = e =>
    !isOffBounds(e.target)
    && getSelected().length
    && getSelected()[0].textContent != e.target.textContent
    && e.preventDefault()

  const on_keyboard_traversal = (e, {key}) => {
    const selected = getSelected()
    if (!selected.length) return

    e.preventDefault()
    e.stopPropagation()

    const targets = selected.reduce((flat_n_unique, node) => {
      const element_to_left     = canMoveLeft(node)
      const element_to_right    = canMoveRight(node)
      const has_parent_element  = findNearestParentElement(node)
      const has_child_elements  = findNearestChildElement(node)

      if (key.includes('shift')) {
        if (key.includes('tab') && element_to_left)
          flat_n_unique.add(element_to_left)
        else if (key.includes('enter') && has_parent_element)
          flat_n_unique.add(has_parent_element)
        else
          flat_n_unique.add(node)
      }
      else {
        if (key.includes('tab') && element_to_right)
          flat_n_unique.add(element_to_right)
        else if (key.includes('enter') && has_child_elements)
          flat_n_unique.add(has_child_elements)
        else
          flat_n_unique.add(node)
      }

      return flat_n_unique
    }, new Set())

    if (targets.size) {
      unselect_all({silent:true})
      targets.forEach(node => {
        select(node)
        show_tip(node)
      })
    }
  }

  const show_tip = () => {}

  const on_hover = e => {
    const $target = deepElementFromPoint(e.clientX, e.clientY)
    const tool = visbug.activeTool
    const selected = getSelected()

    if (!$target) {
      clearMeasurements()
      return clearHover()
    }

    if (isOffBounds($target) || $target.hasAttribute('data-selected') || $target.hasAttribute('draggable')) {
      clearMeasurements()
      return clearHover()
    }

    overlayHoverUI({
      el: $target,
      // no_hover: tool === 'guides',
      no_label:
           (tool === 'guides'
        || tool === 'margin'
        || tool === 'padding'),
    })

    const hover_state = getHoverState()

    if (tool === 'guides' && selected.length >= 1 && !selected.includes($target)) {
      $target.setAttribute('data-measuring', true)
      const [$anchor] = selected
      createMeasurements({$anchor, $target})
    }
    else if (tool === 'margin' && hover_state.element && !hover_state.element.$shadow.querySelector('visbug-boxmodel')) {
      hover_state.element.$shadow.appendChild(
        createMarginVisual(hover_state.target, true))
    }
    else if (tool === 'padding' && hover_state.element && !hover_state.element.$shadow.querySelector('visbug-boxmodel')) {
      hover_state.element.$shadow.appendChild(
        createPaddingVisual(hover_state.target, true))
    }
    else if ($target.hasAttribute('data-measuring') || selected.includes($target)) {
      clearMeasurements()
    }

    // force promote into top layer
    if (tool === 'guides') {
      getHandles().forEach(handle => {
        handle.hidePopover &&  handle.hidePopover()
        handle.showPopover && handle.showPopover()
      })
    }
  }

  const on_select_children = (e, {key}) => {
    const selected = getSelected()
    const targets = selected
      .filter(node => node.children.length)
      .reduce((flat, {children}) =>
        [...flat, ...Array.from(children)], [])

    if (targets.length) {
      e.preventDefault()
      e.stopPropagation()

      unselect_all()
      targets.forEach(node => select(node))
    }
  }

  const on_select_parent = (e, {key}) => {
    const selected = getSelected()
    const targets = selected.reduce((parents, node) => {
      const parent_element = node.parentElement;

      if (parent_element.hasAttribute('data-outward'))
        return parents

      parent_element.setAttribute('data-outward', true)
      parents.push(parent_element)

      return parents
    }, [])

    if (targets.length) {
      e.preventDefault()
      e.stopPropagation()

      targets.forEach(node => {
        if (node && node !== document.body) {
          select(node)
        }
      })
    }
  }

  return { listen, unlisten }
}
