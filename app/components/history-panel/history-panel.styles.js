// 히스토리 패널 스타일
// 색상은 CSS 변수로 토큰화되어 있으며, :host([data-theme="light"]) 에서 재정의된다.
// Settings.registerPanel()이 :host 에 data-theme 과 style.opacity를 관리한다 (prefers-color-scheme 미디어쿼리 사용 안 함).
export const HistoryPanelStyles = `
  :host {
    all: initial;
    display: block;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;

    /* dark (기본) 팔레트 */
    --dp-bg: hsl(0 0% 10%);
    --dp-bg-2: hsl(0 0% 15%);
    --dp-bg-3: hsl(0 0% 25%);
    --dp-border: hsl(0 0% 25%);
    --dp-text: hsl(0 0% 90%);
    --dp-text-hover: hsl(0 0% 90%);
    --dp-text-muted: hsl(0 0% 60%);
    --dp-text-dim: hsl(0 0% 70%);
    --dp-text-faint: hsl(0 0% 50%);
    --dp-text-faint-2: hsl(0 0% 40%);
    --dp-accent: hsl(200 100% 60%);
    --dp-accent-strong: hsl(200 100% 70%);
    --dp-accent-bg: hsl(200 60% 40%);
    --dp-danger: hsl(0 60% 40%);
    --dp-danger-border: hsl(0 70% 50%);
    --dp-danger-text: hsl(0 70% 60%);
    --dp-danger-text-2: hsl(0 50% 60%);
    --dp-success-border: hsl(120 60% 45%);
    --dp-success-text: hsl(120 60% 65%);
    --dp-revert-bg: hsl(280 50% 45%);
    --dp-note-text: hsl(45 90% 65%);
    --dp-note-bg-hover: hsl(45 60% 35%);
    --dp-note-border: hsl(45 90% 55%);
    --dp-key: hsl(50 100% 65%);
    --dp-path-hover: hsl(30 60% 40%);
    --dp-notify-bg: hsl(140 60% 35%);
    --dp-shadow: rgba(0, 0, 0, 0.5);
    --dp-shadow-drag: rgba(0, 0, 0, 0.65);
    --dp-scrollbar-track: hsl(0 0% 15%);
    --dp-scrollbar-thumb: hsl(0 0% 35%);
  }

  :host([data-theme="light"]) {
    --dp-bg: #ffffff;
    --dp-bg-2: #f3f4f6;
    --dp-bg-3: #e5e7eb;
    --dp-border: #dcdfe4;
    --dp-text: #111111;
    --dp-text-hover: #111111;
    --dp-text-muted: #6b7280;
    --dp-text-dim: #444950;
    --dp-text-faint: #6b7280;
    --dp-text-faint-2: #6b7280;
    --dp-accent: hsl(210 90% 42%);
    --dp-accent-strong: hsl(210 90% 36%);
    --dp-accent-bg: hsl(210 80% 46%);
    --dp-danger: hsl(0 70% 46%);
    --dp-danger-border: hsl(0 70% 50%);
    --dp-danger-text: hsl(0 65% 42%);
    --dp-danger-text-2: hsl(0 55% 38%);
    --dp-success-border: hsl(120 55% 36%);
    --dp-success-text: hsl(120 55% 30%);
    --dp-revert-bg: hsl(280 55% 46%);
    --dp-note-text: hsl(38 85% 34%);
    --dp-note-bg-hover: hsl(45 75% 88%);
    --dp-note-border: hsl(40 85% 42%);
    --dp-key: hsl(35 90% 38%);
    --dp-path-hover: hsl(30 70% 42%);
    --dp-notify-bg: hsl(140 55% 34%);
    --dp-shadow: rgba(20, 20, 30, 0.16);
    --dp-shadow-drag: rgba(20, 20, 30, 0.28);
    --dp-scrollbar-track: #eef0f2;
    --dp-scrollbar-thumb: #c7cbd1;
  }

  .panel {
    background: var(--dp-bg);
    overflow: hidden;
    transition: background 0.15s, border-color 0.15s;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    background: var(--dp-bg-2);
    border-bottom: 1px solid var(--dp-border);
    user-select: none;
    gap: 8px;
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .title {
    color: var(--dp-text);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .count {
    color: var(--dp-accent);
  }

  .buttons {
    display: flex;
    gap: 4px;
    flex: none;
  }

  .buttons button {
    background: transparent;
    border: none;
    color: var(--dp-text-muted);
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
    background: var(--dp-bg-3);
    color: var(--dp-text-hover);
  }

  .btn-compare.active,
  .btn-help.active {
    background: var(--dp-accent-bg);
    color: hsl(0 0% 100%);
  }

  .content {
    padding: 8px;
  }

  .content::-webkit-scrollbar {
    width: 6px;
  }

  .content::-webkit-scrollbar-track {
    background: var(--dp-scrollbar-track);
  }

  .content::-webkit-scrollbar-thumb {
    background: var(--dp-scrollbar-thumb);
    border-radius: 3px;
  }

  .history-empty {
    color: var(--dp-text-faint);
    text-align: center;
    padding: 16px 8px;
    font-style: italic;
  }

  .history-item {
    background: var(--dp-bg-2);
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
    color: var(--dp-text-faint-2);
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
    background: var(--dp-danger);
    color: hsl(0 0% 100%);
  }

  .history-item:last-child {
    margin-bottom: 0;
  }

  .history-item.deleted {
    border-left: 3px solid var(--dp-danger-border);
  }

  .history-name {
    color: var(--dp-accent-strong);
    font-weight: 500;
    margin-bottom: 4px;
    word-break: break-all;
    cursor: pointer;
  }

  .history-item.deleted .history-name {
    color: var(--dp-danger-text);
  }

  .history-detail {
    color: var(--dp-text-dim);
    font-size: 11px;
    line-height: 1.5;
    padding-left: 8px;
  }

  .history-item.deleted .history-detail {
    color: var(--dp-danger-text-2);
    font-weight: 500;
  }

  .history-item.screenshot {
    border-left: 3px solid var(--dp-success-border);
  }

  .history-item.screenshot .history-name {
    color: var(--dp-success-text);
  }

  .history-item.screenshot .history-name::before {
    content: "\\1F4F7 ";
  }

  .btn-revert {
    position: absolute;
    top: 4px;
    right: 44px;
    background: transparent;
    border: none;
    color: var(--dp-text-faint-2);
    cursor: pointer;
    width: 18px;
    height: 18px;
    font-size: 12px;
    line-height: 1;
    border-radius: 3px;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .history-item:hover .btn-revert {
    opacity: 1;
  }

  .btn-revert:hover {
    background: var(--dp-revert-bg);
    color: hsl(0 0% 100%);
  }

  .history-note {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
    padding-left: 8px;
    color: var(--dp-note-text);
    font-size: 11px;
    line-height: 1.5;
  }

  .history-note .note-text {
    flex: 1;
    word-break: break-word;
  }

  .btn-edit-note {
    flex: none;
    background: transparent;
    border: none;
    color: var(--dp-note-text);
    cursor: pointer;
    width: 16px;
    height: 16px;
    font-size: 11px;
    line-height: 1;
    border-radius: 3px;
    padding: 0;
  }

  .btn-edit-note:hover {
    background: var(--dp-note-bg-hover);
    color: hsl(0 0% 100%);
  }

  :host([data-theme="light"]) .btn-edit-note:hover {
    color: var(--dp-note-text);
  }

  .history-item.page-note {
    border-left: 3px solid var(--dp-note-border);
  }

  .history-item.page-note .history-name {
    color: var(--dp-note-text);
  }

  .history-item.page-note .btn-edit-note {
    position: absolute;
    top: 4px;
    right: 24px;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .history-item.page-note:hover .btn-edit-note {
    opacity: 1;
  }

  .help-content {
    padding: 12px;
    max-height: 300px;
    overflow-y: auto;
  }

  .help-section {
    background: var(--dp-bg-2);
    border-radius: 6px;
    padding: 12px;
  }

  .help-title {
    color: var(--dp-accent-strong);
    font-weight: 600;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--dp-border);
  }

  .help-item {
    color: var(--dp-text-dim);
    font-size: 11px;
    line-height: 1.8;
    display: flex;
    gap: 8px;
  }

  .help-item .key {
    color: var(--dp-key);
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
    color: var(--dp-text-faint-2);
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
    background: var(--dp-accent-bg);
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
    color: var(--dp-text-faint-2);
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
    background: var(--dp-accent-bg);
    color: hsl(0 0% 100%);
  }

  .btn-copy-path:hover {
    background: var(--dp-path-hover);
    color: hsl(0 0% 100%);
  }

  .btn-copy-all,
  .btn-annotated-screenshot {
    font-size: 12px;
  }

  .copy-notification {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%) translateY(10px);
    background: var(--dp-notify-bg);
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

  /* author display 규칙이 UA [hidden] 을 덮지 않도록 하는 안전망 (1.2.1 교훈) */
  [hidden] { display: none !important; }
`

export default HistoryPanelStyles
