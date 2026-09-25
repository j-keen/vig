// 속성 패널(Figma 스타일) 스타일
// 테마(dark/light)는 Settings.registerPanel 이 호스트에 심어주는 data-theme 속성이
// 유일한 기준이다 (prefers-color-scheme 미디어쿼리는 사용하지 않는다).
// opacity 는 Settings 가 호스트(:host)에 직접 적용하므로 이 스타일시트에서는 건드리지 않는다.
//
// 이 패널은 우측 사이드 패널(shell)의 light-DOM 자식으로 슬롯되는 콘텐츠다.
// 따라서 :host 는 position:fixed 가 아니라 display:block; width:100% 이며,
// 배경/테두리/스크롤은 셸이 담당하고 .panel 은 투명한 콘텐츠 블록일 뿐이다.
export const PropsPanelStyles = `
  :host {
    all: initial;
    display: block;
    width: 100%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 11px;
  }

  .panel {
    width: 100%;
    background: transparent;
    border: none;
    box-shadow: none;
    border-radius: 0;
    max-height: none;
    color: hsl(0 0% 85%);
  }

  :host([data-theme="light"]) .panel {
    color: #111;
  }

  .empty-hint {
    padding: 16px 10px;
    text-align: center;
    color: hsl(0 0% 50%);
    font-size: 11px;
    line-height: 1.5;
  }

  :host([data-theme="light"]) .empty-hint {
    color: hsl(0 0% 45%);
  }

  .body {
    overflow: visible;
    padding: 4px 8px 10px;
  }

  section {
    padding: 6px 0;
    border-bottom: 1px solid hsl(0 0% 20%);
  }

  :host([data-theme="light"]) section {
    border-bottom-color: hsl(0 0% 90%);
  }

  section:last-child {
    border-bottom: none;
  }

  .section-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: hsl(0 0% 50%);
    margin-bottom: 4px;
    letter-spacing: 0.04em;
  }

  :host([data-theme="light"]) .section-title {
    color: hsl(0 0% 42%);
  }

  .hint {
    color: hsl(40 90% 60%);
    font-size: 10px;
    padding: 0 0 4px;
  }

  :host([data-theme="light"]) .hint {
    color: hsl(35 85% 40%);
  }

  .flex-hint {
    color: hsl(0 0% 50%);
  }

  :host([data-theme="light"]) .flex-hint {
    color: hsl(0 0% 45%);
  }

  /* 프로퍼티 한 줄씩 세로로 쌓는 컨테이너 */
  .row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .row.tight {
    gap: 2px;
  }

  /* 한 줄 게이지 행: [라벨][게이지바][입력+단위] */
  .num-row {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 22px;
    padding: 2px 4px;
    border-radius: 4px;
    box-sizing: border-box;
  }

  .num-label {
    width: 28px;
    flex: none;
    color: hsl(0 0% 60%);
    cursor: ew-resize;
    user-select: none;
    text-align: center;
    font-size: 10px;
  }

  :host([data-theme="light"]) .num-label {
    color: hsl(0 0% 45%);
  }

  .num-label.disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .range-input {
    flex: 1 1 auto;
    min-width: 40px;
    display: block;
    -webkit-appearance: none;
    appearance: none;
    height: 14px;
    background: transparent;
    cursor: pointer;
    margin: 0;
  }

  .range-input:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .range-input::-webkit-slider-runnable-track {
    height: 3px;
    border-radius: 2px;
    background: hsl(0 0% 28%);
  }

  :host([data-theme="light"]) .range-input::-webkit-slider-runnable-track {
    background: hsl(0 0% 80%);
  }

  .range-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    margin-top: -4.5px;
    border-radius: 50%;
    background: hsl(200 100% 60%);
    border: 2px solid hsl(0 0% 100%);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  }

  .range-input::-moz-range-track {
    height: 3px;
    border-radius: 2px;
    background: hsl(0 0% 28%);
  }

  :host([data-theme="light"]) .range-input::-moz-range-track {
    background: hsl(0 0% 80%);
  }

  .range-input::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: hsl(200 100% 60%);
    border: 2px solid hsl(0 0% 100%);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  }

  .active-row {
    background: hsla(200, 100%, 55%, 0.12);
    outline: 1px solid hsla(200, 100%, 55%, 0.35);
  }

  :host([data-theme="light"]) .active-row {
    background: hsla(205, 100%, 50%, 0.08);
    outline-color: hsla(205, 100%, 45%, 0.3);
  }

  .input-wrap {
    display: flex;
    align-items: center;
    gap: 2px;
    background: hsl(0 0% 16%);
    border: 1px solid hsl(0 0% 27%);
    border-radius: 4px;
    padding: 2px 4px;
    flex: 0 0 52px;
    min-width: 0;
  }

  :host([data-theme="light"]) .input-wrap {
    background: hsl(0 0% 100%);
    border-color: hsl(0 0% 78%);
  }

  .input-wrap:focus-within {
    border-color: hsl(200 100% 55%);
  }

  .num-input {
    all: unset;
    width: 100%;
    color: inherit;
    font-size: 11px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .num-input:disabled {
    opacity: 0.4;
  }

  .opacity-value {
    flex: 1 1 auto;
    text-align: right;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  .unit {
    color: hsl(0 0% 45%);
    font-size: 9px;
    flex: none;
  }

  :host([data-theme="light"]) .unit {
    color: hsl(0 0% 55%);
  }

  .select-row {
    margin-top: 6px;
  }

  select.select-input {
    width: 100%;
    background: hsl(0 0% 16%);
    color: inherit;
    border: 1px solid hsl(0 0% 27%);
    border-radius: 4px;
    padding: 4px 5px;
    font-size: 11px;
  }

  :host([data-theme="light"]) select.select-input {
    background: hsl(0 0% 100%);
    border-color: hsl(0 0% 78%);
  }

  .align-row {
    display: flex;
    gap: 4px;
  }

  .align-btn {
    flex: 1;
    background: hsl(0 0% 16%);
    border: 1px solid hsl(0 0% 27%);
    color: hsl(0 0% 75%);
    border-radius: 4px;
    padding: 5px 0;
    cursor: pointer;
    font-size: 11px;
  }

  :host([data-theme="light"]) .align-btn {
    background: hsl(0 0% 100%);
    border-color: hsl(0 0% 78%);
    color: hsl(0 0% 30%);
  }

  .align-btn:hover {
    background: hsl(0 0% 22%);
  }

  :host([data-theme="light"]) .align-btn:hover {
    background: hsl(0 0% 92%);
  }

  .align-btn.active {
    background: hsl(200 70% 35%);
    border-color: hsl(200 70% 50%);
    color: white;
  }

  .color-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
  }

  .color-row:last-child {
    margin-bottom: 0;
  }

  .color-row .color-label {
    width: 46px;
    flex: none;
    color: hsl(0 0% 65%);
  }

  :host([data-theme="light"]) .color-row .color-label {
    color: hsl(0 0% 40%);
  }

  .color-row input[type="color"] {
    width: 22px;
    height: 22px;
    padding: 0;
    border: 1px solid hsl(0 0% 30%);
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    flex: none;
  }

  :host([data-theme="light"]) .color-row input[type="color"] {
    border-color: hsl(0 0% 78%);
  }

  .color-row .hex-input {
    all: unset;
    flex: 1 1 auto;
    background: hsl(0 0% 16%);
    border: 1px solid hsl(0 0% 27%);
    border-radius: 4px;
    padding: 3px 5px;
    color: inherit;
    font-size: 11px;
    min-width: 0;
  }

  :host([data-theme="light"]) .color-row .hex-input {
    background: hsl(0 0% 100%);
    border-color: hsl(0 0% 78%);
  }

  /* 정렬 (Flex) */
  .flex-make-btn {
    width: 100%;
    padding: 6px 0;
    margin-top: 2px;
    border-radius: 4px;
    background: hsl(200 70% 35%);
    border: 1px solid hsl(200 70% 45%);
    color: white;
    cursor: pointer;
    font-size: 11px;
  }

  .flex-make-btn:hover {
    background: hsl(200 70% 40%);
  }

  .flex-group-label {
    font-size: 10px;
    color: hsl(0 0% 55%);
    margin: 6px 0 3px;
  }

  :host([data-theme="light"]) .flex-group-label {
    color: hsl(0 0% 42%);
  }

  .flex-group-label:first-child {
    margin-top: 2px;
  }

  .flex-btn-row {
    display: flex;
    gap: 4px;
    margin-bottom: 2px;
  }

  .flex-btn {
    flex: 1;
    background: hsl(0 0% 16%);
    border: 1px solid hsl(0 0% 27%);
    color: hsl(0 0% 75%);
    border-radius: 4px;
    padding: 4px 0;
    cursor: pointer;
    font-size: 10px;
  }

  :host([data-theme="light"]) .flex-btn {
    background: hsl(0 0% 100%);
    border-color: hsl(0 0% 78%);
    color: hsl(0 0% 30%);
  }

  .flex-btn:hover {
    background: hsl(0 0% 22%);
  }

  :host([data-theme="light"]) .flex-btn:hover {
    background: hsl(0 0% 92%);
  }

  .flex-btn.active {
    background: hsl(200 70% 35%);
    border-color: hsl(200 70% 50%);
    color: white;
  }

  /* 순서 */
  .order-row {
    display: flex;
    gap: 4px;
  }

  .order-btn {
    flex: 1;
    background: hsl(0 0% 16%);
    border: 1px solid hsl(0 0% 27%);
    color: hsl(0 0% 75%);
    border-radius: 4px;
    padding: 5px 0;
    cursor: pointer;
    font-size: 12px;
  }

  :host([data-theme="light"]) .order-btn {
    background: hsl(0 0% 100%);
    border-color: hsl(0 0% 78%);
    color: hsl(0 0% 30%);
  }

  .order-btn:hover {
    background: hsl(0 0% 22%);
  }

  :host([data-theme="light"]) .order-btn:hover {
    background: hsl(0 0% 92%);
  }
`

export default PropsPanelStyles
