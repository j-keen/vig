// 자연어 메모 기능 (Ctrl+K)
// 선택된 요소에 "이렇게 바꿔줘" 같은 자연어 요청을 남기고, AI 포맷터가 그대로 전달한다.
// 선택된 요소가 없으면 페이지 전체에 대한 요청("전체 요청")을 남길 수 있다.

import hotkeys from 'hotkeys-js'
import { ChangeTracker } from './change-tracker'
import { Settings } from './settings'

const NOTE_TAG = 'visbug-note'
const HOTKEY = 'ctrl+k,command+k'

// 색상은 CSS 변수로 토큰화되어 있으며, :host([data-theme="light"]) 에서 재정의된다.
// Settings.registerPanel()이 :host 에 data-theme 과 style.opacity를 관리한다.
const NOTE_STYLES = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;

    --dpn-bg: hsl(0 0% 10%);
    --dpn-border: hsl(200 100% 55%);
    --dpn-shadow: rgba(0, 0, 0, 0.5);
    --dpn-input-bg: hsl(0 0% 15%);
    --dpn-text: hsl(0 0% 92%);
    --dpn-placeholder: hsl(0 0% 50%);
    --dpn-hint: hsl(0 0% 45%);
  }

  :host([data-theme="light"]) {
    --dpn-bg: #ffffff;
    --dpn-border: hsl(210 90% 45%);
    --dpn-shadow: rgba(20, 20, 30, 0.2);
    --dpn-input-bg: #f3f4f6;
    --dpn-text: #111111;
    --dpn-placeholder: #6b7280;
    --dpn-hint: #6b7280;
  }

  .note-box {
    background: var(--dpn-bg);
    border: 1px solid var(--dpn-border);
    border-radius: 8px;
    box-shadow: 0 4px 20px var(--dpn-shadow);
    padding: 8px;
    width: 260px;
  }

  textarea {
    all: unset;
    display: block;
    box-sizing: border-box;
    width: 100%;
    min-height: 44px;
    max-height: 140px;
    padding: 6px 8px;
    background: var(--dpn-input-bg);
    color: var(--dpn-text);
    border-radius: 4px;
    font-family: inherit;
    font-size: 12px;
    line-height: 1.4;
    resize: none;
    white-space: pre-wrap;
  }

  textarea::placeholder {
    color: var(--dpn-placeholder);
  }

  .hint {
    margin-top: 4px;
    color: var(--dpn-hint);
    font-size: 10px;
  }
