import { ChangeTracker } from './change-tracker'

// 스크린샷 촬영 및 저장
export async function takeScreenshot() {
  return new Promise((resolve) => {
    // 응답 리스너 등록
    const handleResponse = (event) => {
      if (event.data?.type !== 'VISBUG_SCREENSHOT_RESPONSE') return

      window.removeEventListener('message', handleResponse)
      const response = event.data.data

      if (response && response.success) {
        const filePath = response.path || response.filename

        // 경로/파일명 클립보드에 복사
        navigator.clipboard.writeText(filePath)
          .then(() => console.log('클립보드 복사 성공:', filePath))
          .catch(err => console.error('클립보드 복사 실패:', err))

        // 히스토리에 기록
        ChangeTracker.addScreenshot({
          filename: response.filename,
          path: filePath,
          timestamp: Date.now()
        })

        // 시각적 피드백 - 화면 깜빡임
        flashScreen()

        resolve({
          success: true,
          filename: response.filename,
          path: filePath
        })
      } else {
        console.error('스크린샷 실패:', response?.error || 'Unknown error')
        resolve({ success: false, error: response?.error })
      }
    }

    window.addEventListener('message', handleResponse)

    // 콘텐츠 스크립트에 스크린샷 요청
    window.postMessage({ type: 'VISBUG_SCREENSHOT_REQUEST' }, '*')

    // 타임아웃 (5초)
    setTimeout(() => {
      window.removeEventListener('message', handleResponse)
      resolve({ success: false, error: 'Timeout' })
    }, 5000)
  })
}

// 화면 깜빡임 효과
function flashScreen() {
  const flash = document.createElement('div')
  flash.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: white;
    opacity: 0.6;
    z-index: 2147483647;
    pointer-events: none;
  `
  document.body.appendChild(flash)

  setTimeout(() => {
    flash.style.transition = 'opacity 0.2s'
    flash.style.opacity = '0'
    setTimeout(() => flash.remove(), 200)
  }, 50)
}

// 도구로서의 Screenshot 함수 (호환성 유지)
export function Screenshot(node, page) {
  takeScreenshot()
  return () => {}
}
