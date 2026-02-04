import $ from 'blingblingjs'
import hotkeys from 'hotkeys-js'
import { metaKey, getStyle, getSide, showHideSelected } from '../utilities/'
import { ChangeTracker } from './change-tracker'

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
    state.elements.forEach(el =>
      el.teardown())

    state.elements = els.map(el =>
      draggable({el}))
  }

  const disconnect = () => {
    state.elements.forEach(el => el.teardown())
    hotkeys.unbind(key_events)
    hotkeys.unbind('up,down,left,right')
  }

  return {
    onNodesSelected,
    disconnect,
  }
}

export function draggable({el, surface = el, cursor = 'move', clickEvent, getSiblings = null}) {
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
    siblings: [],  // 다중 선택된 형제 요소들
    siblingOffsets: []  // 형제 요소들의 초기 위치
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
    // 요소 자체 또는 자식 요소 클릭도 허용 (Shift+드래그 버그 수정)
    if(!el.contains(e.target) && !surface.contains(e.target)) return
    e.preventDefault()

    // 변경 추적: 원본 스타일 캡처
    ChangeTracker.captureOriginal(el)

    // 다중 선택된 형제 요소들 가져오기
    state.siblings = getSiblings ? getSiblings().filter(sibling => sibling !== el) : []
    state.siblingOffsets = []

    // Shift+드래그: absolute로 완전 독립 이동 (연관 요소 영향 없음)
    if (e.shiftKey) {
      const rect = el.getBoundingClientRect()
      el.style.position = 'absolute'
      el.style.left = rect.left + window.scrollX + 'px'
      el.style.top = rect.top + window.scrollY + 'px'

      // 형제 요소들도 absolute로 변환
      state.siblings.forEach(sibling => {
        ChangeTracker.captureOriginal(sibling)
        const sibRect = sibling.getBoundingClientRect()
        sibling.style.position = 'absolute'
        sibling.style.left = sibRect.left + window.scrollX + 'px'
        sibling.style.top = sibRect.top + window.scrollY + 'px'
        sibling.style.willChange = 'top,left'
      })
    }
    else if(getComputedStyle(el).position == 'static') {
      el.style.position = 'relative'
    }
    el.style.willChange = 'top,left'

    // 형제 요소들의 초기 위치 캡처
    state.siblings.forEach(sibling => {
      ChangeTracker.captureOriginal(sibling)
      if (getComputedStyle(sibling).position === 'static') {
        sibling.style.position = 'relative'
      }
      sibling.style.willChange = 'top,left'
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
      state.element.x  = parseInt(getStyle(el, 'left'))
      state.element.y  = parseInt(getStyle(el, 'top'))
    }

    state.mouse.x        = e.clientX
    state.mouse.y        = e.clientY
    state.mouse.down     = true
    state.travelDistance = 0
  }

  const onMouseUp = e => {
    if (!state.mouse.down) return

    e.preventDefault()
    e.stopPropagation()

    state.mouse.down = false
    el.style.willChange = null

    // 변경 추적: 현재 스타일 업데이트 및 undo 스택에 저장
    ChangeTracker.updateCurrent(el)
    ChangeTracker.pushToUndoStack(el)

    // 형제 요소들도 변경 추적
    state.siblingOffsets.forEach(({el: sibling}) => {
      sibling.style.willChange = null
      ChangeTracker.updateCurrent(sibling)
      ChangeTracker.pushToUndoStack(sibling)
    })

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

    const treatAsClick = !state.travelDistance || state.travelDistance < 5
    if (clickEvent && treatAsClick) clickEvent(e, surface);
    state.travelDistance = 0 // reset after
  }

  const onMouseMove = e => {
    if (!state.mouse.down) return

    e.preventDefault()
    e.stopPropagation()

    const deltaX = e.clientX - state.mouse.x
    const deltaY = e.clientY - state.mouse.y

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

    // 형제 요소들도 같은 거리만큼 이동
    state.siblingOffsets.forEach(({el: sibling, x, y}) => {
      sibling.style.left = x + deltaX + 'px'
      sibling.style.top  = y + deltaY + 'px'
    })

    state.travelDistance += 1
  }

  setup()
  el.teardown = teardown

  return el
}

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

const ensurePositionable = el => {
  if (el instanceof HTMLElement)
    el.style.position = 'relative'
  return el
}
