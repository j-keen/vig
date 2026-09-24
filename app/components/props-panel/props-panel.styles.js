// 속성 패널(Figma 스타일) 스타일
// 테마(dark/light)는 Settings.registerPanel 이 호스트에 심어주는 data-theme 속성이
// 유일한 기준이다 (prefers-color-scheme 미디어쿼리는 사용하지 않는다).
// opacity 는 Settings 가 호스트(:host)에 직접 적용하므로 이 스타일시트에서는 건드리지 않는다.
export const PropsPanelStyles = `
  :host {
    all: initial;
    position: fixed;
    top: 72px;
    right: 12px;
    max-width: 240px;
    z-index: 2147483646;
    pointer-events: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 11px;
  }

  .panel {
    width: 240px;
    max-height: calc(100vh - 96px);
    display: flex;
    flex-direction: column;
    background: hsl(0 0% 10%);
    border: 1px solid hsl(0 0% 25%);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    color: hsl(0 0% 85%);
    pointer-events: auto;
  }

  :host([data-theme="light"]) .panel {
    background: hsl(0 0% 100%);
    border-color: hsl(0 0% 85%);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    color: #111;
  }

  :host([data-dragging]) .panel {
    box-shadow: 0 10px 34px rgba(0, 0, 0, 0.55);
  }

  :host([data-theme="light"][data-dragging]) .panel {
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
  }

  .panel[hidden] {
    display: none;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    background: hsl(0 0% 15%);
    border-bottom: 1px solid hsl(0 0% 25%);
    cursor: grab;
    user-select: none;
  }

  :host([data-theme="light"]) .header {
    background: hsl(0 0% 95%);
    border-bottom-color: hsl(0 0% 85%);
  }

  .header:active {
    cursor: grabbing;
  }

  :host([data-dragging]) .header {
    cursor: grabbing;
  }

  .grip-icon {
    flex: none;
    color: hsl(0 0% 45%);
    letter-spacing: -1px;
    font-size: 12px;
  }

  :host([data-theme="light"]) .grip-icon {
    color: hsl(0 0% 60%);
  }

  .header .label {
    flex: 1 1 auto;
    font-weight: 600;
    color: hsl(200 100% 70%);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :host([data-theme="light"]) .header .label {
    color: hsl(205 90% 40%);
  }

  .body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 6px 10px 10px;
  }

  .body::-webkit-scrollbar {
    width: 6px;
  }

  .body::-webkit-scrollbar-thumb {
    background: hsl(0 0% 35%);
    border-radius: 3px;
  }

  :host([data-theme="light"]) .body::-webkit-scrollbar-thumb {
    background: hsl(0 0% 80%);
  }

  section {
    padding: 8px 0;
    border-bottom: 1px solid hsl(0 0% 20%);
  }

  :host([data-theme="light"]) section {
    border-bottom-color: hsl(0 0% 90%);
  }

  section:last-child {
    border-bottom: none;
  }

  .section-title {
    font-weight: 600;
    color: hsl(0 0% 55%);
    margin-bottom: 6px;
    letter-spacing: 0.02em;
  }

  :host([data-theme="light"]) .section-title {
    color: hsl(0 0% 40%);
  }

  .hint {
    color: hsl(40 90% 60%);
    font-size: 10px;
    padding: 2px 0 4px;
  }

  :host([data-theme="light"]) .hint {
    color: hsl(35 85% 40%);
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .field {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1 1 auto;
    min-width: 70px;
  }

  /* 게이지형 숫자 행: 라벨 + 스테퍼 + 입력 (위) / 슬라이더 (아래) */
  .num-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 3px 4px;
    border-radius: 5px;
    margin-bottom: 4px;
  }

  .num-row:last-child {
    margin-bottom: 0;
  }

  .num-row-top {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .num-label {
    color: hsl(0 0% 60%);
    cursor: ew-resize;
    user-select: none;
    width: 16px;
    flex: none;
    text-align: center;
  }

  :host([data-theme="light"]) .num-label {
    color: hsl(0 0% 45%);
  }

  .num-label.disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .stepper {
    display: flex;
    flex-direction: column;
    flex: none;
  }

  .step-btn {
    all: unset;
    width: 13px;
    height: 10px;
    line-height: 10px;
    text-align: center;
    font-size: 7px;
    color: hsl(0 0% 55%);
    background: hsl(0 0% 16%);
    cursor: pointer;
    user-select: none;
  }

  :host([data-theme="light"]) .step-btn {
    background: hsl(0 0% 92%);
    color: hsl(0 0% 35%);
  }

  .step-btn:first-child {
    border-radius: 3px 3px 0 0;
  }

  .step-btn:last-child {
    border-radius: 0 0 3px 3px;
  }

  .step-btn:hover {
    background: hsl(200 70% 35%);
    color: #fff;
  }

  .step-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    pointer-events: none;
  }

  .range-input {
    width: 100%;
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
    width: 14px;
    height: 14px;
    margin-top: -5.5px;
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
    width: 14px;
    height: 14px;
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
    background: hsl(0 0% 16%);
    border: 1px solid hsl(0 0% 27%);
    border-radius: 4px;
    padding: 3px 5px;
    flex: 1 1 auto;
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
    font-variant-numeric: tabular-nums;
  }

  .num-input:disabled {
    opacity: 0.4;
  }

  .unit {
    color: hsl(0 0% 45%);
    font-size: 10px;
    flex: none;
  }

  :host([data-theme="light"]) .unit {
    color: hsl(0 0% 55%);
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

  .opacity-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .opacity-row input[type="range"] {
    flex: 1;
    accent-color: hsl(200 100% 55%);
  }

  .opacity-value {
    width: 34px;
    text-align: right;
    color: hsl(0 0% 60%);
    flex: none;
  }

  :host([data-theme="light"]) .opacity-value {
    color: hsl(0 0% 40%);
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
`

export default PropsPanelStyles