`

function ensureNoteElementDefined() {
  if (customElements.get(NOTE_TAG)) return

  class VisBugNoteElement extends HTMLElement {
    constructor() {
      super()
      this._shadow = this.attachShadow({ mode: 'closed' })
    }

    connectedCallback() {
      this._shadow.innerHTML = `
        <style>${NOTE_STYLES}</style>
        <div class="note-box">
          <textarea class="note-textarea" rows="2"></textarea>
          <div class="hint">Enter 저장 · Esc 취소</div>
        </div>
      `
      this.setAttribute('popover', 'manual')
      if (this.showPopover) {
        try { this.showPopover() } catch (err) { /* noop */ }
      }

      // 테마(다크/라이트) + 투명도 - Settings 가 data-theme 속성과 style.opacity 를 관리
      this._unregisterTheme = Settings.registerPanel(this)
    }

    disconnectedCallback() {
      this._unregisterTheme && this._unregisterTheme()
      this._unregisterTheme = null
      if (this.hidePopover) {
        try { this.hidePopover() } catch (err) { /* noop */ }
      }
    }

    get textarea() {
      return this._shadow.querySelector('.note-textarea')
    }
  }

  customElements.define(NOTE_TAG, VisBugNoteElement)
}

let activeNoteEl = null
let activeCleanup = null

function closeActiveNote() {
  if (activeCleanup) {
    activeCleanup()
    activeCleanup = null
  }
  if (activeNoteEl) {
    activeNoteEl.remove()
    activeNoteEl = null
  }
}

function clampLeft(left, width) {
  const max = (typeof window !== 'undefined' ? window.innerWidth : 800) - width - 8
  return Math.max(8, Math.min(left, Math.max(8, max)))
}

// anchorRect가 있으면 그 아래에, 없으면 화면 상단 중앙에 노출한다
function openNoteEditor({ anchorRect, value, placeholder, onSave }) {
  closeActiveNote()
  ensureNoteElementDefined()

  const el = document.createElement(NOTE_TAG)
  document.body.appendChild(el)
  activeNoteEl = el

  const width = 260
  let top
  let left

  if (anchorRect) {
    top = anchorRect.bottom + 6
    left = clampLeft(anchorRect.left, width)
  } else {
    top = 90
    left = clampLeft(((typeof window !== 'undefined' ? window.innerWidth : 800) / 2) - (width / 2), width)
  }

  el.style.position = 'fixed'
  el.style.top = `${Math.max(8, top)}px`
  el.style.left = `${left}px`
  el.style.zIndex = '2147483647'

  const textarea = el.textarea
  textarea.placeholder = placeholder || ''
  textarea.value = value || ''

  const save = () => {
    const text = textarea.value.trim()
    onSave(text)
    closeActiveNote()
  }

  const onKeydown = (e) => {
    // 페이지의 다른 단축키(도구 전환 등)로 전파되지 않도록 항상 막는다
    e.stopPropagation()

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      save()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeActiveNote()
    }
  }
  const stopOnly = (e) => e.stopPropagation()

  textarea.addEventListener('keydown', onKeydown)
  textarea.addEventListener('keyup', stopOnly)
  textarea.addEventListener('keypress', stopOnly)

  const onOutsideMousedown = (e) => {
    if (!el.contains(e.target)) closeActiveNote()
  }
  // 여는 클릭/키 입력이 곧바로 닫기로 이어지지 않도록 다음 tick에 등록
  const attachOutsideHandlerId = setTimeout(() => {
    document.addEventListener('mousedown', onOutsideMousedown)
  }, 0)

  activeCleanup = () => {
    clearTimeout(attachOutsideHandlerId)
    document.removeEventListener('mousedown', onOutsideMousedown)
  }

  requestAnimationFrame(() => {
    textarea.focus()
    textarea.select()
  })

  return el
}

export function Notes(visbug) {
  const openForElement = (element) => {
    if (!element) return
    const rect = element.getBoundingClientRect()
    openNoteEditor({
      anchorRect: rect,
      value: ChangeTracker.getNote(element) || '',
      placeholder: '이 요소를 어떻게 바꾸고 싶나요? (예: 더 눈에 띄게)',
      onSave: (text) => ChangeTracker.setNote(element, text),
    })
  }

  const openForPage = () => {
    openNoteEditor({
      anchorRect: null,
      value: ChangeTracker.getPageNote() || '',
      placeholder: '전체 페이지에 대한 요청을 입력하세요',
      onSave: (text) => ChangeTracker.setPageNote(text),
    })
  }

  const onHotkey = (e) => {
    e.preventDefault()
    const selection = visbug && visbug.selectorEngine
      ? visbug.selectorEngine.selection()
      : []

    if (selection && selection.length) {
      openForElement(selection[0])
    } else {
      openForPage()
    }
  }

  hotkeys(HOTKEY, onHotkey)

  // 히스토리 패널의 ✎ 버튼에서 메모 입력창을 다시 열 수 있도록 공개 API 제공
  if (typeof window !== 'undefined') {
    window.VisBugNotes = {
      open: openForElement,
      openPage: openForPage,
    }
  }

  return () => {
    hotkeys.unbind(HOTKEY)
    closeActiveNote()
    if (typeof window !== 'undefined' && window.VisBugNotes) {
      delete window.VisBugNotes
    }
  }
}

export default Notes
