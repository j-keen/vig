// 색상 팔레트 팝오버 스타일
// Theming: Settings.registerPanel(host) sets [data-theme="dark"|"light"] and
// host.style.opacity - this stylesheet is the single source of truth for
// what each theme looks like (no prefers-color-scheme queries here; opacity
// is never set from CSS, only by Settings).
export const PalettePopoverStyles = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;

    /* dark theme (default) */
    --dp-bg: hsl(0 0% 10%);
    --dp-control-bg: hsl(0 0% 18%);
    --dp-control-hover-bg: hsl(0 0% 25%);
    --dp-border: hsl(0 0% 25%);
    --dp-border-soft: hsl(0 0% 30%);
    --dp-text: hsl(0 0% 90%);
    --dp-text-softer: hsl(0 0% 50%);
    --dp-text-on-accent: hsl(0 0% 100%);
    --dp-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);

    /* accent stays identical across themes */
    --dp-accent-ring: hsl(200 100% 60%);
    --dp-accent-picking: hsl(200 60% 30%);
  }

  :host([data-theme="light"]) {
    --dp-bg: #ffffff;
    --dp-control-bg: hsl(0 0% 95%);
    --dp-control-hover-bg: hsl(0 0% 88%);
    --dp-border: hsl(0 0% 85%);
    --dp-border-soft: hsl(0 0% 80%);
    --dp-text: #111111;
    --dp-text-softer: hsl(0 0% 45%);
    --dp-text-on-accent: hsl(0 0% 100%);
    --dp-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  }

  .popover {
    background: var(--dp-bg);
    border: 1px solid var(--dp-border);
    border-radius: 8px;
    box-shadow: var(--dp-shadow);
    padding: 10px;
    width: 200px;
  }

  .swatches {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 6px;
    margin-bottom: 10px;
  }

  .swatch {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 1px solid var(--dp-border-soft);
    cursor: pointer;
    padding: 0;
  }

  .swatch:hover {
    outline: 2px solid var(--dp-accent-ring);
    outline-offset: 1px;
  }

  .empty {
    color: var(--dp-text-softer);
    font-style: italic;
    grid-column: 1 / -1;
    text-align: center;
    padding: 4px 0;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  input[type="color"] {
    -webkit-appearance: none;
    appearance: none;
    width: 28px;
    height: 28px;
    border: 1px solid var(--dp-border-soft);
    border-radius: 6px;
    padding: 0;
    background: transparent;
    cursor: pointer;
    flex: none;
  }

  input[type="color"]::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  input[type="color"]::-webkit-color-swatch {
    border: none;
    border-radius: 5px;
  }

  .eyedropper {
    flex: 1;
    background: var(--dp-control-bg);
    border: 1px solid var(--dp-border-soft);
    border-radius: 6px;
    color: var(--dp-text);
    cursor: pointer;
    height: 28px;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  .eyedropper svg {
    stroke: currentColor;
    fill: none;
  }

  .eyedropper:hover {
    background: var(--dp-control-hover-bg);
  }

  .eyedropper.picking {
    background: var(--dp-accent-picking);
    color: var(--dp-text-on-accent);
  }
`
