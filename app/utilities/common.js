import $ from 'blingblingjs'
import { nodeKey } from './strings'

// 좌표가 뷰포트 밖이면 elementFromPoint 가 null 을 돌려주므로 null 안전하게 처리
export const deepElementFromPoint = (x, y) => {
  const el = document.elementFromPoint(x, y)
  if (!el) return null

  const crawlShadows = node => {
    if (node.shadowRoot) {
      const potential = node.shadowRoot.elementFromPoint(x, y)

      // Chrome: 그 지점의 실제 요소가 슬롯에 꽂힌 라이트 DOM 자식(섀도 트리 밖)이면 null 을 돌려준다.
      // 이때는 호스트 자체를 결과로 쓴다. (Orca UI 같은 웹 컴포넌트 기반 페이지에서 발생)
      if (!potential)                 return node
      if (potential == node)          return node
      else if (potential.shadowRoot)  return crawlShadows(potential)
      else                            return potential
    }
    else return node
  }

  const nested_shadow = crawlShadows(el)

  return nested_shadow || el
}

export const getSide = direction => {
  let start = direction.split('+').pop().replace(/^\w/, c => c.toUpperCase())
  if (start == 'Up') start = 'Top'
  if (start == 'Down') start = 'Bottom'
  return start
}

export const getNodeIndex = el => {
  return [...el.parentElement.parentElement.children]
    .indexOf(el.parentElement)
}

export function showEdge(el) {
  return el.animate([
    { outline: '1px solid transparent' },
    { outline: '1px solid hsla(330, 100%, 71%, 80%)' },
    { outline: '1px solid transparent' },
  ], 600)
}

let timeoutMap = {}
export const showHideSelected = (el, duration = 750) => {
  el.setAttribute('data-selected-hide', true)
  showHideNodeLabel(el, true)

  if (timeoutMap[nodeKey(el)])
    clearTimeout(timeoutMap[nodeKey(el)])

  timeoutMap[nodeKey(el)] = setTimeout(_ => {
    el.removeAttribute('data-selected-hide')
    showHideNodeLabel(el, false)
  }, duration)

  return el
}

export const showHideNodeLabel = (el, show = false) => {
  if (!el.hasAttribute('data-label-id'))
    return

  const label_id = el.getAttribute('data-label-id')

  const nodes = $(`
    visbug-label[data-label-id="${label_id}"],
    visbug-handles[data-label-id="${label_id}"]
  `)

  nodes.length && show
    ? nodes.forEach(el =>
      el.style.display = 'none')
    : nodes.forEach(el =>
      el.style.display = null)
}

export const htmlStringToDom = (htmlString = "") =>
  (new DOMParser().parseFromString(htmlString, 'text/html'))
    .body.firstChild

export const isOffBounds = node => {
  if (!node) return true
  // Shadow DOM 내부 요소 체크: Shadow Root의 host가 VisBug 요소인지 확인
  if (node.getRootNode) {
    const root = node.getRootNode()
    if (root !== document && root.host) {
      const hostTag = root.host.nodeName.toLowerCase()
      if (hostTag === 'vis-bug' || hostTag.startsWith('visbug-')) return true
    }
  }

  return node.closest && (
       node.closest('vis-bug')
    || node.closest('hotkey-map')
    || node.closest('visbug-metatip')
    || node.closest('visbug-ally')
    || node.closest('visbug-label')
    || node.closest('visbug-handles')
    || node.closest('visbug-corners')
    || node.closest('visbug-grip')
    || node.closest('visbug-gridlines')
    || node.closest('visbug-history')
    || node.closest('visbug-depth-highlight')
    || node.closest('visbug-props')
    || node.closest('visbug-text-toolbar')
    || node.closest('visbug-note')
    || node.closest('visbug-palette')
    || node.closest('visbug-prop-hint')
  )
}

export const isSelectorValid = (qs => (
  selector => {
    try { qs(selector) } catch (e) { return false }
    return true
  }
))(s => document.createDocumentFragment().querySelector(s))

export const swapElements = (src, target) => {
  var temp = document.createElement("div")

  src.parentNode.insertBefore(temp, src)
  target.parentNode.insertBefore(src, target)
  temp.parentNode.insertBefore(target, temp)

  temp.parentNode.removeChild(temp)
}

export const onRemove = (element, callback) => {
  const parent = element.parentNode
    ? element.parentNode
    : document.body
    
  if (!parent) throw new Error("The node must already be attached")

  const obs = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const el of mutation.removedNodes) {
        if (el === element) {
          obs.disconnect()
          callback()
        }
      }
    }
  })

  obs.observe(parent, {
    childList: true,
  })
}