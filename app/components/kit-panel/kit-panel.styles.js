// 킷(내 킷) 탭 스타일
// 테마(dark/light)는 Settings.registerPanel 이 호스트에 심어주는 data-theme 속성이
// 유일한 기준이다. opacity 는 Settings 가 :host 에 직접 적용한다.
//
// 이 패널은 우측 사이드 패널(shell)의 light-DOM 자식으로 슬롯되는 콘텐츠다.
// 따라서 :host 는 position:fixed 가 아니라 display:block; width:100% 이며,
// 배경/테두리/스크롤은 셸이 담당한다.
export const KitPanelStyles = `
  :host {
    all: initial;
    display: block;
    width: 100%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 11px;

    --dp-bg: hsl(0 0% 10%);
    --dp-bg-2: hsl(0 0% 15%);
    --dp-bg-3: hsl(0 0% 25%);
    --dp-border: hsl(0 0% 25%);
    --dp-text: hsl(0 0% 90%);
    --dp-text-muted: hsl(0 0% 60%);
    --dp-text-dim: hsl(0 0% 70%);
    --dp-text-faint: hsl(0 0% 50%);
    --dp-accent: hsl(200 100% 60%);
    --dp-accent-strong: hsl(200 100% 70%);
    --dp-accent-bg: hsl(200 60% 40%);
    --dp-danger: hsl(0 60% 40%);
    --dp-note-text: hsl(45 90% 65%);
  }

  :host([data-theme="light"]) {
    --dp-bg: #ffffff;
    --dp-bg-2: #f3f4f6;
    --dp-bg-3: #e5e7eb;
    --dp-border: #dcdfe4;
    --dp-text: #111111;
    --dp-text-muted: #6b7280;
    --dp-text-dim: #444950;
    --dp-text-faint: #6b7280;
    --dp-accent: hsl(210 90% 42%);
    --dp-accent-strong: hsl(210 90% 36%);
    --dp-accent-bg: hsl(210 80% 46%);
    --dp-danger: hsl(0 70% 46%);
    --dp-note-text: hsl(38 85% 34%);
  }

  .panel {
    width: 100%;
    color: var(--dp-text);
    position: relative;
    padding: 8px;
    box-sizing: border-box;
  }

  button {
    font: inherit;
    cursor: pointer;
  }

  input, select {
    font: inherit;
  }

  /* ---- 상단 바 ---- */

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 6px;
  }

  .btn-save {
    flex: 1 1 auto;
    min-width: 0;
    background: var(--dp-accent-bg);
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 6px 8px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .btn-save:disabled {
    background: var(--dp-bg-3);
    color: var(--dp-text-faint);
    cursor: not-allowed;
  }

  .btn-import, .btn-export {
    background: var(--dp-bg-2);
    color: var(--dp-text-dim);
    border: 1px solid var(--dp-border);
    border-radius: 6px;
    padding: 6px 8px;
  }

  .btn-import:hover, .btn-export:hover {
    background: var(--dp-bg-3);
    color: var(--dp-text);
  }

  /* ---- 저장 폼 ---- */

  .save-form {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--dp-bg-2);
    border: 1px solid var(--dp-border);
    border-radius: 6px;
    padding: 6px;
    margin-bottom: 6px;
  }

  .save-form input, .save-form select {
    background: var(--dp-bg);
    color: var(--dp-text);
    border: 1px solid var(--dp-border);
    border-radius: 4px;
    padding: 4px 6px;
    box-sizing: border-box;
    width: 100%;
  }

  .save-actions {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
  }

  .save-actions button {
    border: 1px solid var(--dp-border);
    border-radius: 4px;
    padding: 4px 10px;
    background: transparent;
    color: var(--dp-text-dim);
  }

  .btn-confirm-save {
    background: var(--dp-accent-bg) !important;
    color: #fff !important;
    border: none !important;
  }

  /* ---- 검색 / 모드 토글 ---- */

  .search-row {
    margin-bottom: 6px;
  }

  .search-input {
    width: 100%;
    box-sizing: border-box;
    background: var(--dp-bg-2);
    color: var(--dp-text);
    border: 1px solid var(--dp-border);
    border-radius: 6px;
    padding: 5px 8px;
  }

  .mode-toggle {
    display: flex;
    gap: 6px;
    margin-bottom: 6px;
    flex-wrap: wrap;
  }

  .mode-toggle label {
    display: flex;
    align-items: center;
    gap: 3px;
    color: var(--dp-text-dim);
    cursor: pointer;
  }

  /* ---- 선택 힌트 ---- */

  .selection-hint {
    color: var(--dp-text-faint);
    text-align: center;
    padding: 8px 4px;
    font-style: italic;
    line-height: 1.4;
  }

  .selection-hint[hidden] {
    display: none;
  }

  /* ---- 목록 ---- */

  .section-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--dp-text-faint);
    letter-spacing: 0.04em;
    margin: 8px 0 4px;
  }

  .cards {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .empty-user {
    color: var(--dp-text-faint);
    font-style: italic;
    padding: 6px 2px;
  }

  .empty-user[hidden] {
    display: none;
  }

  .kit-card {
    position: relative;
    background: var(--dp-bg-2);
    border: 1px solid var(--dp-border);
    border-radius: 8px;
    padding: 6px;
    cursor: pointer;
    transition: opacity 0.15s, border-color 0.15s;
  }

  .kit-card:hover {
    border-color: var(--dp-accent);
  }

  .kit-card.dimmed {
    opacity: 0.45;
    cursor: default;
    pointer-events: none;
  }

  .preview {
    position: relative;
    width: 100%;
    height: 90px;
    max-height: 90px;
    overflow: hidden;
    pointer-events: none;
    background: var(--dp-bg-3);
    border-radius: 6px;
  }

  .preview-inner {
    position: absolute;
    top: 50%;
    left: 50%;
    transform-origin: center center;
  }

  .meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    margin-top: 6px;
  }

  .name {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--dp-text);
    font-weight: 500;
  }

  .rename-input {
    flex: 1;
    min-width: 0;
    background: var(--dp-bg);
    color: var(--dp-text);
    border: 1px solid var(--dp-accent);
    border-radius: 4px;
    padding: 2px 4px;
  }

  .kind-badge {
    flex: none;
    background: var(--dp-bg-3);
    color: var(--dp-text-dim);
    border-radius: 999px;
    padding: 1px 6px;
    font-size: 10px;
  }

  .variant-switch {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 4px;
    color: var(--dp-text-muted);
  }

  .variant-btn {
    background: transparent;
    border: none;
    color: var(--dp-text-muted);
    padding: 0 4px;
    font-size: 11px;
  }

  .variant-btn:hover {
    color: var(--dp-text);
  }

  .user-actions {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .kit-card:hover .user-actions {
    opacity: 1;
  }

  .btn-rename, .btn-delete {
    background: var(--dp-bg);
    border: 1px solid var(--dp-border);
    color: var(--dp-text-muted);
    width: 18px;
    height: 18px;
    line-height: 1;
    font-size: 11px;
    border-radius: 4px;
    padding: 0;
  }

  .btn-delete:hover {
    background: var(--dp-danger);
    color: #fff;
  }

  .btn-delete.confirm {
    background: var(--dp-danger);
    color: #fff;
    width: auto;
    padding: 0 4px;
    font-size: 9px;
  }

  .hover-mode-label {
    position: absolute;
    top: 4px;
    left: 4px;
    background: var(--dp-accent-bg);
    color: #fff;
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 9px;
  }

  .hover-mode-label[hidden] {
    display: none;
  }

  .toast {
    position: absolute;
    bottom: 4px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--dp-accent-bg);
    color: #fff;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 11px;
    white-space: nowrap;
    z-index: 1;
  }

  .toast[hidden] {
    display: none;
  }

  /* author display 규칙이 UA [hidden] 을 덮지 않도록 하는 안전망 (1.2.1 교훈) */
  [hidden] { display: none !important; }
`

export default KitPanelStyles
