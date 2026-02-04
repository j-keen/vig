import * as Icons from './vis-bug.icons'
import { metaKey, altKey } from '../../utilities/'

export const VisBugModel = {
  g: {
    tool:        'guides',
    icon:        Icons.guides,
    label:       '<span>안내선</span>',
    description: '정렬 확인 및 거리 측정',
    instruction: `<div table>
                    <div>
                      <b>요소 안내선:</b>
                      <span>마우스 올리기</span>
                    </div>
                    <div>
                      <b>거리 측정:</b>
                      <span>클릭+마우스 올리기</span>
                    </div>
                    <div>
                      <b>여러 개 측정:</b>
                      <span>shift+클릭</span>
                    </div>
                    <div>
                      <b>해제:</b>
                      <span>esc</span>
                    </div>
                  </div>`,
  },
  l: {
    tool:        'position',
    icon:        Icons.position,
    label:       '위치 조정',
    description: '방향키로 미세 조정',
    instruction: `<div table>
                    <div>
                      <b>미세 조정:</b>
                      <span>◀ ▶ ▲ ▼</span>
                    </div>
                    <div>
                      <b>큰 이동:</b>
                      <span>Shift + 방향키</span>
                    </div>
                    <div>
                      <b>원래대로:</b>
                      <span>${altKey} + delete</span>
                    </div>
                    <div>
                      <b>핸들 숨기기:</b>
                      <span>H</span>
                    </div>
                  </div>`,
  },
  m: {
    tool:        'margin',
    icon:        Icons.margin,
    label:       '<span>바깥 여백</span>',
    description: '요소 바깥 여백 조정',
    instruction: `<div table>
                    <div>
                      <b>+ 여백:</b>
                      <span>◀ ▶ ▲ ▼</span>
                    </div>
                    <div>
                      <b>- 여백:</b>
                      <span>${altKey} + ◀ ▶ ▲ ▼</span>
                    </div>
                    <div>
                      <b>전체 방향:</b>
                      <span>${metaKey} +  ▲ ▼</span>
                    </div>
                  </div>`,
  },
  p: {
    tool:        'padding',
    icon:        Icons.padding,
    label:       '<span>안쪽 여백</span>',
    description: `요소 안쪽 여백 조정`,
    instruction: `<div table>
                    <div>
                      <b>+ 여백:</b>
                      <span>◀ ▶ ▲ ▼</span>
                    </div>
                    <div>
                      <b>- 여백:</b>
                      <span>${altKey} + ◀ ▶ ▲ ▼</span>
                    </div>
                    <div>
                      <b>전체 방향:</b>
                      <span>${metaKey} +  ▲ ▼</span>
                    </div>
                  </div>`
  },
  a: {
    tool:        'align',
    icon:        Icons.align,
    label:       '<span>정렬</span>',
    description: `Flexbox 레이아웃 조정`,
    instruction: `<div table>
                    <div>
                      <b>정렬:</b>
                      <span>◀ ▶ ▲ ▼</span>
                    </div>
                    <div>
                      <b>배분:</b>
                      <span>Shift + ◀ ▶</span>
                    </div>
                    <div>
                      <b>방향 전환:</b>
                      <span>${metaKey} + ▼ / ▶</span>
                    </div>
                  </div>`,
  },
  v: {
    tool:        'move',
    icon:        Icons.move,
    label:       '<span>DOM 이동</span>',
    description: '요소를 다른 위치로 이동',
    instruction: `<div table>
                    <div>
                      <b>좌우 이동:</b>
                      <span>◀ ▶</span>
                    </div>
                    <div>
                      <b>밖으로:</b>
                      <span>▲</span>
                    </div>
                    <div>
                      <b>안으로:</b>
                      <span>▼</span>
                    </div>
                  </div>`,
  },
  c: {
    tool:        'aicopy',
    icon:        Icons.aicopy,
    label:       '<span>AI로 복사</span>',
    description: '변경사항을 AI 형식으로 복사',
    instruction: `<div table>
                    <div>
                      <b>복사:</b>
                      <span>클릭</span>
                    </div>
                    <div>
                      <b>초기화:</b>
                      <span>${altKey} + 클릭</span>
                    </div>
                  </div>`,
  },
}
