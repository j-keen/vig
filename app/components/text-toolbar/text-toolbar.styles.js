// 플로팅 텍스트 미니 툴바 스타일 (Canva 스타일)
export const TextToolbarStyles = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 2px;
    background: hsl(0 0% 10%);
    border: 1px solid hsl(0 0% 25%);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    padding: 4px;
    white-space: nowrap;
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

  .size-input {
    all: unset;
    width: 34px;
    text-align: center;
    color: hsl(0 0% 90%);
    background: hsl(0 0% 16%);
    border-radius: 4px;
    padding: 4px 2px;
    box-sizing: border-box;
  }

  .font-family {
    all: unset;
    max-width: 120px;
    color: hsl(0 0% 90%);
    background: hsl(0 0% 16%);
    border-radius: 4px;
    padding: 4px 6px;
    box-sizing: border-box;
    font-size: 11px;
  }

  .swatch-dot {
    display: block;
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 1px solid hsl(0 0% 45%);
    background: #000;
  }
`
