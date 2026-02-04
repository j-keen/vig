import {gimmeToggle} from "./contextmenu/launcher.js"
import {getColorMode} from "./contextmenu/colormode.js"
import {getColorScheme} from "./contextmenu/colorscheme.js"

const state = {
  loaded:   {},
  injected: {},
}

var platform = typeof browser === 'undefined'
  ? chrome
  : browser

const toggleIn = ({id:tab_id, url}) => {
  // chrome://, edge://, about: 등 특수 페이지에서는 실행 불가
  if (url && (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:') || url.startsWith('chrome-extension://'))) {
    console.log('이 페이지에서는 디자인 조정기를 사용할 수 없습니다.')
    return
  }

  // toggle out: it's currently loaded and injected
  if (state.loaded[tab_id] && state.injected[tab_id]) {
    platform.scripting.executeScript({
      target: {tabId: tab_id},
      files: ['toolbar/eject.js'],
    })
    state.injected[tab_id] = false
  }

  // toggle in: it's loaded and needs injected
  else if (state.loaded[tab_id] && !state.injected[tab_id]) {
    platform.scripting.executeScript({
      target: {tabId: tab_id},
      files: ['toolbar/restore.js'],
    })
    state.injected[tab_id] = true
    getColorMode()
    getColorScheme()
  }

  // fresh start in tab
  else {
    platform.scripting.insertCSS({
      target: {tabId: tab_id},
      files: ['toolbar/bundle.css' ],
    })
    platform.scripting.executeScript({
      target: {tabId: tab_id},
      files: ['toolbar/inject.js'],
    })

    state.loaded[tab_id]    = true
    state.injected[tab_id]  = true
    getColorMode()
    getColorScheme()
  }

  platform.tabs.onUpdated.addListener(function(tabId) {
    if (tabId === tab_id)
      state.loaded[tabId] = false
  })
}

gimmeToggle(toggleIn)

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
                sendResponse({
                  success: true,
                  path: results[0].filename,
                  filename: filename
                })
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
