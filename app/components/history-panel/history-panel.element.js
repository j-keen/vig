// 플로팅 히스토리 패널 컴포넌트
// Floating History Panel - shows change history in human-readable format

import { HumanFormatter } from '../../features/human-formatter'
import { ChangeTracker } from '../../features/change-tracker'
import { HistoryPanelStyles } from './history-panel.styles'
import { AIFormatter } from '../../features/ai-formatter'
import { copyScreenshotImage, copyScreenshotPath, captureAnnotated } from '../../features/screenshot'
import { Settings } from '../../features/settings'

export class HistoryPanel extends HTMLElement {
  constructor() {
    super()
    this.$shadow = this.attachShadow({ mode: 'closed' })
    this.updateInterval = null
    this._unregisterTheme = null

    // 원본 보기(비교) 상태 - 누르고 있기(hold) + `\` 토글 두 입력을 함께 지원
    this._compareHold = false
    this._compareToggle = false
    this._compareApplied = false
    this.savedCompareStates = null

    // 히스토리 항목 호버 타임트래블 미리보기 상태
    this._hoveredItem = null
    this._activePreview = null

    this.showingHelp = false

    this._onDocumentMouseUp = this._onDocumentMouseUp.bind(this)
    this._onDocumentKeydown = this._onDocumentKeydown.bind(this)
  }

  connectedCallback() {
    this.$shadow.innerHTML = this.render()
    this.applyStyles()
    this.setupButtons()
    this.startAutoUpdate()

    document.addEventListener('mouseup', this._onDocumentMouseUp)
    document.addEventListener('touchend', this._onDocumentMouseUp)
    document.addEventListener('keydown', this._onDocumentKeydown)

    // 테마(다크/라이트) + 투명도 - Settings 가 data-theme 속성과 style.opacity 를 관리
    this._unregisterTheme = Settings.registerPanel(this)
  }

  disconnectedCallback() {
    this.stopAutoUpdate()
    this._clearPreview()
    if (this._compareApplied) this._setCompareApplied(false)
    document.removeEventListener('mouseup', this._onDocumentMouseUp)
    document.removeEventListener('touchend', this._onDocumentMouseUp)
    document.removeEventListener('keydown', this._onDocumentKeydown)
    this._unregisterTheme && this._unregisterTheme()
  }

  // 마우스/터치 릴리즈 - 누르고 있던 원본 보기 해제
  _onDocumentMouseUp() {
    if (this._compareHold) {
      this._compareHold = false
      this._syncCompareVisual()
    }
  }

  // `\` 키 - 원본 보기 토글 (입력창에 포커스가 있을 때는 무시)
  _onDocumentKeydown(e) {
    if (e.key !== '\\') return
    const target = e.target
    const tag = target && target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (target && target.isContentEditable)) return

