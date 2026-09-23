// 속성 힌트 오버레이
// 속성 패널/텍스트 툴바에서 어떤 값을 만지는지 페이지 위에 시각적으로 보여준다.
//   너비/높이 → 치수선 + 라벨, 여백 → 주황 띠, 안쪽 여백 → 초록 띠,
//   둥근 모서리 → 모서리 표시, 글꼴/색상 → 텍스트 영역 강조, 그 외 → 외곽선 + 라벨
//
// 사용법:
//   showPropHint(element, 'width')          // 표시 (같은 요소/속성이면 위치만 갱신)
//   showPropHint(element, 'marginTop', { value: '16px' })
//   hidePropHint()
//
// 오버레이 자체는 <visbug-prop-hint> 하나이며 pointer-events: none 이라 클릭을 가로채지 않는다.

const PROP_LABELS = {
  width: '너비', height: '높이',
  left: 'X 위치', top: 'Y 위치', right: '오른쪽', bottom: '아래',
  marginTop: '바깥 여백 위', marginRight: '바깥 여백 오른쪽', marginBottom: '바깥 여백 아래', marginLeft: '바깥 여백 왼쪽',
  paddingTop: '안쪽 여백 위', paddingRight: '안쪽 여백 오른쪽', paddingBottom: '안쪽 여백 아래', paddingLeft: '안쪽 여백 왼쪽',
  borderRadius: '둥근 모서리', opacity: '투명도',
  fontSize: '글꼴 크기', fontWeight: '글자 굵기', fontFamily: '글꼴', fontStyle: '기울임',
  lineHeight: '줄 간격', letterSpacing: '자간', textAlign: '정렬', textDecorationLine: '밑줄',
  color: '글자색', backgroundColor: '배경색', borderColor: '테두리색',
  transform: '변형',
}

const COLORS = {
  dimension: 'hsl(330, 100%, 60%)',   // 치수선 (핑크)
  margin:    'hsla(30, 100%, 55%, 0.35)',
  padding:   'hsla(140, 70%, 45%, 0.35)',
  text:      'hsla(210, 100%, 55%, 0.25)',
  outline:   'hsl(210, 100%, 55%)',
}

const HOST_TAG = 'visbug-prop-hint'
let host = null
let current = { el: null, prop: null }
let rafId = 0

const ensureHost = () => {
  if (host && host.isConnected) return host
  host = document.createElement(HOST_TAG)
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = `
    position: absolute; left: 0; top: 0; width: 0; height: 0;
    pointer-events: none; z-index: 2147483646;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif;
  `
  document.body.appendChild(host)
  return host
}

const px = n => `${Math.round(n)}px`

const box = (x, y, w, h, style) => {
  const d = document.createElement('div')
  d.style.cssText = `position:absolute; left:${px(x)}; top:${px(y)}; width:${px(Math.max(0, w))}; height:${px(Math.max(0, h))}; box-sizing:border-box; ${style}`
  return d
}

const label = (x, y, text, bg = COLORS.dimension) => {
  const d = document.createElement('div')
  d.textContent = text
  d.style.cssText = `
    position:absolute; left:${px(x)}; top:${px(y)}; transform: translate(-50%, -100%);
    background:${bg}; color:#fff; font-size:11px; line-height:1; padding:4px 6px; border-radius:4px;
    white-space:nowrap; box-shadow:0 1px 4px rgba(0,0,0,.35); font-weight:600;
  `
  return d
}

// 수평 치수선: y 높이에 x1..x2, 양끝 틱
const hLine = (x1, x2, y, text) => {
  const frag = document.createDocumentFragment()
  frag.appendChild(box(x1, y - 1, x2 - x1, 2, `background:${COLORS.dimension};`))
  frag.appendChild(box(x1, y - 6, 2, 12, `background:${COLORS.dimension};`))
  frag.appendChild(box(x2 - 2, y - 6, 2, 12, `background:${COLORS.dimension};`))
  frag.appendChild(label((x1 + x2) / 2, y - 8, text))
  return frag
}

// 수직 치수선: x 위치에 y1..y2
const vLine = (x, y1, y2, text) => {
  const frag = document.createDocumentFragment()
  frag.appendChild(box(x - 1, y1, 2, y2 - y1, `background:${COLORS.dimension};`))
  frag.appendChild(box(x - 6, y1, 12, 2, `background:${COLORS.dimension};`))
  frag.appendChild(box(x - 6, y2 - 2, 12, 2, `background:${COLORS.dimension};`))
  const l = label(x, (y1 + y2) / 2, text)
  l.style.transform = 'translate(-100%, -50%) translateX(-8px)'
  frag.appendChild(l)
  return frag
}

