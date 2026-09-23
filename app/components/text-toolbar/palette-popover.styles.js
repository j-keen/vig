// 색상 팔레트 팝오버 스타일
export const PalettePopoverStyles = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
  }

  .popover {
    background: hsl(0 0% 10%);
    border: 1px solid hsl(0 0% 25%);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
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
    border: 1px solid hsl(0 0% 30%);
    cursor: pointer;
    padding: 0;
  }

  .swatch:hover {
    outline: 2px solid hsl(200 100% 60%);
    outline-offset: 1px;
  }

  .empty {
    color: hsl(0 0% 50%);
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
    border: 1px solid hsl(0 0% 30%);
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
    background: hsl(0 0% 18%);
    border: 1px solid hsl(0 0% 30%);
    border-radius: 6px;
    color: hsl(0 0% 90%);
    cursor: pointer;
    height: 28px;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  .eyedropper:hover {
    background: hsl(0 0% 25%);
  }

  .eyedropper.picking {
    background: hsl(200 60% 30%);
    color: hsl(0 0% 100%);
  }
`
