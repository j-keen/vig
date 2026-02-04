;(function() {
  if (document.querySelector('vis-bug')) return

  var platform = typeof browser === 'undefined'
    ? chrome
    : browser

  const script = document.createElement('script')
  script.type = 'module'
  script.src = platform.runtime.getURL('toolbar/bundle.min.js')
  document.body.appendChild(script)

  const visbug = document.createElement('vis-bug')

  const src_path = platform.runtime.getURL(`tuts/guides.gif`)
  visbug.setAttribute('tutsBaseURL', src_path.slice(0, src_path.lastIndexOf('/')))

  document.body.prepend(visbug)

  platform.runtime.onMessage.addListener(request => {
    if (request.action === 'COLOR_MODE')
      visbug.setAttribute('color-mode', request.params.mode)
    else if (request.action === 'COLOR_SCHEME')
      visbug.setAttribute("color-scheme", request.params.mode)
  })

  // 페이지 -> 콘텐츠 스크립트 -> 서비스 워커 브릿지 (postMessage 사용)
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return
    if (event.data?.type !== 'VISBUG_SCREENSHOT_REQUEST') return

    try {
      const response = await platform.runtime.sendMessage({ action: 'TAKE_SCREENSHOT' })
      window.postMessage({ type: 'VISBUG_SCREENSHOT_RESPONSE', data: response }, '*')
    } catch (err) {
      window.postMessage({ type: 'VISBUG_SCREENSHOT_RESPONSE', data: { success: false, error: err.message } }, '*')
    }
  })
})()
