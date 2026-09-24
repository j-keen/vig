;(function() {
  if (document.querySelector('vis-bug')) return

  var platform = typeof browser === 'undefined'
    ? chrome
    : browser

  const script = document.createElement('script')
  script.type = 'module'
  script.src = platform.runtime.getURL('toolbar/bundle.min.js')
  script.setAttribute('data-designpoke', '')
  document.body.appendChild(script)

  const visbug = document.createElement('vis-bug')

  const src_path = platform.runtime.getURL(`tuts/guides.gif`)
  visbug.setAttribute('tutsBaseURL', src_path.slice(0, src_path.lastIndexOf('/')))

  document.body.prepend(visbug)

  platform.runtime.onMessage.addListener(request => {
    const live = document.querySelector('vis-bug')
    if (!live) return
    if (request.action === 'COLOR_MODE')
      live.setAttribute('color-mode', request.params.mode)
    else if (request.action === 'COLOR_SCHEME')
      live.setAttribute("color-scheme", request.params.mode)
  })

  const SCREENSHOT_HIDE_SELECTOR = [
    'vis-bug',
    'visbug-handles',
    'visbug-label',
    'visbug-hover',
    'visbug-history',
    'visbug-distance',
    'visbug-gridlines',
    'visbug-depth-highlight',
  ].join(', ')

  const nextAnimationFrames = (count) => new Promise((resolve) => {
    const tick = () => {
      if (--count <= 0) resolve()
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  // 설정 저장 브릿지: 페이지(world) -> 콘텐츠 스크립트 -> chrome.storage.local (전역 설정)
  const SETTINGS_KEY = 'designpoke.settings'
  window.addEventListener('message', async (event) => {
    if (event.source !== window || !event.data) return
    if (event.data.type === 'VISBUG_SETTINGS_GET') {
      try {
        const stored = await platform.storage.local.get(SETTINGS_KEY)
        window.postMessage({ type: 'VISBUG_SETTINGS_GET_RESPONSE', settings: stored[SETTINGS_KEY] || null }, '*')
      } catch (err) {
        window.postMessage({ type: 'VISBUG_SETTINGS_GET_RESPONSE', settings: null, error: err.message }, '*')
      }
    }
    else if (event.data.type === 'VISBUG_SETTINGS_SET') {
      try {
        await platform.storage.local.set({ [SETTINGS_KEY]: event.data.settings })
        window.postMessage({ type: 'VISBUG_SETTINGS_SET_RESPONSE', ok: true }, '*')
      } catch (err) {
        window.postMessage({ type: 'VISBUG_SETTINGS_SET_RESPONSE', ok: false, error: err.message }, '*')
      }
    }
  })

  // 페이지 -> 콘텐츠 스크립트 -> 서비스 워커 브릿지 (postMessage 사용)
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return
    if (event.data?.type !== 'VISBUG_SCREENSHOT_REQUEST') return

    const hidden = []
    try {
      document.querySelectorAll(SCREENSHOT_HIDE_SELECTOR).forEach((el) => {
        hidden.push({ el, visibility: el.style.visibility })
        el.style.visibility = 'hidden'
      })
      await nextAnimationFrames(2)

      const options = event.data.options || {}
      const response = await platform.runtime.sendMessage({
        action: 'TAKE_SCREENSHOT',
        captureOnly: options.captureOnly || false,
      })
      window.postMessage({ type: 'VISBUG_SCREENSHOT_RESPONSE', data: response }, '*')
    } catch (err) {
      window.postMessage({ type: 'VISBUG_SCREENSHOT_RESPONSE', data: { success: false, error: err.message } }, '*')
    } finally {
      hidden.forEach(({ el, visibility }) => {
        try { el.style.visibility = visibility } catch (_) {}
      })
    }
  })
})()
