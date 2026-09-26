// 내 킷 (Kit) - 다른 사이트에서 캡처한 UI 조각을 저장했다가
// 선택한 요소에 미리보기/적용하고, 변경 이력에 기록한다.
//
// 사용법:
//   import { Kit } from '../features/kit'   (또는 '../features' 배럴)
//   await Kit.load()
//   const item = Kit.capture(el, { name: '주요 버튼' })
//   Kit.add(item)
//   const mode = Kit.autoMode(target, item)
//   const { revert } = Kit.preview(target, item, mode)
//   const { element } = Kit.apply(target, item, mode)

export { STYLE_PROPS, KIT_KINDS, isValidKitItem } from './schema'

import {
  load, list, get, add, update, remove, variantsOf,
  exportJSON, importJSON, onChange,
} from './store'
import { capture } from './capture'
import { autoMode, preview, apply, buildReplacement } from './apply'

export const Kit = {
  // store.js
  load, list, get, add, update, remove, variantsOf,
  exportJSON, importJSON, onChange,
  // capture.js
  capture,
  // apply.js
  autoMode, preview, apply, buildReplacement,
}

if (typeof window !== 'undefined') {
  window.DesignPokeKit = Kit
}

export default Kit
