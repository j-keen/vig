import { ChangeTracker } from './change-tracker'
import { AIFormatter } from './ai-formatter'

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

// 둥근 사각형 경로 그리기 (헬퍼)
function traceRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

// 요소 하나에 대한 빨간 테두리 + 번호 배지 그리기
function drawAnnotationMark(ctx, { x, y, w, h, index }) {
  ctx.save()
  ctx.strokeStyle = '#ff0000'
  ctx.lineWidth = 2
  traceRoundedRect(ctx, x, y, w, h, 4)
  ctx.stroke()

  const label = String(index)
  ctx.font = 'bold 12px sans-serif'
  const textWidth = ctx.measureText(label).width
  const badgeSize = Math.max(16, textWidth + 8)
  const badgeX = Math.max(0, x)
  const badgeY = Math.max(0, y - badgeSize - 2)

  ctx.fillStyle = '#ff0000'
  traceRoundedRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 4)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, badgeX + badgeSize / 2, badgeY + badgeSize / 2 + 1)
  ctx.restore()
}

// 순수 함수: 스크린샷 dataUrl 위에 변경 요소의 사각형 + 번호를 그려 새 dataUrl로 반환
// rects: [{ x, y, w, h, index }] - 캡처 이미지 좌표계 기준
export function annotateImage(dataUrl, rects = []) {
  return new Promise((resolve, reject) => {
    if (!dataUrl) {
      reject(new Error('이미지 데이터가 없습니다'))
      return
    }

    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)

        rects.forEach(rect => {
          if (!rect || rect.w <= 0 || rect.h <= 0) return
          drawAnnotationMark(ctx, rect)
        })

        resolve(canvas.toDataURL('image/png'))
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다'))
    img.src = dataUrl
  })
}

// 뷰포트와 교차하는 변경/메모 요소들의 사각형 목록 생성 (ai-formatter의 번호 매김과 동일한 순서)
function buildAnnotationRects() {
  const entries = AIFormatter.getOrderedChangeEntries()
  if (typeof window === 'undefined') return []

  const vw = window.innerWidth
  const vh = window.innerHeight

  return entries
    .map(({ element, index }) => {
      if (!element || !element.isConnected || typeof element.getBoundingClientRect !== 'function') {
        return null
      }

      const rect = element.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return null
      if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= vw || rect.top >= vh) return null

      const x = Math.max(0, rect.left)
      const y = Math.max(0, rect.top)
      const w = Math.min(rect.right, vw) - x
      const h = Math.min(rect.bottom, vh) - y

      return { x, y, w, h, index }
    })
    .filter(Boolean)
}

// 뷰포트 캡처 + 변경 요소 표시(주석) 처리를 한번에 수행
export async function captureAnnotated() {
  const capture = await captureScreen()
  if (!capture.success) {
    return { success: false, message: '캡처에 실패했습니다' }
  }

  const rects = buildAnnotationRects()

  try {
    const dataUrl = await annotateImage(capture.dataUrl, rects)
    return { success: true, dataUrl, filename: capture.filename }
  } catch (err) {
    console.error('스크린샷 표시 처리 실패:', err)
    return { success: false, message: '스크린샷 표시 처리에 실패했습니다' }
  }
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

// E2E 테스트/디버깅용 - window에 노출 (도구 함수 Screenshot과 이름 충돌을 피해 ScreenshotAPI로 노출)
export const ScreenshotAPI = {
  takeScreenshot,
  captureScreen,
  copyScreenshotImage,
  copyScreenshotPath,
  captureAndCopyImage,
  annotateImage,
  captureAnnotated,
}

if (typeof window !== 'undefined') {
  window.ScreenshotAPI = ScreenshotAPI
}
