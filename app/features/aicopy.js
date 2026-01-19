// AI로 복사 기능
// AI Copy Feature - copies changes in AI-friendly format

import $ from 'blingblingjs'
import { ChangeTracker } from './change-tracker'
import { AIFormatter, copyAllChangesForAI, formatAllForAI } from './ai-formatter'

export function AICopy(visbug) {
  // Show notification
  const showNotification = (message, type = 'success') => {
    // Remove existing notification
    const existing = document.querySelector('visbug-notification')
    if (existing) existing.remove()

    const notification = document.createElement('div')
    notification.className = 'visbug-notification'
    notification.textContent = message
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideUp 0.3s ease;
    `

    // Add animation style
    if (!document.querySelector('#visbug-notification-style')) {
      const style = document.createElement('style')
      style.id = 'visbug-notification-style'
      style.textContent = `
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `
      document.head.appendChild(style)
    }

    document.body.appendChild(notification)

    // Auto remove
    setTimeout(() => {
      notification.style.opacity = '0'
      notification.style.transition = 'opacity 0.3s'
      setTimeout(() => notification.remove(), 300)
    }, 2500)
  }

  // Copy handler
  const handleCopy = async (e) => {
    // Alt + click = clear all
    if (e && e.altKey) {
      ChangeTracker.clearAll()
      showNotification('변경 이력이 초기화되었습니다', 'info')
      return
    }

    const result = await copyAllChangesForAI()

    if (result.success) {
      showNotification(result.message, 'success')
      console.log('AI로 복사됨:\n' + result.content)
    } else {
      showNotification(result.message, result.count === 0 ? 'info' : 'error')
    }
  }

  // Setup
  handleCopy()

  // Return cleanup function
  return () => {
    // No cleanup needed for this feature
  }
}

// Hook into position changes to track them
export function trackPositionChange(element) {
  ChangeTracker.captureOriginal(element)
}

export function updateTrackedPosition(element) {
  ChangeTracker.updateCurrent(element)
}

// AI 복사 버튼에 호버 툴팁 설정
export function setupAICopyTooltip(shadowRoot) {
  const aicopyButton = shadowRoot.querySelector('[data-tool="aicopy"]')
  if (!aicopyButton) return

  const aside = aicopyButton.querySelector('aside')
  if (!aside) return

  // 원본 내용 저장
  const originalContent = aside.innerHTML

  aicopyButton.addEventListener('mouseenter', () => {
    const formatted = formatAllForAI()
    const count = ChangeTracker.getTrackedCount()

    if (count === 0) {
      aside.innerHTML = `
        <div style="padding: 12px; min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #888;">변경 내역</h3>
          <p style="margin: 0; color: #666; font-size: 12px;">변경사항이 없습니다</p>
        </div>
      `
    } else {
      const lines = formatted.split('\n').map(line =>
        `<div style="padding: 4px 0; font-size: 11px; font-family: monospace; border-bottom: 1px solid rgba(255,255,255,0.1);">${escapeHtml(line)}</div>`
      ).join('')

      aside.innerHTML = `
        <div style="padding: 12px; min-width: 250px; max-width: 400px; max-height: 300px; overflow-y: auto;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; display: flex; justify-content: space-between;">
            <span>변경 내역</span>
            <span style="color: #4CAF50;">${count}개</span>
          </h3>
          ${lines}
          <p style="margin: 8px 0 0 0; font-size: 10px; color: #888;">클릭하면 복사 / Alt+클릭하면 초기화</p>
        </div>
      `
    }
  })

  aicopyButton.addEventListener('mouseleave', () => {
    // 원래 내용으로 복원
    aside.innerHTML = originalContent
  })
}

// HTML 이스케이프 함수
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export default AICopy
