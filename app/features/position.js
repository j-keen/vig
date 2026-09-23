import $ from 'blingblingjs'
import hotkeys from 'hotkeys-js'
import { metaKey, getStyle, getSide, showHideSelected, isOffBounds } from '../utilities/'
import { ChangeTracker } from './change-tracker'

const DRAG_THRESHOLD = 5

const key_events = 'up,down,left,right'
  .split(',')
  .reduce((events, event) =>
    `${events},${event},alt+${event},shift+${event},shift+alt+${event}`
  , '')
  .substring(1)

const command_events = `${metaKey}+up,${metaKey}+shift+up,${metaKey}+down,${metaKey}+shift+down`

export function Position() {
  const state = {
    elements: []
  }

  hotkeys(key_events, (e, handler) => {
    if (e.cancelBubble) return

    e.preventDefault()
    positionElement(state.elements, handler.key)
  })

  const onNodesSelected = els => {
    // Selectable always attaches draggable; this tool only handles arrow-key nudges.
    state.elements = els
  }

  const disconnect = () => {
    state.elements = []
    hotkeys.unbind(key_events)
    hotkeys.unbind('up,down,left,right')
  }

  return {
    onNodesSelected,
    disconnect,
  }
}

export function draggable({el, surface = el, cursor = 'move', clickEvent, getSiblings = null, track}) {
  const shouldTrack = track ?? !(
    (el.tagName && el.tagName.toUpperCase() === 'VIS-BUG') ||
    isOffBounds(el)
  )

  const state = {
    target: el,
    surface,
    mouse: {
      down: false,
      x: 0,
      y: 0,
    },
    element: {
      x: 0,
      y: 0,
    },
    travelDistance: 0,
    siblings: [],
    siblingOffsets: [],
    shiftKey: false,
    dragStarted: false,
  }

  const setup = () => {
    el.style.transition   = 'none'
    surface.style.cursor  = cursor

    surface.addEventListener('mousedown', onMouseDown, true)
    document.addEventListener('mouseup', onMouseUp, true)
    document.addEventListener('mousemove', onMouseMove, true)
  }

  const teardown = () => {
    el.style.transition   = null
    surface.style.cursor  = null

    surface.removeEventListener('mousedown', onMouseDown, true)
    document.removeEventListener('mouseup', onMouseUp, true)
    document.removeEventListener('mousemove', onMouseMove, true)
  }

  const onMouseDown = e => {
    if (!el.contains(e.target) && !surface.contains(e.target)) return

    if (getSiblings) {
      const selected = getSiblings()
      const hits = selected.filter(node => node === e.target || node.contains(e.target))
      if (hits.length) {
        const deepest = hits.reduce((a, b) => (a.contains(b) ? b : a))
        if (deepest !== el) return
      }
    }

    e.preventDefault()

    state.mouse.x        = e.clientX
    state.mouse.y        = e.clientY
    state.mouse.down     = true
    state.shiftKey       = e.shiftKey
    state.dragStarted    = false
    state.travelDistance = 0
    state.siblings       = []
    state.siblingOffsets = []
  }

  const beginDrag = () => {
    if (state.dragStarted) return
    state.dragStarted = true

    if (shouldTrack) ChangeTracker.captureOriginal(el)

    const selected = getSiblings ? getSiblings() : []
    state.siblings = filterCoMovers(el, selected)
    state.siblingOffsets = []

    if (state.shiftKey && !(el instanceof SVGElement)) {
      const rect = el.getBoundingClientRect()
      el.style.position = 'absolute'
      el.style.left = rect.left + window.scrollX + 'px'
      el.style.top = rect.top + window.scrollY + 'px'

      state.siblings.forEach(sibling => {
        if (shouldTrack) ChangeTracker.captureOriginal(sibling)
        const sibRect = sibling.getBoundingClientRect()
        sibling.style.position = 'absolute'
        sibling.style.left = sibRect.left + window.scrollX + 'px'
        sibling.style.top = sibRect.top + window.scrollY + 'px'
        sibling.style.willChange = 'top,left'
      })
    }
    else {
      if (!(el instanceof SVGElement) && getComputedStyle(el).position == 'static') {
        el.style.position = 'relative'
      }
      state.siblings.forEach(sibling => {
        if (shouldTrack) ChangeTracker.captureOriginal(sibling)
        if (!(sibling instanceof SVGElement) && getComputedStyle(sibling).position === 'static') {
          sibling.style.position = 'relative'
        }
        sibling.style.willChange = 'top,left'
      })
    }

    el.style.willChange = 'top,left'

    state.siblings.forEach(sibling => {
      state.siblingOffsets.push({
        el: sibling,
        x: parseInt(getStyle(sibling, 'left')) || 0,
        y: parseInt(getStyle(sibling, 'top')) || 0
      })
    })

    if (el instanceof SVGElement) {
      const translate = el.getAttribute('transform')
      const [ x, y ] = translate
        ? extractSVGTranslate(translate)
        : [0,0]
      state.element.x  = x
      state.element.y  = y
    }
    else {
      state.element.x  = parseInt(getStyle(el, 'left')) || 0
      state.element.y  = parseInt(getStyle(el, 'top')) || 0
    }
  }

  const onMouseUp = e => {
    if (!state.mouse.down) return

    e.preventDefault()
    e.stopPropagation()

    state.mouse.down = false
    el.style.willChange = null

    const treatAsClick = !state.dragStarted || state.travelDistance < DRAG_THRESHOLD

    if (state.dragStarted && shouldTrack) {
      ChangeTracker.updateCurrent(el)
      ChangeTracker.pushToUndoStack(el)

      state.siblingOffsets.forEach(({el: sibling}) => {
        sibling.style.willChange = null
        ChangeTracker.updateCurrent(sibling)
        ChangeTracker.pushToUndoStack(sibling)
      })
    }
    else {
      state.siblingOffsets.forEach(({el: sibling}) => {
        sibling.style.willChange = null
      })
    }

    if (el instanceof SVGElement) {
      const translate = el.getAttribute('transform')
      const [ x, y ] = translate
        ? extractSVGTranslate(translate)
        : [0,0]
      state.element.x    = x
      state.element.y    = y
    }
    else {
      state.element.x    = parseInt(el.style.left) || 0
      state.element.y    = parseInt(el.style.top) || 0
    }

    if (clickEvent && treatAsClick) clickEvent(e, surface)
    state.dragStarted    = false
    state.travelDistance = 0
  }

  const onMouseMove = e => {
    if (!state.mouse.down) return

    const deltaX = e.clientX - state.mouse.x
    const deltaY = e.clientY - state.mouse.y
    state.travelDistance = Math.hypot(deltaX, deltaY)

    if (!state.dragStarted) {
      if (state.travelDistance < DRAG_THRESHOLD) return
      beginDrag()
    }

    e.preventDefault()
    e.stopPropagation()

    if (el instanceof SVGElement) {
      el.setAttribute('transform', `translate(
        ${state.element.x + deltaX},
        ${state.element.y + deltaY}
      )`)
    }
    else {
      el.style.left = state.element.x + deltaX + 'px'
      el.style.top  = state.element.y + deltaY + 'px'
    }

    state.siblingOffsets.forEach(({el: sibling, x, y}) => {
      sibling.style.left = x + deltaX + 'px'
      sibling.style.top  = y + deltaY + 'px'
    })
  }

  setup()

  return { el, teardown }
}

