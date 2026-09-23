import {gimmeToggle} from "./contextmenu/launcher.js"
import {getColorMode} from "./contextmenu/colormode.js"
import {getColorScheme} from "./contextmenu/colorscheme.js"

var platform = typeof browser === 'undefined'
  ? chrome
  : browser

const isRestrictedUrl = (url) =>
  !!(url && (
    url.startsWith('chrome://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('chrome-extension://')
  ))

const probePageState = async (tab_id) => {
  try {
    const results = await platform.scripting.executeScript({
      target: {tabId: tab_id},
      func: () => ({
        loaded: !!document.querySelector('script[data-designpoke]'),
        injected: !!document.querySelector('vis-bug'),
      }),
    })
    const pageState = results && results[0] && results[0].result
    return {
      loaded: !!(pageState && pageState.loaded),
      injected: !!(pageState && pageState.injected),
    }
  } catch (err) {
    console.warn('DesignPoke: failed to probe page state', err)
    return { loaded: false, injected: false }
  }
}

const toggleIn = async ({id:tab_id, url}) => {
  // chrome://, edge://, about: 등 특수 페이지에서는 실행 불가
  if (isRestrictedUrl(url)) {
    console.log('이 페이지에서는 디자인 조정기를 사용할 수 없습니다.')
    return
  }

  const { loaded, injected } = await probePageState(tab_id)

  // toggle out: toolbar is currently in the page
  if (loaded && injected) {
    await platform.scripting.executeScript({
      target: {tabId: tab_id},
      files: ['toolbar/eject.js'],
    })
    return
  }

  // toggle in: script already loaded, vis-bug was removed (Esc / SW restart)
  if (loaded && !injected) {
    await platform.scripting.executeScript({
      target: {tabId: tab_id},
      files: ['toolbar/restore.js'],
    })
    getColorMode()
    getColorScheme()
    return
  }

  // fresh start in tab
  await platform.scripting.insertCSS({
    target: {tabId: tab_id},
    files: ['toolbar/bundle.css'],
  })
  await platform.scripting.executeScript({
    target: {tabId: tab_id},
    files: ['toolbar/inject.js'],
  })
  getColorMode()
  getColorScheme()
}

// Exposed for tests/debug: puppeteer evaluates this on the service worker.
globalThis.__designpokeToggle = toggleIn

gimmeToggle(toggleIn)

const respondDownloadComplete = (sendResponse, screenshotUrl, filename, path) => {
  const payload = {
    success: true,
    filename: filename,
    dataUrl: screenshotUrl,
  }
  if (path) payload.path = path
  sendResponse(payload)
}

// 스크린샷 메시지 핸들러
platform.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'TAKE_SCREENSHOT') {
    platform.tabs.captureVisibleTab(null, {format: 'png'}, (screenshotUrl) => {
      if (platform.runtime.lastError) {
        sendResponse({ success: false, error: platform.runtime.lastError.message })
        return
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const filename = `designpoke-screenshot-${timestamp}.png`

      // 저장 없이 캡처만 요청한 경우
      if (request.captureOnly) {
        sendResponse({
          success: true,
          dataUrl: screenshotUrl,
          filename: filename
        })
        return
      }

      platform.downloads.download({
        url: screenshotUrl,
        filename: filename,
        saveAs: false
      }, (downloadId) => {
        if (platform.runtime.lastError) {
          sendResponse({ success: false, error: platform.runtime.lastError.message })
          return
        }

        // 다운로드 완료 이벤트 리스너
        const onChanged = (delta) => {
          if (delta.id !== downloadId) return

          if (delta.state && delta.state.current === 'complete') {
            platform.downloads.onChanged.removeListener(onChanged)
            platform.downloads.search({id: downloadId}, (results) => {
              if (results && results[0]) {
                respondDownloadComplete(
                  sendResponse,
                  screenshotUrl,
                  filename,
                  results[0].filename
                )
              } else {
                // search 결과가 비면 path 없이 filename만으로 응답 (sendResponse hang 방지)
                respondDownloadComplete(sendResponse, screenshotUrl, filename)
              }
            })
          } else if (delta.state && delta.state.current === 'interrupted') {
            platform.downloads.onChanged.removeListener(onChanged)
            sendResponse({ success: false, error: '다운로드 중단됨' })
          }
        }

        platform.downloads.onChanged.addListener(onChanged)
      })
    })
    return true // 비동기 응답을 위해 true 반환
  }
})
