// 플로팅 히스토리 패널 컴포넌트
// Floating History Panel - shows change history in human-readable format

import { HumanFormatter } from '../../features/human-formatter'
import { ChangeTracker } from '../../features/change-tracker'
import { HistoryPanelStyles } from './history-panel.styles'
import { AIFormatter } from '../../features/ai-formatter'
import { copyScreenshotImage, copyScreenshotPath } from '../../features/screenshot'

export class HistoryPanel extends HTMLElement {
  constructor() {
    super()
    this.$shadow = this.attachShadow({ mode: 'closed' })
    this.isMinimized = false
    this.isDragging = false
    this.dragOffset = { x: 0, y: 0 }
    this.updateInterval = null
    this.isCompareMode = false
    this.savedCompareStates = null
    this.showingHelp = false
  }

  connectedCallback() {
    this.$shadow.innerHTML = this.render()
    this.applyStyles()
    this.setupDragging()
    this.setupButtons()
    this.startAutoUpdate()

    // 초기 위치 설정
    this.style.position = 'fixed'
    this.style.top = '80px'
    this.style.right = '20px'
    this.style.zIndex = '2147483646'

    // popover로 최상위 레이어 유지
    this.setAttribute('popover', 'manual')
    this.showPopover && this.showPopover()
  }

  disconnectedCallback() {
    this.stopAutoUpdate()
    this.hidePopover && this.hidePopover()
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
          <span class="title">변경 내역 (<span class="count">0</span>개)</span>
          <div class="buttons">
            <button class="btn-copy-all" title="전체 복사">📋</button>
            <button class="btn-compare" title="원본/변경 비교">⇄</button>
            <button class="btn-help" title="도움말">?</button>
            <button class="btn-minimize" title="최소화">_</button>
            <button class="btn-close" title="닫기">×</button>
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

  setupDragging() {
    const header = this.$shadow.querySelector('.header')

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return

      this.isDragging = true
      const rect = this.getBoundingClientRect()
      this.dragOffset.x = e.clientX - rect.left
      this.dragOffset.y = e.clientY - rect.top
      header.style.cursor = 'grabbing'
    })

    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return

      e.preventDefault()
      this.style.left = (e.clientX - this.dragOffset.x) + 'px'
      this.style.top = (e.clientY - this.dragOffset.y) + 'px'
      this.style.right = 'auto'
    })

    document.addEventListener('mouseup', () => {
      this.isDragging = false
      const header = this.$shadow.querySelector('.header')
      if (header) header.style.cursor = 'grab'
    })
  }

  setupButtons() {
    const btnMinimize = this.$shadow.querySelector('.btn-minimize')
    const btnClose = this.$shadow.querySelector('.btn-close')
    const btnCompare = this.$shadow.querySelector('.btn-compare')
    const btnHelp = this.$shadow.querySelector('.btn-help')

    btnMinimize.addEventListener('click', () => {
      this.toggleMinimize()
    })

    btnClose.addEventListener('click', () => {
      this.style.display = 'none'
    })

    // 비교 모드 토글
    btnCompare.addEventListener('click', () => {
      this.toggleCompareMode()
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

        // 변경된 요소 삭제
        if (item.dataset.elementId) {
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

    // 히스토리 항목 클릭 시 해당 요소 선택
    this.$shadow.querySelector('.content').addEventListener('click', (e) => {
      // 버튼 클릭은 무시 (복사/삭제 버튼)
      if (e.target.classList.contains('btn-copy') || e.target.classList.contains('btn-delete')) return

      const item = e.target.closest('.history-item')
      if (!item) return

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

  toggleCompareMode() {
    const btnCompare = this.$shadow.querySelector('.btn-compare')

    if (this.isCompareMode) {
      // 변경된 상태로 복원
      if (this.savedCompareStates) {
        ChangeTracker.restoreFromCompare(this.savedCompareStates)
        this.savedCompareStates = null
      }
      this.isCompareMode = false
      btnCompare.classList.remove('active')
      btnCompare.title = '원본/변경 비교'
    } else {
      // 원본 상태로 전환
      this.savedCompareStates = ChangeTracker.toggleCompareMode(true)
      this.isCompareMode = true
      btnCompare.classList.add('active')
      btnCompare.title = '변경 상태로 복원'
    }
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

  toggleMinimize() {
    this.isMinimized = !this.isMinimized
    const content = this.$shadow.querySelector('.content')
    const btnMinimize = this.$shadow.querySelector('.btn-minimize')

    if (this.isMinimized) {
      content.style.display = 'none'
      btnMinimize.textContent = '□'
      btnMinimize.title = '복원'
    } else {
      content.style.display = 'block'
      btnMinimize.textContent = '_'
      btnMinimize.title = '최소화'
    }
  }

  startAutoUpdate() {
    // 500ms마다 업데이트
    this.updateInterval = setInterval(() => {
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
    const count = HumanFormatter.getChangeCount()
    const countEl = this.$shadow.querySelector('.count')
    const contentEl = this.$shadow.querySelector('.content')

    if (countEl) {
      countEl.textContent = count
    }

    if (contentEl) {
      contentEl.innerHTML = HumanFormatter.formatAllAsHTML()
    }
  }

  // 패널 표시
  show() {
    this.style.display = 'block'
    this.showPopover && this.showPopover()
  }

  // 패널 숨기기
  hide() {
    this.style.display = 'none'
    this.hidePopover && this.hidePopover()
  }
}

customElements.define('visbug-history', HistoryPanel)