    e.preventDefault()
    this._compareToggle = !this._compareToggle
    this._syncCompareVisual()
  }

  // 원본 보기 상태(hold || toggle)에 맞춰 실제 적용 여부를 동기화
  _syncCompareVisual() {
    const shouldBeActive = this._compareHold || this._compareToggle
    if (shouldBeActive !== this._compareApplied) {
      this._setCompareApplied(shouldBeActive)
    }
  }

  _setCompareApplied(active) {
    const btnCompare = this.$shadow.querySelector('.btn-compare')

    if (active) {
      this.savedCompareStates = ChangeTracker.toggleCompareMode(true)
      this._compareApplied = true
      if (btnCompare) btnCompare.classList.add('active')
    } else {
      if (this.savedCompareStates) {
        ChangeTracker.restoreFromCompare(this.savedCompareStates)
        this.savedCompareStates = null
      }
      this._compareApplied = false
      if (btnCompare) btnCompare.classList.remove('active')
    }
  }

  applyStyles() {
    const style = document.createElement('style')
    style.textContent = HistoryPanelStyles
    this.$shadow.appendChild(style)
  }

  render() {
    return `
      <div class="panel">
        <div class="header">
          <div class="header-title">
            <span class="title">변경 이력 <span class="count">0</span></span>
          </div>
          <div class="buttons">
            <button class="btn-copy-all" title="전체 복사">📋</button>
            <button class="btn-annotated-screenshot" title="표시 스크린샷 복사">🖍️</button>
            <button class="btn-compare" title="원본 보기 (누르고 있기 또는 \\ 키)">⇄</button>
            <button class="btn-help" title="도움말">?</button>
          </div>
        </div>
        <div class="content">
          <div class="history-empty">변경 내역이 없습니다</div>
        </div>
        <div class="help-content" style="display: none;">
          <div class="help-section">
            <div class="help-title">단축키 안내</div>
            <div class="help-item"><span class="key">Ctrl+Z</span> 되돌리기</div>
            <div class="help-item"><span class="key">Ctrl+Shift+Z</span> 다시 실행</div>
            <div class="help-item"><span class="key">G</span> 안내선</div>
            <div class="help-item"><span class="key">L</span> 위치 조정 (방향키)</div>
            <div class="help-item"><span class="key">M</span> 바깥 여백</div>
            <div class="help-item"><span class="key">P</span> 안쪽 여백</div>
            <div class="help-item"><span class="key">A</span> 정렬 (Flexbox)</div>
            <div class="help-item"><span class="key">V</span> DOM 이동</div>
            <div class="help-item"><span class="key">C</span> AI로 복사</div>
            <div class="help-item"><span class="key">Delete</span> 요소 삭제</div>
            <div class="help-item"><span class="key">Alt+Delete</span> 스타일만 제거</div>
            <div class="help-item"><span class="key">Shift+드래그</span> 독립 이동</div>
            <div class="help-item"><span class="key">Ctrl+Shift+S</span> 스크린샷</div>
          </div>
        </div>
      </div>
    `
  }


  setupButtons() {
    const btnCompare = this.$shadow.querySelector('.btn-compare')
    const btnHelp = this.$shadow.querySelector('.btn-help')

    // 원본 보기 - 누르고 있는 동안만 원본 스타일 표시 (클릭 토글이 아님, `\` 키로도 토글 가능)
    btnCompare.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this._compareHold = true
      this._syncCompareVisual()
    })
    btnCompare.addEventListener('touchstart', (e) => {
      e.preventDefault()
      this._compareHold = true
      this._syncCompareVisual()
    }, { passive: false })
    btnCompare.addEventListener('mouseleave', () => {
      if (this._compareHold) {
        this._compareHold = false
        this._syncCompareVisual()
      }
    })

    // 도움말 토글
    btnHelp.addEventListener('click', () => {
      this.toggleHelp()
    })

    // 전체 복사 버튼
    const btnCopyAll = this.$shadow.querySelector('.btn-copy-all')
    btnCopyAll.addEventListener('click', async () => {
      const result = await AIFormatter.copyAllChangesForAI()
      if (result.success) {
        this.showCopyNotification('전체 복사 완료')
      }
    })

    // 표시(주석) 스크린샷 복사 버튼
    const btnAnnotatedScreenshot = this.$shadow.querySelector('.btn-annotated-screenshot')
    btnAnnotatedScreenshot.addEventListener('click', async () => {
      const annotated = await captureAnnotated()
      if (!annotated.success) {
        this.showCopyNotification(annotated.message || '캡처에 실패했습니다')
        return
      }
      const result = await copyScreenshotImage(annotated.dataUrl)
      this.showCopyNotification(result.success ? '표시 스크린샷 복사 완료' : result.message)
    })

    // 삭제 버튼 이벤트 위임
    this.$shadow.querySelector('.content').addEventListener('click', async (e) => {
      // 스크린샷 이미지 복사 버튼
      if (e.target.classList.contains('btn-copy-image')) {
        const item = e.target.closest('.history-item')
        if (!item || !item.dataset.screenshotId) return

        const id = parseInt(item.dataset.screenshotId)
        const screenshots = ChangeTracker.getScreenshots()
        const screenshot = screenshots.find(s => s.id === id)

        if (screenshot?.dataUrl) {
          const result = await copyScreenshotImage(screenshot.dataUrl)
          this.showCopyNotification(result.success ? '이미지 복사 완료' : result.message)
        } else {
          this.showCopyNotification('이미지 데이터 없음')
        }
        return
      }

      // 스크린샷 경로 복사 버튼
      if (e.target.classList.contains('btn-copy-path')) {
        const item = e.target.closest('.history-item')
        if (!item || !item.dataset.screenshotId) return

        const id = parseInt(item.dataset.screenshotId)
        const screenshots = ChangeTracker.getScreenshots()
        const screenshot = screenshots.find(s => s.id === id)

        if (screenshot?.path) {
          const result = await copyScreenshotPath(screenshot.path)
          this.showCopyNotification(result.success ? '경로 복사 완료' : result.message)
        } else {
          this.showCopyNotification('경로 정보 없음')
        }
        return
      }

      // 메모 수정 버튼 (요소별 메모 / 전체 요청)
      if (e.target.classList.contains('btn-edit-note')) {
        if (e.target.dataset.pageNoteEdit !== undefined) {
          if (window.VisBugNotes && typeof window.VisBugNotes.openPage === 'function') {
            window.VisBugNotes.openPage()
          }
          return
        }

        if (e.target.dataset.elementId !== undefined) {
          const id = parseInt(e.target.dataset.elementId)
          const allChanges = ChangeTracker.getAllChanges()
          for (const [element] of allChanges) {
            if (ChangeTracker.getElementId(element) === id) {
              if (window.VisBugNotes && typeof window.VisBugNotes.open === 'function') {
                window.VisBugNotes.open(element)
              }
              break
            }
          }
        }
        return
      }

      // 여기로 되돌리기 버튼 (타임트래블)
      if (e.target.classList.contains('btn-revert')) {
        const item = e.target.closest('.history-item')
        if (!item || item.dataset.historyIndex === undefined) return

        const targetIndex = parseInt(item.dataset.historyIndex)
        this._clearPreview()

        const snapshotLength = ChangeTracker.getUndoStackSnapshot().length
        const undosNeeded = snapshotLength - targetIndex

        for (let i = 0; i < undosNeeded; i++) {
          if (!ChangeTracker.undo()) break
        }

        this.updateContent()
        return
      }

      // 개별 복사 버튼 (변경/삭제 항목)
      if (e.target.classList.contains('btn-copy')) {
        const item = e.target.closest('.history-item')
        if (!item) return

        let text = ''
        if (item.dataset.elementId) {
          const id = parseInt(item.dataset.elementId)
          text = AIFormatter.formatSingleForAI(id) || ''
        } else if (item.dataset.deletedIndex !== undefined) {
          const index = parseInt(item.dataset.deletedIndex)
          const deletedElements = ChangeTracker.getDeletedElements()
          if (deletedElements[index]) {
            text = AIFormatter.formatDeletedForAI(deletedElements[index])
          } else {
            const nameEl = item.querySelector('.history-name')
            text = nameEl ? nameEl.textContent + ' → [삭제됨]' : '[삭제됨]'
          }
        }

        if (text) {
          await AIFormatter.copyToClipboard(text)
          this.showCopyNotification('복사 완료')
        }
        return
      }

      if (e.target.classList.contains('btn-delete')) {
        const item = e.target.closest('.history-item')
        if (!item) return

        // 전체 요청(페이지 메모) 삭제
        if (item.dataset.pageNote !== undefined) {
          ChangeTracker.setPageNote('')
        }
        // 변경된 요소 삭제
        else if (item.dataset.elementId) {
          const id = parseInt(item.dataset.elementId)
          ChangeTracker.removeTrackedById(id)
        }
        // 삭제된 요소 기록 삭제
        else if (item.dataset.deletedIndex !== undefined) {
          const index = parseInt(item.dataset.deletedIndex)
          ChangeTracker.removeDeletedByIndex(index)
        }
        // 스크린샷 삭제
        else if (item.dataset.screenshotId) {
          const id = parseInt(item.dataset.screenshotId)
          ChangeTracker.removeScreenshotById(id)
        }

        // 즉시 UI 업데이트
        this.updateContent()
      }
    })

    // 히스토리 항목 호버 시 그 시점 상태를 미리보기 (스타일/텍스트만 임시 반영, 추적 상태는 불변)
    const contentEl = this.$shadow.querySelector('.content')
    contentEl.addEventListener('mouseover', (e) => {
      const item = e.target.closest('.history-item')
      if (!item || item.dataset.historyIndex === undefined) return
      if (this._hoveredItem === item) return

      this._hoveredItem = item
      this._previewAt(parseInt(item.dataset.historyIndex))
    })
    contentEl.addEventListener('mouseout', (e) => {
      const item = e.target.closest('.history-item')
      if (!item || item !== this._hoveredItem) return
      if (item.contains(e.relatedTarget)) return

      this._hoveredItem = null
      this._clearPreview()
    })

    // 히스토리 항목 클릭 시 해당 요소 선택
    this.$shadow.querySelector('.content').addEventListener('click', (e) => {
      // 버튼 클릭 및 메모 전용 항목은 무시
      if (e.target.closest('button')) return

      const item = e.target.closest('.history-item')
      if (!item || item.dataset.pageNote !== undefined) return

      // 변경된 요소 선택
      if (item.dataset.elementId) {
        const id = parseInt(item.dataset.elementId)
        // ChangeTracker에서 해당 요소 찾기
        const allChanges = ChangeTracker.getAllChanges()
        for (const [element] of allChanges) {
          if (ChangeTracker.getElementId(element) === id) {
            // 요소가 DOM에 있는지 확인
            if (element.isConnected) {
              this.dispatchEvent(new CustomEvent('select-element', {
                detail: { element },
                bubbles: true,
                composed: true
              }))
              // 요소로 스크롤
              element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
            break
          }
        }
      }
    }, true)
  }

  // 히스토리 항목 타임트래블 미리보기: undo 스택에서 targetIndex 이후 커밋들을
  // 역순으로 되돌려 "그 시점 직후" 상태를 화면에 임시로 반영한다.
  // trackedElements/textChangedElements 등 추적 상태(Map)는 전혀 건드리지 않는다.
  _previewAt(targetIndex) {
    this._clearPreview()

    const snapshot = ChangeTracker.getUndoStackSnapshot()
    const touched = new Set()
    const restoreOps = []

    for (let i = snapshot.length - 1; i > targetIndex; i--) {
      const entry = snapshot[i]
      if (!entry) continue

      if (entry.type === 'style') {
        const { element, originalInline } = entry
        if (!element || !originalInline) continue

        if (!touched.has(element)) {
          touched.add(element)
          const saved = {}
          Object.keys(originalInline).forEach(prop => {
            saved[prop] = element.style[prop] || ''
          })
          restoreOps.push({ kind: 'style', element, saved })
        }

        Object.keys(originalInline).forEach(prop => {
          element.style[prop] = originalInline[prop] || ''
        })
      } else if (entry.type === 'text') {
        const { element, previousText } = entry
        if (!element) continue

        if (!touched.has(element)) {
          touched.add(element)
          restoreOps.push({ kind: 'text', element, saved: element.textContent })
        }

        element.textContent = previousText
      } else if (entry.type === 'deletion') {
        const { element, parent, nextSibling } = entry
        if (!element || !parent || !parent.isConnected || element.isConnected) continue

        const anchor = nextSibling && nextSibling.isConnected ? nextSibling : null
        parent.insertBefore(element, anchor)
        restoreOps.push({ kind: 'deletion-insert', element })
      }
    }

    this._activePreview = { restoreOps }
  }

  // 미리보기 해제: 실제(현재) 상태로 복귀
  _clearPreview() {
    if (!this._activePreview) return

    const { restoreOps } = this._activePreview
    for (let i = restoreOps.length - 1; i >= 0; i--) {
      const op = restoreOps[i]
      if (op.kind === 'style') {
        Object.keys(op.saved).forEach(prop => {
          op.element.style[prop] = op.saved[prop]
        })
      } else if (op.kind === 'text') {
        op.element.textContent = op.saved
      } else if (op.kind === 'deletion-insert') {
        if (op.element.isConnected) op.element.remove()
      }
    }

    this._activePreview = null
  }

  // 렌더링된 히스토리 항목에 undo 스택 상의 위치(data-history-index)를 부여한다
  _annotateHistoryIndices(contentEl) {
    const snapshot = ChangeTracker.getUndoStackSnapshot()
    const lastStyleOrTextIndex = new Map()
    const deletionIndexById = new Map()

    snapshot.forEach((entry, i) => {
      if (entry.type === 'style' || entry.type === 'text') {
        lastStyleOrTextIndex.set(entry.element, i)
      } else if (entry.type === 'deletion') {
        deletionIndexById.set(entry.deletionId, i)
      }
    })

    const allChanges = ChangeTracker.getAllChanges()
    contentEl.querySelectorAll('.history-item[data-element-id]').forEach(item => {
      const id = parseInt(item.dataset.elementId)
      for (const [element] of allChanges) {
        if (ChangeTracker.getElementId(element) === id) {
          if (lastStyleOrTextIndex.has(element)) {
            item.dataset.historyIndex = lastStyleOrTextIndex.get(element)
          }
          break
        }
      }
    })

    const deletedElements = ChangeTracker.getDeletedElements()
    contentEl.querySelectorAll('.history-item[data-deleted-index]').forEach(item => {
      const idx = parseInt(item.dataset.deletedIndex)
      const deleted = deletedElements[idx]
      if (deleted && deletionIndexById.has(deleted.deletionId)) {
        item.dataset.historyIndex = deletionIndexById.get(deleted.deletionId)
      }
    })
  }

  toggleHelp() {
    const content = this.$shadow.querySelector('.content')
    const helpContent = this.$shadow.querySelector('.help-content')
    const btnHelp = this.$shadow.querySelector('.btn-help')

    this.showingHelp = !this.showingHelp

    if (this.showingHelp) {
      content.style.display = 'none'
      helpContent.style.display = 'block'
      btnHelp.classList.add('active')
    } else {
      content.style.display = 'block'
      helpContent.style.display = 'none'
      btnHelp.classList.remove('active')
    }
  }

  showCopyNotification(message) {
    let notification = this.$shadow.querySelector('.copy-notification')
    if (!notification) {
      notification = document.createElement('div')
      notification.className = 'copy-notification'
      this.$shadow.querySelector('.panel').appendChild(notification)
    }
    notification.textContent = message
    notification.classList.add('show')
    setTimeout(() => {
      notification.classList.remove('show')
    }, 1500)
  }

  startAutoUpdate() {
    // 500ms마다 업데이트 (단, 항목을 호버해 미리보기 중이면 재렌더링을 건너뛴다)
    this.updateInterval = setInterval(() => {
      if (this._hoveredItem) return
      this.updateContent()
    }, 500)
  }

  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  updateContent() {
    // 재렌더링 전에는 항상 활성 미리보기를 해제해 실 상태를 반영해야 한다
    this._hoveredItem = null
    this._clearPreview()

    const count = HumanFormatter.getChangeCount()
    const countEl = this.$shadow.querySelector('.count')
    const contentEl = this.$shadow.querySelector('.content')

    if (countEl) {
      countEl.textContent = count
    }

    if (contentEl) {
      contentEl.innerHTML = HumanFormatter.formatAllAsHTML()
      this._annotateHistoryIndices(contentEl)
    }
  }

}

customElements.define('visbug-history', HistoryPanel)
