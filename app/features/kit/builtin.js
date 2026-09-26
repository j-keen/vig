// 기본 제공 킷(내장 아이템) - "내 킷" 탭의 "기본 킷" 섹션에 표시된다.
// 어느 사이트에서 봐도 같은 모양으로 보이도록 전부 인라인 스타일로만 구성했고,
// Tailwind 등 외부 프레임워크에 의존하지 않는다.
// 폰트는 Pretendard 우선, 없으면 시스템 폰트로 폴백한다.
// css 는 schema.js 의 STYLE_PROPS 에 있는 속성만 스타일 전용 적용(preview/apply 'style')에
// 실제로 쓰이므로, 그 목록에 맞춰 채운다. classes 는 store.js 스키마상 문자열이다.

const FONT_STACK = "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Malgun Gothic', sans-serif"

// -------------------------------------------------------------------------
// 버튼 - 채움(primary) / 테두리만(ghost). 같은 group('button')으로 묶여
// 카드에서 ◀ 1/3 ▶ 변형 전환으로 오갈 수 있다.
// -------------------------------------------------------------------------

const BTN_PRIMARY_CSS = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 20px',
  fontFamily: FONT_STACK,
  fontSize: '14px',
  fontWeight: '600',
  lineHeight: '1.2',
  color: '#ffffff',
  backgroundColor: '#4f46e5',
  border: 'none',
  borderRadius: '10px',
  boxShadow: '0 2px 6px rgba(79, 70, 229, 0.35)',
}

const BTN_GHOST_CSS = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '9px 19px',
  fontFamily: FONT_STACK,
  fontSize: '14px',
  fontWeight: '600',
  lineHeight: '1.2',
  color: '#4f46e5',
  backgroundColor: 'transparent',
  border: '1.5px solid #4f46e5',
  borderRadius: '10px',
  boxShadow: 'none',
}

function styleAttr(css, extra) {
  const all = extra ? { ...css, ...extra } : css
  return Object.entries(all)
    .map(([prop, value]) => `${prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}: ${value};`)
    .join(' ')
}

const BTN_PRIMARY_HTML = `<button style="${styleAttr(BTN_PRIMARY_CSS, { cursor: 'pointer' })}">버튼</button>`
const BTN_GHOST_HTML = `<button style="${styleAttr(BTN_GHOST_CSS, { cursor: 'pointer' })}">버튼</button>`

// -------------------------------------------------------------------------
// 카드 - 기본형 / 이미지 포함형. 같은 group('card')으로 묶인다.
// -------------------------------------------------------------------------

const CARD_BASIC_CSS = {
  display: 'block',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
  padding: '16px',
  fontFamily: FONT_STACK,
}

const CARD_BASIC_HTML = `<div style="${styleAttr(CARD_BASIC_CSS, { width: '220px', boxSizing: 'border-box' })}">
  <div style="font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 6px;">카드 제목</div>
  <div style="font-size: 13px; color: #6b7280; line-height: 1.5;">카드 설명 텍스트가 여기에 들어갑니다.</div>
</div>`

const CARD_IMAGE_CSS = {
  display: 'block',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
  fontFamily: FONT_STACK,
}

const CARD_IMAGE_HTML = `<div style="${styleAttr(CARD_IMAGE_CSS, { width: '220px', boxSizing: 'border-box', overflow: 'hidden' })}">
  <div style="width: 100%; height: 120px; background: linear-gradient(135deg, #e0e7ff, #c7d2fe);"></div>
  <div style="padding: 14px 16px;">
    <div style="font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 6px;">카드 제목</div>
    <div style="font-size: 13px; color: #6b7280; line-height: 1.5;">이미지가 있는 카드입니다.</div>
  </div>
</div>`

// -------------------------------------------------------------------------
// 히어로 섹션 (단독)
// -------------------------------------------------------------------------

const HERO_SIMPLE_CSS = {
  backgroundColor: '#f9fafb',
  borderRadius: '12px',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
  padding: '48px 32px',
  fontFamily: FONT_STACK,
}

const HERO_SIMPLE_HTML = `<div style="${styleAttr(HERO_SIMPLE_CSS, { width: '100%', boxSizing: 'border-box', textAlign: 'center' })}">
  <div style="font-size: 28px; font-weight: 800; color: #111827; margin-bottom: 12px;">눈에 띄는 헤드라인</div>
  <div style="font-size: 15px; color: #6b7280; margin-bottom: 20px;">설명 문구가 여기에 들어갑니다.</div>
  <button style="${styleAttr(BTN_PRIMARY_CSS, { cursor: 'pointer' })}">시작하기</button>
</div>`

// -------------------------------------------------------------------------
// 뱃지 (단독)
// -------------------------------------------------------------------------

const BADGE_CSS = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 10px',
  fontFamily: FONT_STACK,
  fontSize: '12px',
  fontWeight: '600',
  color: '#4f46e5',
  backgroundColor: '#eef2ff',
  borderRadius: '999px',
}

const BADGE_HTML = `<span style="${styleAttr(BADGE_CSS)}">New</span>`

function item({ id, name, group, kind, tags, html, css, size, createdAt }) {
  return {
    id,
    name,
    group: group || null,
    kind,
    tags: tags || [],
    html,
    css,
    classes: '',
    size,
    source: { url: '', selector: '', file: null },
    builtin: true,
    createdAt,
  }
}

export const BUILTIN_KIT = [
  item({
    id: 'builtin:btn-primary',
    name: '기본 버튼',
    group: 'button',
    kind: 'auto',
    tags: ['버튼', 'button', 'primary'],
    html: BTN_PRIMARY_HTML,
    css: BTN_PRIMARY_CSS,
    size: { w: 96, h: 40 },
    createdAt: 0,
  }),
  item({
    id: 'builtin:btn-ghost',
    name: '테두리 버튼',
    group: 'button',
    kind: 'auto',
    tags: ['버튼', 'button', 'ghost', 'outline'],
    html: BTN_GHOST_HTML,
    css: BTN_GHOST_CSS,
    size: { w: 96, h: 40 },
    createdAt: 1,
  }),
  item({
    id: 'builtin:card-basic',
    name: '기본 카드',
    group: 'card',
    kind: 'block',
    tags: ['카드', 'card'],
    html: CARD_BASIC_HTML,
    css: CARD_BASIC_CSS,
    size: { w: 220, h: 96 },
    createdAt: 2,
  }),
  item({
    id: 'builtin:card-image',
    name: '이미지 카드',
    group: 'card',
    kind: 'block',
    tags: ['카드', 'card', '이미지', 'image'],
    html: CARD_IMAGE_HTML,
    css: CARD_IMAGE_CSS,
    size: { w: 220, h: 216 },
    createdAt: 3,
  }),
  item({
    id: 'builtin:hero-simple',
    name: '심플 히어로',
    group: null,
    kind: 'block',
    tags: ['히어로', 'hero', '섹션', 'section'],
    html: HERO_SIMPLE_HTML,
    css: HERO_SIMPLE_CSS,
    size: { w: 400, h: 220 },
    createdAt: 4,
  }),
  item({
    id: 'builtin:badge',
    name: '뱃지',
    group: null,
    kind: 'style',
    tags: ['뱃지', 'badge', '태그', 'tag'],
    html: BADGE_HTML,
    css: BADGE_CSS,
    size: { w: 48, h: 22 },
    createdAt: 5,
  }),
]

export default BUILTIN_KIT
