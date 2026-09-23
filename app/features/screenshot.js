import { ChangeTracker } from './change-tracker'

// 스크린샷 촬영 및 저장
export async function takeScreenshot() {
  return new Promise((resolve) => {
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

        // 히스토리에 기록 (dataUrl 포함)
        ChangeTracker.addScreenshot({
          filename: response.filename,
          path: filePath,
          dataUrl: response.dataUrl || null,
          timestamp: Date.now()
        })

        // 시각적 피드백 - 화면 깜빡임
        flashScreen()

        resolve({
          success: true,
          filename: response.filename,
          path: filePath,
          dataUrl: response.dataUrl || null
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

// 캡처만 수행 (저장 안 함, dataUrl만 반환)
export async function captureScreen() {
  return new Promise((resolve) => {
    const handleResponse = (event) => {
      if (event.data?.type !== 'VISBUG_SCREENSHOT_RESPONSE') return

      window.removeEventListener('message', handleResponse)
      const response = event.data.data

      if (response && response.success) {
        resolve({
          success: true,
          dataUrl: response.dataUrl,
          filename: response.filename
        })
      } else {
        resolve({ success: false, error: response?.error })
      }
    }

    window.addEventListener('message', handleResponse)

    window.postMessage({
      type: 'VISBUG_SCREENSHOT_REQUEST',
      options: { captureOnly: true }
    }, '*')

    setTimeout(() => {
      window.removeEventListener('message', handleResponse)
      resolve({ success: false, error: 'Timeout' })
    }, 5000)
  })
}

// data URL을 Blob으로 변환
function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)[1]
  const binary = atob(base64)
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i)
  }
  return new Blob([array], { type: mime })
}

// 이미지를 클립보드에 복사
export async function copyScreenshotImage(dataUrl) {
  if (!dataUrl) {
    return { success: false, message: '이미지 데이터가 없습니다' }
  }

  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return {
      success: false,
      message: 'https 또는 localhost에서만 이미지 복사 가능',
    }
  }

  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard || !navigator.clipboard.write) {
    return {
      success: false,
      message: 'https 또는 localhost에서만 이미지 복사 가능',
    }
  }

  try {
    const blob = dataUrlToBlob(dataUrl)
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ])
    return { success: true, message: '이미지가 클립보드에 복사되었습니다' }
  } catch (err) {
    console.error('이미지 복사 실패:', err)
    return { success: false, message: '이미지 복사에 실패했습니다' }
  }
}

// 경로를 클립보드에 복사
export async function copyScreenshotPath(path) {
  if (!path) {
    return { success: false, message: '경로 정보가 없습니다' }
  }

  try {
    await navigator.clipboard.writeText(path)
    return { success: true, message: '경로가 클립보드에 복사되었습니다' }
  } catch (err) {
    console.error('경로 복사 실패:', err)
    return { success: false, message: '경로 복사에 실패했습니다' }
  }
}

// 캡처 후 이미지 복사 (캡처+복사 원스텝)
export async function captureAndCopyImage() {
  const result = await captureScreen()
  if (!result.success) {
    return { success: false, message: '캡처에 실패했습니다' }
  }

  flashScreen()

  // 히스토리에 기록
  ChangeTracker.addScreenshot({
    filename: result.filename,
    path: null,
    dataUrl: result.dataUrl,
    timestamp: Date.now()
  })

  return copyScreenshotImage(result.dataUrl)
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