const filterCoMovers = (el, selected) =>
  selected.filter(sibling => {
    if (sibling === el) return false
    if (el.contains(sibling)) return false
    if (sibling.contains(el)) return false
    return !selected.some(other =>
      other !== sibling && other !== el && other.contains(sibling)
    )
  })

export function positionElement(els, direction) {
  els
    .map(el => ensurePositionable(el))
    .map(el => showHideSelected(el))
    .map(el => {
      // 변경 추적: 원본 스타일 캡처
      ChangeTracker.captureOriginal(el)
      return el
    })
    .map(el => ({
        el,
        ...extractCurrentValueAndSide(el, direction),
        amount:   direction.split('+').includes('shift') ? 10 : 1,
        negative: determineNegativity(el, direction),
    }))
    .map(payload =>
      Object.assign(payload, {
        position: payload.negative
          ? payload.current + payload.amount
          : payload.current - payload.amount
      }))
    .forEach(({el, style, position}) => {
      el instanceof SVGElement
        ? setTranslateOnSVG(el, direction, position)
        : el.style[style] = position + 'px'
      // 변경 추적: 현재 스타일 업데이트 및 undo 스택에 저장
      ChangeTracker.updateCurrent(el)
      ChangeTracker.pushToUndoStack(el)
    })
}

const extractCurrentValueAndSide = (el, direction) => {
  let style, current

  if (el instanceof SVGElement) {
    const translate = el.attr('transform')

    const [ x, y ] = translate
      ? extractSVGTranslate(translate)
      : [0,0]

    style   = 'transform'
    current = direction.includes('down') || direction.includes('up')
      ? y
      : x
  }
  else {
    const side = getSide(direction).toLowerCase()
    style = (side === 'top' || side === 'bottom') ? 'top' : 'left'
    current = getStyle(el, style)

    current === 'auto'
      ? current = 0
      : current = parseInt(current, 10)
  }

  return { style, current }
}

const extractSVGTranslate = translate =>
  translate.substring(
    translate.indexOf('(') + 1,
    translate.indexOf(')')
  ).split(',')
  .map(val => parseFloat(val))

const setTranslateOnSVG = (el, direction, position) => {
  const transform = el.attr('transform')
  const [ x, y ] = transform
    ? extractSVGTranslate(transform)
    : [0,0]

  const pos = direction.includes('down') || direction.includes('up')
    ? `${x},${position}`
    : `${position},${y}`

  el.attr('transform', `translate(${pos})`)
}

const determineNegativity = (el, direction) =>
  direction.includes('right') || direction.includes('down')

// static 요소만 relative로 승격 — 이미 fixed/absolute/sticky인 요소는 그대로 둔다
const ensurePositionable = el => {
  if (el instanceof HTMLElement && getComputedStyle(el).position === 'static')
    el.style.position = 'relative'
  return el
}
