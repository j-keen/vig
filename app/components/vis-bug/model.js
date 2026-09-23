import * as Icons from './vis-bug.icons'
import { metaKey, altKey } from '../../utilities/'

export const VisBugModel = {
  l: {
    tool:        'position',
    icon:        Icons.position,
    label:       '<span>선택 / 이동</span>',
    description: '클릭으로 선택, 드래그로 이동, 점을 끌어 크기 조절',
    instruction: `<div table>
                    <div>
                      <b>이동:</b>
                      <span>드래그 · 방향키(1px) · Shift+방향키(10px)</span>
                    </div>
                    <div>
                      <b>크기 조절:</b>
                      <span>모서리 점 = 비율 유지 · Shift = 자유 · ${altKey} = 중심 기준</span>
                    </div>
                    <div>
                      <b>자식 포함 배율:</b>
                      <span>Shift + ${altKey} + 드래그</span>
                    </div>
                    <div>
                      <b>텍스트 편집:</b>
                      <span>더블클릭</span>
                    </div>
                    <div>
                      <b>여러 개 선택:</b>
                      <span>Shift + 클릭</span>
                    </div>
                    <div>
                      <b>핸들 숨기기:</b>
                      <span>Shift + H</span>
                    </div>
                  </div>`,
  },
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
  e: {
    tool:        'text',
    icon:        Icons.text,
    label:       '<span>텍스트 편집</span>',
    description: '페이지의 아무 글자나 <b>더블클릭</b>해서 바로 고칩니다',
    instruction: `<div table>
                    <div>
                      <b>편집 시작:</b>
                      <span>더블클릭</span>
                    </div>
                    <div>
                      <b>종료:</b>
                      <span>blur / Esc</span>
                    </div>
                  </div>`,
  },
  f: {
    tool:        'font',
    icon:        Icons.font,
    label:       '<span>글꼴</span>',
    description: '크기·굵기·정렬·자간을 조정',
    instruction: `<div table>
                    <div>
                      <b>크기:</b>
                      <span>▲ ▼</span>
                    </div>
                    <div>
                      <b>정렬:</b>
                      <span>◀ ▶</span>
                    </div>
                    <div>
                      <b>줄간격:</b>
                      <span>Shift + ▲ ▼</span>
                    </div>
                    <div>
                      <b>자간:</b>
                      <span>Shift + ◀ ▶</span>
                    </div>
                    <div>
                      <b>굵기:</b>
                      <span>${metaKey} + ▲ ▼</span>
                    </div>
                  </div>`,
  },
  h: {
    tool:        'hueshift',
    icon:        Icons.hueshift,
    label:       '<span>색상</span>',
    description: '글자·배경·테두리 색을 조정',
    instruction: `<div table>
                    <div>
                      <b>채도:</b>
                      <span>◀ ▶</span>
                    </div>
                    <div>
                      <b>밝기:</b>
                      <span>▲ ▼</span>
                    </div>
                    <div>
                      <b>색상(Hue):</b>
                      <span>${metaKey} + ▲ ▼</span>
                    </div>
                    <div>
                      <b>투명도:</b>
                      <span>${metaKey} + ◀ ▶</span>
                    </div>
                    <div>
                      <b>대상 전환:</b>
                      <span>[ ]</span>
                    </div>
                  </div>`,
  },
  c: {
    tool:        'aicopy',
    icon:        Icons.aicopy,
    label:       '<span>AI로 복사</span>',
    description: '변경사항을 AI 형식으로 복사',
    hasGif:      false,
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