const render = () => {
  const { el, prop, value } = current
  if (!el || !el.isConnected) return hidePropHint()

  const h = ensureHost()
  h.innerHTML = ''

  const r = el.getBoundingClientRect()
  const sx = window.scrollX, sy = window.scrollY
  const x = r.left + sx, y = r.top + sy, w = r.width, hh = r.height
  const cs = getComputedStyle(el)
  const val = value != null ? value : (cs[prop] || '')
  const name = PROP_LABELS[prop] || prop
  const text = val ? `${name} ${val}` : name

  const side = prop.replace(/^(margin|padding)/, '').toLowerCase()   // top/right/bottom/left
  const m = { t: parseFloat(cs.marginTop) || 0, r: parseFloat(cs.marginRight) || 0, b: parseFloat(cs.marginBottom) || 0, l: parseFloat(cs.marginLeft) || 0 }
  const p = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 }

  if (prop === 'width') {
    h.appendChild(hLine(x, x + w, y - 10, text))
    h.appendChild(box(x, y, 2, hh, `background:${COLORS.dimension}; opacity:.6;`))
    h.appendChild(box(x + w - 2, y, 2, hh, `background:${COLORS.dimension}; opacity:.6;`))
  }
  else if (prop === 'height') {
    h.appendChild(vLine(x - 10, y, y + hh, text))
    h.appendChild(box(x, y, w, 2, `background:${COLORS.dimension}; opacity:.6;`))
    h.appendChild(box(x, y + hh - 2, w, 2, `background:${COLORS.dimension}; opacity:.6;`))
  }
  else if (prop.startsWith('margin')) {
    const band = { t: 'top', r: 'right', b: 'bottom', l: 'left' }
    const bands = {
      top:    [x - m.l, y - m.t, w + m.l + m.r, m.t],
      bottom: [x - m.l, y + hh, w + m.l + m.r, m.b],
      left:   [x - m.l, y, m.l, hh],
      right:  [x + w, y, m.r, hh],
    }
    const [bx, by, bw, bh] = bands[side] || bands.top
    h.appendChild(box(x, y, w, hh, `outline:1px dashed ${COLORS.outline};`))
    h.appendChild(box(bx, by, Math.max(bw, 2), Math.max(bh, 2), `background:${COLORS.margin}; outline:1px solid hsl(30,100%,50%);`))
    h.appendChild(label(bx + Math.max(bw, 2) / 2, by, text, 'hsl(30, 100%, 45%)'))
    void band
  }
  else if (prop.startsWith('padding')) {
    const bands = {
      top:    [x, y, w, p.t],
      bottom: [x, y + hh - p.b, w, p.b],
      left:   [x, y, p.l, hh],
      right:  [x + w - p.r, y, p.r, hh],
    }
    const [bx, by, bw, bh] = bands[side] || bands.top
    h.appendChild(box(x, y, w, hh, `outline:1px dashed ${COLORS.outline};`))
    h.appendChild(box(bx, by, Math.max(bw, 2), Math.max(bh, 2), `background:${COLORS.padding}; outline:1px solid hsl(140,70%,35%);`))
    h.appendChild(label(bx + Math.max(bw, 2) / 2, by, text, 'hsl(140, 70%, 35%)'))
  }
  else if (prop === 'borderRadius') {
    const rad = cs.borderRadius
    h.appendChild(box(x, y, w, hh, `outline:2px solid ${COLORS.outline}; border-radius:${rad}; outline-offset:-1px;`))
    const s = Math.min(24, w / 3, hh / 3)
    ;[[x, y], [x + w - s, y], [x, y + hh - s], [x + w - s, y + hh - s]].forEach(([cx, cy]) =>
      h.appendChild(box(cx, cy, s, s, `background:${COLORS.text};`)))
    h.appendChild(label(x + w / 2, y - 6, text, COLORS.outline))
  }
  else if (prop === 'left' || prop === 'top') {
    h.appendChild(box(x, y, w, hh, `outline:2px solid ${COLORS.dimension};`))
    const parent = el.offsetParent || document.body
    const pr = parent.getBoundingClientRect()
    if (prop === 'left') h.appendChild(hLine(pr.left + sx, x, y + hh / 2, text))
    else h.appendChild(vLine(x + w / 2, pr.top + sy, y, text))
  }
  else if (/^(font|line|letter|text|color)/.test(prop)) {
    h.appendChild(box(x, y, w, hh, `background:${COLORS.text}; outline:2px solid ${COLORS.outline};`))
    h.appendChild(label(x + w / 2, y - 6, text, COLORS.outline))
  }
  else if (prop === 'backgroundColor') {
    h.appendChild(box(x, y, w, hh, `outline:2px solid ${COLORS.outline}; background: repeating-linear-gradient(45deg, hsla(210,100%,55%,.18) 0 6px, transparent 6px 12px);`))
    h.appendChild(label(x + w / 2, y - 6, text, COLORS.outline))
  }
  else if (prop === 'borderColor') {
    h.appendChild(box(x - 3, y - 3, w + 6, hh + 6, `outline:3px solid ${COLORS.outline}; opacity:.8;`))
    h.appendChild(label(x + w / 2, y - 8, text, COLORS.outline))
  }
  else {
    h.appendChild(box(x, y, w, hh, `outline:2px solid ${COLORS.outline};`))
    h.appendChild(label(x + w / 2, y - 6, text, COLORS.outline))
  }
}

const schedule = () => {
  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(render)
}

export function showPropHint(element, prop, { value } = {}) {
  if (!element || !prop) return
  current = { el: element, prop, value }
  schedule()
  window.addEventListener('scroll', schedule, true)
  window.addEventListener('resize', schedule)
}

export function hidePropHint() {
  cancelAnimationFrame(rafId)
  window.removeEventListener('scroll', schedule, true)
  window.removeEventListener('resize', schedule)
  current = { el: null, prop: null }
  if (host) host.innerHTML = ''
}

export function getPropLabel(prop) {
  return PROP_LABELS[prop] || prop
}

export function teardownPropHint() {
  hidePropHint()
  if (host) host.remove()
  host = null
}

if (typeof window !== 'undefined') {
  window.DesignPokePropHint = { showPropHint, hidePropHint, getPropLabel }
}

export const PropHint = { showPropHint, hidePropHint, getPropLabel, teardownPropHint }
export default PropHint
