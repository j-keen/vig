// 히스토리 패널 스타일
export const HistoryPanelStyles = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
  }

  .panel {
    background: hsl(0 0% 10%);
    border: 1px solid hsl(0 0% 25%);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    min-width: 220px;
    max-width: 320px;
    overflow: hidden;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: hsl(0 0% 15%);
    border-bottom: 1px solid hsl(0 0% 25%);
    cursor: grab;
    user-select: none;
  }

  .header:active {
    cursor: grabbing;
  }

  .title {
    color: hsl(0 0% 90%);
    font-weight: 500;
  }

  .count {
    color: hsl(200 100% 60%);
  }

  .buttons {
    display: flex;
    gap: 4px;
  }

  .buttons button {
    background: transparent;
    border: none;
    color: hsl(0 0% 60%);
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-size: 14px;
    line-height: 1;
  }

  .buttons button:hover {
    background: hsl(0 0% 25%);
    color: hsl(0 0% 90%);
  }

  .btn-close:hover {
    background: hsl(0 60% 40%);
  }

  .btn-compare.active,
  .btn-help.active {
    background: hsl(200 60% 40%);
    color: hsl(0 0% 100%);
  }

  .content {
    padding: 8px;
    max-height: 300px;
    overflow-y: auto;
  }

  .content::-webkit-scrollbar {
    width: 6px;
  }

  .content::-webkit-scrollbar-track {
    background: hsl(0 0% 15%);
  }

  .content::-webkit-scrollbar-thumb {
    background: hsl(0 0% 35%);
    border-radius: 3px;
  }

  .history-empty {
    color: hsl(0 0% 50%);
    text-align: center;
    padding: 16px 8px;
    font-style: italic;
  }

  .history-item {
    background: hsl(0 0% 15%);
    border-radius: 6px;
    padding: 8px 10px;
    margin-bottom: 6px;
    position: relative;
  }

  .btn-delete {
    position: absolute;
    top: 4px;
    right: 4px;
    background: transparent;
    border: none;
    color: hsl(0 0% 40%);
    cursor: pointer;
    width: 18px;
    height: 18px;
    font-size: 12px;
    line-height: 1;
    border-radius: 3px;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .history-item:hover .btn-delete {
    opacity: 1;
  }

  .btn-delete:hover {
    background: hsl(0 60% 40%);
    color: hsl(0 0% 100%);
  }

  .history-item:last-child {
    margin-bottom: 0;
  }

  .history-item.deleted {
    border-left: 3px solid hsl(0 70% 50%);
  }

  .history-name {
    color: hsl(200 100% 70%);
    font-weight: 500;
    margin-bottom: 4px;
    word-break: break-all;
    cursor: pointer;
  }

  .history-item.deleted .history-name {
    color: hsl(0 70% 60%);
  }

  .history-detail {
    color: hsl(0 0% 70%);
    font-size: 11px;
    line-height: 1.5;
    padding-left: 8px;
  }

  .history-item.deleted .history-detail {
    color: hsl(0 50% 60%);
    font-weight: 500;
  }

  .history-item.screenshot {
    border-left: 3px solid hsl(120 60% 45%);
  }

  .history-item.screenshot .history-name {
    color: hsl(120 60% 65%);
  }

  .history-item.screenshot .history-name::before {
    content: "\\1F4F7 ";
  }

  .help-content {
    padding: 12px;
    max-height: 300px;
    overflow-y: auto;
  }

  .help-section {
    background: hsl(0 0% 15%);
    border-radius: 6px;
    padding: 12px;
  }

  .help-title {
    color: hsl(200 100% 70%);
    font-weight: 600;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid hsl(0 0% 25%);
  }

  .help-item {
    color: hsl(0 0% 80%);
    font-size: 11px;
    line-height: 1.8;
    display: flex;
    gap: 8px;
  }

  .help-item .key {
    color: hsl(50 100% 65%);
    font-family: monospace;
    font-weight: 500;
    min-width: 100px;
  }

  .btn-copy {
    position: absolute;
    top: 4px;
    right: 24px;
    background: transparent;
    border: none;
    color: hsl(0 0% 40%);
    cursor: pointer;
    width: 18px;
    height: 18px;
    font-size: 12px;
    line-height: 1;
    border-radius: 3px;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .history-item:hover .btn-copy {
    opacity: 1;
  }

  .btn-copy:hover {
    background: hsl(200 60% 40%);
    color: hsl(0 0% 100%);
  }

  .screenshot-buttons {
    position: absolute;
    top: 4px;
    right: 24px;
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .history-item:hover .screenshot-buttons {
    opacity: 1;
  }

  .btn-copy-image,
  .btn-copy-path {
    background: transparent;
    border: none;
    color: hsl(0 0% 40%);
    cursor: pointer;
    width: 18px;
    height: 18px;
    font-size: 11px;
    line-height: 1;
    border-radius: 3px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-copy-image:hover {
    background: hsl(200 60% 40%);
    color: hsl(0 0% 100%);
  }

  .btn-copy-path:hover {
    background: hsl(30 60% 40%);
    color: hsl(0 0% 100%);
  }

  .btn-copy-all {
    font-size: 12px;
  }

  .copy-notification {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%) translateY(10px);
    background: hsl(140 60% 35%);
    color: white;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 11px;
    opacity: 0;
    transition: opacity 0.2s, transform 0.2s;
    pointer-events: none;
    white-space: nowrap;
  }

  .copy-notification.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
`

export default HistoryPanelStyles
