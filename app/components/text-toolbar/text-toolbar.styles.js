// 플로팅 텍스트 미니 툴바 스타일 (Canva 스타일)
// Theming: Settings.registerPanel(host) sets [data-theme="dark"|"light"] and
// host.style.opacity - this stylesheet is the single source of truth for
// what each theme looks like (no prefers-color-scheme queries here; opacity
// is never set from CSS, only by Settings).
export const TextToolbarStyles = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;

    /* dark theme (default) */
    --dp-bg: hsl(0 0% 10%);
    --dp-bg-elevated: hsl(0 0% 12%);
    --dp-control-bg: hsl(0 0% 16%);
    --dp-control-hover-bg: hsl(0 0% 22%);
    --dp-control-hover-bg-strong: hsl(0 0% 25%);
    --dp-border: hsl(0 0% 25%);
    --dp-border-soft: hsl(0 0% 22%);
    --dp-border-strong: hsl(0 0% 28%);
    --dp-text: hsl(0 0% 85%);
    --dp-text-strong: hsl(0 0% 90%);
    --dp-text-soft: hsl(0 0% 65%);
    --dp-text-softer: hsl(0 0% 50%);
    --dp-text-on-accent: hsl(0 0% 100%);
    --dp-thumb-ring: hsl(0 0% 100%);
    --dp-track-bg: hsl(0 0% 28%);
    --dp-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    --dp-swatch-border: hsl(0 0% 45%);

    /* accent stays identical across themes */
    --dp-accent: hsl(200 80% 35%);
    --dp-accent-strong: hsl(200 80% 30%);
    --dp-accent-thumb: hsl(200 90% 60%);
  }

  :host([data-theme="light"]) {
    --dp-bg: #ffffff;
    --dp-bg-elevated: #ffffff;
    --dp-control-bg: hsl(0 0% 95%);
    --dp-control-hover-bg: hsl(0 0% 90%);
    --dp-control-hover-bg-strong: hsl(0 0% 86%);
    --dp-border: hsl(0 0% 85%);
    --dp-border-soft: hsl(0 0% 90%);
    --dp-border-strong: hsl(0 0% 82%);
    --dp-text: #111111;
    --dp-text-strong: #111111;
    --dp-text-soft: hsl(0 0% 35%);
    --dp-text-softer: hsl(0 0% 45%);
    --dp-text-on-accent: hsl(0 0% 100%);
    --dp-thumb-ring: #ffffff;
    --dp-track-bg: hsl(0 0% 82%);
    --dp-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
    --dp-swatch-border: hsl(0 0% 70%);
  }

  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--dp-bg);
    border: 1px solid var(--dp-border);
    border-radius: 8px;
    box-shadow: var(--dp-shadow);
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
    border-top: 1px solid var(--dp-border-soft);
    white-space: nowrap;
  }

  .row2[hidden] {
    display: none;
  }

  .btn {
    background: transparent;
    border: none;
    color: var(--dp-text);
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

  .btn svg {
    stroke: currentColor;
    fill: none;
  }

  .btn:hover {
    background: var(--dp-control-hover-bg);
  }

  .btn.active {
    background: var(--dp-accent);
    color: var(--dp-text-on-accent);
  }

  .sep {
    width: 1px;
    height: 18px;
    background: var(--dp-border);
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
    background: var(--dp-control-bg);
    border: none;
    color: var(--dp-text);
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
    background: var(--dp-control-hover-bg-strong);
  }

  .stepper:active {
    background: var(--dp-accent-strong);
    color: var(--dp-text-on-accent);
  }

  .size-input {
    all: unset;
    width: 32px;
    text-align: center;
    color: var(--dp-text-strong);
    background: var(--dp-control-bg);
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
    background: var(--dp-track-bg);
    border-radius: 2px;
  }

  input[type="range"]::-moz-range-track {
    height: 4px;
    background: var(--dp-track-bg);
    border-radius: 2px;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    margin-top: -6px;
    border-radius: 50%;
    background: var(--dp-accent-thumb);
    border: 2px solid var(--dp-thumb-ring);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }

  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--dp-accent-thumb);
    border: 2px solid var(--dp-thumb-ring);
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
    color: var(--dp-text-strong);
    background: var(--dp-control-bg);
    border-radius: 4px;
    padding: 6px 8px;
    box-sizing: border-box;
    font-size: 11px;
    cursor: pointer;
  }

  .font-trigger:hover {
    background: var(--dp-control-hover-bg);
  }

  .font-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 160px;
    max-height: 220px;
    overflow-y: auto;
    background: var(--dp-bg-elevated);
    border: 1px solid var(--dp-border-strong);
    border-radius: 6px;
    box-shadow: var(--dp-shadow);
    padding: 4px;
    z-index: 1;
  }

  .font-menu[hidden] {
    display: none;
  }

  .font-menu-group {
    color: var(--dp-text-softer);
    font-size: 10px;
    padding: 6px 8px 2px;
  }

  .font-menu-row {
    color: var(--dp-text-strong);
    font-size: 12px;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .font-menu-row:hover {
    background: var(--dp-accent-strong);
    color: var(--dp-text-on-accent);
  }

  .font-menu-empty {
    color: var(--dp-text-softer);
    font-style: italic;
    padding: 6px 8px;
  }

  /* ---- swatches / more toggle ---- */

  .swatch-dot {
    display: block;
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 1px solid var(--dp-swatch-border);
    background: #000;
  }

  .more-toggle {
    all: unset;
    color: var(--dp-text-soft);
    font-size: 11px;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    flex: none;
    white-space: nowrap;
  }

  .more-toggle:hover {
    background: var(--dp-control-hover-bg);
    color: var(--dp-text-strong);
  }

  /* ---- row 2 sliders ---- */

  .slider-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .slider-label {
    color: var(--dp-text-soft);
    font-size: 11px;
    flex: none;
  }

  .line-height-range,
  .letter-spacing-range,
  .opacity-range {
    width: 70px;
  }
`
