import $ from 'blingblingjs'
import { handleLabelText } from './label-text'
import { queryPage } from '../search'
import { isFixed, onRemove } from '../../utilities/'

export function createOverlayUI({
  getActiveTool,
  labels,
  handles,
  setHandlesHidden,
  onQuerySelect,
}) {
  const hover_state = {
    target:   null,
    element:  null,
    label:    null,
  }

  const overlayHoverUI = ({el, no_hover = false, no_label = true}) => {
    if (hover_state.target === el) return
    hover_state.target = el

    hover_state.element = no_hover
      ? null
      : createHover(el)

    hover_state.label   = no_label
      ? null
      : createHoverLabel(el, handleLabelText(el, getActiveTool()))
  }

  const clearHover = () => {
    if (!hover_state.target) return

    hover_state.element && hover_state.element.remove()
    hover_state.label && hover_state.label.remove()

    hover_state.target  = null
    hover_state.element = null
    hover_state.label   = null
  }

  const overlayMetaUI = ({el, id, no_label = true}) => {
    let handle = createHandle({el, id})

    const rect = el.getBoundingClientRect()
    if (rect.width <= 30 || rect.height <= 30) {
      setHandlesHidden(true)
      if (handle) {
        const handleShadow = handle.$shadow || handle.shadowRoot
        if (handleShadow) {
          requestAnimationFrame(() => {
            handleShadow.querySelectorAll('visbug-handle').forEach(h => {
              h.style.display = 'none'
            })
          })
        }
      }
    }

    let label  = no_label
      ? null
      : createLabel({
          el,
          id,
          template: handleLabelText(el, getActiveTool())
        })

    let observer        = createObserver(el, {handle,label})
    let parentObserver  = createObserver(el, {handle,label})

    observer.observe(el, { attributes: true })
    parentObserver.observe(el.parentNode, { childList:true, subtree:true })

    if (label !== null) {
      onRemove(label, () => {
        observer.disconnect()
        parentObserver.disconnect()
      })
    }
  }

  const setLabel = (el, label) => {
    label.text = handleLabelText(el, getActiveTool())
    label.update = {boundingRect: el.getBoundingClientRect(), isFixed: isFixed(el)}

    handles.forEach(handle => {
      handle.hidePopover && handle.hidePopover()
      handle.showPopover && handle.showPopover()
    })
  }

  const createLabel = ({el, id, template}) => {
    if (!labels[id]) {
      const label = document.createElement('visbug-label')

      label.text = template
      label.position = {
        boundingRect:   el.getBoundingClientRect(),
        node_label_id:  id,
        isFixed: isFixed(el),
      }

      document.body.appendChild(label)

      $(label).on('query', ({detail}) => {
        if (!detail.text) return

        queryPage('[data-pseudo-select]', el =>
          el.removeAttribute('data-pseudo-select'))

        queryPage(detail.text + ':not([data-selected])', el =>
          detail.activator === 'mouseenter'
            ? el.setAttribute('data-pseudo-select', true)
            : onQuerySelect(el))
      })

      $(label).on('mouseleave', e => {
        e.preventDefault()
        e.stopPropagation()
        queryPage('[data-pseudo-select]', el =>
          el.removeAttribute('data-pseudo-select'))
      })

      labels[labels.length] = label

      handles.forEach(handle => {
        handle.hidePopover && handle.hidePopover()
        handle.showPopover && handle.showPopover()
      })

      return label
    }
  }

  const createHandle = ({el, id}) => {
    if (!handles[id]) {
      const handle = document.createElement('visbug-handles')

      handle.position = { el, node_label_id: id }

      document.body.appendChild(handle)

      handles[handles.length] = handle
      return handle
    }
  }

  const createHover = el => {
    if (!el.hasAttribute('data-pseudo-select') && !el.hasAttribute('data-label-id')) {
      if (hover_state.element)
        hover_state.element.remove()

      hover_state.element = document.createElement('visbug-hover')
      document.body.appendChild(hover_state.element)
      hover_state.element.position = {el}

      return hover_state.element
    }
  }

  const createHoverLabel = (el, text) => {
    if (!el.hasAttribute('data-pseudo-select') && !el.hasAttribute('data-label-id')) {
      if (hover_state.label)
        hover_state.label.remove()

      hover_state.label = document.createElement('visbug-label')
      document.body.appendChild(hover_state.label)

      hover_state.label.text = text
      hover_state.label.position = {
        boundingRect:   el.getBoundingClientRect(),
        node_label_id:  'hover',
      }

      hover_state.label.style.setProperty(`--label-bg`, `hsl(267, 100%, 58%)`)


      return hover_state.label
    }
  }

  const createCorners = el => {
    if (!el.hasAttribute('data-pseudo-select') && !el.hasAttribute('data-label-id')) {
      if (hover_state.element)
        hover_state.element.remove()

      hover_state.element = document.createElement('visbug-corners')
      document.body.appendChild(hover_state.element)
      hover_state.element.position = {el}

      return hover_state.element
    }
  }

  const setHandle = (el, handle) => {
    handle.position = {
      el,
      node_label_id:  el.getAttribute('data-label-id'),
    }
  }

  const createObserver = (node, {label,handle}) =>
    new MutationObserver(list => {
      label && setLabel(node, label)
      handle && setHandle(node, handle)
    })

  return {
    overlayHoverUI,
    clearHover,
    overlayMetaUI,
    getHoverState: () => hover_state,
  }
}
