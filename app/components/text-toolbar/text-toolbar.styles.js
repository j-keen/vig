// 플로팅 텍스트 미니 툴바 스타일 (Canva 스타일)
export const TextToolbarStyles = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
  }

  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: hsl(0 0% 10%);
    border: 1px solid hsl(0 0% 25%);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    padding: 4px;
  }

  .row1 {
    display: flex;
    align-items: center;
    gap: 2px;
    white-space: nowrap;
  }

  .row2 {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 6px 2px;
    border-top: 1px solid hsl(0 0% 22%);
    white-space: nowrap;
  }

  .row2[hidden] {
    display: none;
  }

  .btn {
    background: transparent;
    border: none;
    color: hsl(0 0% 85%);
    cursor: pointer;
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    font-size: 12px;
    line-height: 1;
    font-weight: 600;
    flex: none;
  }

  .btn:hover {
    background: hsl(0 0% 22%);
  }

  .btn.active {
    background: hsl(200 80% 35%);
    color: hsl(0 0% 100%);
  }

  .sep {
    width: 1px;
    height: 18px;
    background: hsl(0 0% 25%);
    margin: 0 3px;
    flex: none;
  }

  /* ---- font size gauge ---- */

  .gauge {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: none;
  }

  .stepper {
    background: hsl(0 0% 16%);
    border: none;
    color: hsl(0 0% 80%);
    cursor: pointer;
    width: 18px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-size: 9px;
    flex: none;
    user-select: none;
  }

  .stepper:hover {
    background: hsl(0 0% 25%);
  }

  .stepper:active {
    background: hsl(200 80% 30%);
  }

  .size-input {
    all: unset;
    width: 32px;
    text-align: center;
    color: hsl(0 0% 90%);
    background: hsl(0 0% 16%);
    border-radius: 4px;
    padding: 4px 2px;
    box-sizing: border-box;
  }

  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
    flex: none;
    margin: 0;
  }

  .size-range {
    width: 64px;
  }

  input[type="range"]::-webkit-slider-runnable-track {
    height: 4px;
    background: hsl(0 0% 28%);
    border-radius: 2px;
  }

  input[type="range"]::-moz-range-track {
    height: 4px;
    background: hsl(0 0% 28%);
    border-radius: 2px;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    margin-top: -6px;
    border-radius: 50%;
    background: hsl(200 90% 60%);
    border: 2px solid hsl(0 0% 100%);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }

  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: hsl(200 90% 60%);
    border: 2px solid hsl(0 0% 100%);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }

  /* ---- font family picker ---- */

  .font-picker {
    position: relative;
    flex: none;
  }

  .font-trigger {
    all: unset;
    display: block;
    max-width: 110px;
    overflow: hidden;
    text-overflow: ellipsis;
    color: hsl(0 0% 90%);
    background: hsl(0 0% 16%);
    border-radius: 4px;
    padding: 6px 8px;
    box-sizing: border-box;
    font-size: 11px;
    cursor: pointer;
  }

  .font-trigger:hover {
    background: hsl(0 0% 22%);
  }

  .font-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 160px;
    max-height: 220px;
    overflow-y: auto;
    background: hsl(0 0% 12%);
    border: 1px solid hsl(0 0% 28%);
    border-radius: 6px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    padding: 4px;
    z-index: 1;
  }

  .font-menu[hidden] {
    display: none;
  }

  .font-menu-group {
    color: hsl(0 0% 50%);
    font-size: 10px;
    padding: 6px 8px 2px;
  }

  .font-menu-row {
    color: hsl(0 0% 88%);
    font-size: 12px;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .font-menu-row:hover {
    background: hsl(200 80% 30%);
    color: hsl(0 0% 100%);
  }

  .font-menu-empty {
    color: hsl(0 0% 50%);
    font-style: italic;
    padding: 6px 8px;
  }

  /* ---- swatches / more toggle ---- */

  .swatch-dot {
    display: block;
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 1px solid hsl(0 0% 45%);
    background: #000;
  }

  .more-toggle {
    all: unset;
    color: hsl(0 0% 70%);
    font-size: 11px;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    flex: none;
    white-space: nowrap;
  }

  .more-toggle:hover {
    background: hsl(0 0% 22%);
    color: hsl(0 0% 95%);
  }

  /* ---- row 2 sliders ---- */

  .slider-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .slider-label {
    color: hsl(0 0% 65%);
    font-size: 11px;
    flex: none;
  }

  .line-height-range,
  .letter-spacing-range,
  .opacity-range {
    width: 70px;
  }
`
