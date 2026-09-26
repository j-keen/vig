// 내 킷 (Kit) 아이템 스키마
//
// item = {
//   id: string, name: string, group: string|null,   // 같은 group 이면 배리언트 (◀ ▶)
//   kind: 'style' | 'block' | 'auto',                // 선호 적용 모드; 'auto' = 크기로 판단
//   tags: string[], html: string,                     // 정제된 outerHTML
//   css: { [prop]: value },                            // 스타일만 적용할 때 쓰는 루트 computed 스타일
//   classes: string, size: { w, h }, source: { url, selector, file: null },
//   builtin?: true, createdAt: number
// }

// 스타일 전용 적용(preview/apply 'style' 모드)에 쓰이는 속성 목록
export const STYLE_PROPS = [
  'backgroundColor', 'backgroundImage', 'color', 'border', 'borderRadius',
  'boxShadow', 'padding', 'fontFamily', 'fontSize', 'fontWeight',
  'lineHeight', 'letterSpacing', 'textTransform', 'textDecorationLine',
  'opacity', 'outline', 'transition', 'gap', 'display', 'alignItems',
  'justifyContent', 'flexDirection',
]

export const KIT_KINDS = ['style', 'block', 'auto']

// import/dedupe 등에 쓰는 최소 스키마 검증
export function isValidKitItem(item) {
  return !!item
    && typeof item === 'object'
    && typeof item.id === 'string' && item.id.length > 0
    && typeof item.name === 'string'
    && typeof item.html === 'string'
    && !!item.css && typeof item.css === 'object' && !Array.isArray(item.css)
    && !!item.size && typeof item.size === 'object'
    && typeof item.size.w === 'number' && typeof item.size.h === 'number'
    && !!item.source && typeof item.source === 'object'
}

export default { STYLE_PROPS, KIT_KINDS, isValidKitItem }
