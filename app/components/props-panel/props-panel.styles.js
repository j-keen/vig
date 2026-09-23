// 속성 패널(Figma 스타일) 스타일
export const PropsPanelStyles = `
  :host {
    all: initial;
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

  @media (prefers-color-scheme: light) {
    .panel {
      background: hsl(0 0% 98%);
      border-color: hsl(0 0% 82%);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      color: hsl(0 0% 20%);
    }
  }

  .panel[hidden] {
    display: none;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    background: hsl(0 0% 15%);
    border-bottom: 1px solid hsl(0 0% 25%);
    cursor: grab;
    user-select: none;
  }

  @media (prefers-color-scheme: light) {
    .header {
      background: hsl(0 0% 93%);
      border-bottom-color: hsl(0 0% 82%);
    }
  }

  .header:active {
    cursor: grabbing;
  }

  .header .label {
    font-weight: 600;
    color: hsl(200 100% 70%);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 170px;
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

  section {
    padding: 8px 0;
    border-bottom: 1px solid hsl(0 0% 20%);
  }

  @media (prefers-color-scheme: light) {
    section {
      border-bottom-color: hsl(0 0% 88%);
    }
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

  .hint {
    color: hsl(40 90% 60%);
    font-size: 10px;
    padding: 2px 0 4px;
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

  .num-row.active-row {
    background: hsla(200, 100%, 55%, 0.12);
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

  @media (prefers-color-scheme: light) {
    .step-btn {
      background: hsl(0 0% 94%);
      color: hsl(0 0% 40%);
    }
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

  @media (prefers-color-scheme: light) {
    .range-input::-webkit-slider-runnable-track {
      background: hsl(0 0% 82%);
    }
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

  @media (prefers-color-scheme: light) {
    .input-wrap {
      background: hsl(0 0% 100%);
      border-color: hsl(0 0% 80%);
    }
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

  select.select-input {
    width: 100%;
    background: hsl(0 0% 16%);
    color: inherit;
    border: 1px solid hsl(0 0% 27%);
    border-radius: 4px;
    padding: 4px 5px;
    font-size: 11px;
  }

  @media (prefers-color-scheme: light) {
    select.select-input {
      background: hsl(0 0% 100%);
      border-color: hsl(0 0% 80%);
    }
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

  @media (prefers-color-scheme: light) {
    .align-btn {
      background: hsl(0 0% 100%);
      border-color: hsl(0 0% 80%);
      color: hsl(0 0% 30%);
    }
  }

  .align-btn:hover {
    background: hsl(0 0% 22%);
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

  @media (prefers-color-scheme: light) {
    .color-row .hex-input {
      background: hsl(0 0% 100%);
      border-color: hsl(0 0% 80%);
    }
  }
`

export default PropsPanelStyles
