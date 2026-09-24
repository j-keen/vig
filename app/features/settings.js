// DesignPoke 전역 설정 저장소
//   theme: 'auto' | 'dark' | 'light'
//   opacity: 0.3 ~ 1  (모든 DesignPoke 패널에 적용)
//   positions: { [panelKey]: { left, top } }  (패널 위치 기억)
//
// 저장 위치: 확장 환경에서는 inject.js 브릿지(postMessage)를 통해 chrome.storage.local (전역),
//            샌드박스/브릿지 없음이면 localStorage (사이트별) 로 폴백.
//
// 사용법:
//   import { Settings } from '../features/settings'
//   Settings.registerPanel(hostEl)            // data-theme 속성과 opacity 를 자동 적용·갱신
//   Settings.get().theme / Settings.set({ theme: 'light' })
//   Settings.onChange(state => ...)

const STORAGE_KEY = 'designpoke.settings'
const DEFAULTS = { theme: 'auto', opacity: 1, positions: {} }

let state = { ...DEFAULTS }
let loaded = false
const listeners = new Set()
const panels = new Set()
let mediaQuery = null

const clone = obj => JSON.parse(JSON.stringify(obj))

const resolveTheme = theme => {
  if (theme === 'dark' || theme === 'light') return theme
  mediaQuery = mediaQuery || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)'))
  return mediaQuery && mediaQuery.matches ? 'light' : 'dark'
}

const applyTo = host => {
  if (!host || !host.isConnected) return
  host.setAttribute('data-theme', resolveTheme(state.theme))
  host.style.opacity = String(state.opacity)
}

const notify = () => {
  panels.forEach(applyTo)
  listeners.forEach(cb => { try { cb(clone(state)) } catch (e) { console.error(e) } })
}

// ---- 저장 브릿지 ----------------------------------------------------------

const bridgeRequest = (type, payload, timeoutMs = 300) => new Promise(resolve => {
  let done = false
  const onMessage = e => {
    if (e.source !== window || !e.data || e.data.type !== `${type}_RESPONSE`) return
    done = true
    window.removeEventListener('message', onMessage)
    resolve(e.data)
  }
  window.addEventListener('message', onMessage)
  window.postMessage({ type, ...payload }, '*')
  setTimeout(() => {
    if (done) return
    window.removeEventListener('message', onMessage)
    resolve(null)
  }, timeoutMs)
})

const readLocal = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) { return null }
}

const writeLocal = () => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch (e) {}
}

const persist = () => {
  writeLocal()
  bridgeRequest('VISBUG_SETTINGS_SET', { settings: clone(state) }, 100)
}

// ---- 공개 API -------------------------------------------------------------

export async function load() {
  if (loaded) return clone(state)
  const local = readLocal()
  if (local) state = { ...DEFAULTS, ...local, positions: { ...(local.positions || {}) } }

  const remote = await bridgeRequest('VISBUG_SETTINGS_GET', {})
  if (remote && remote.settings) {
    state = { ...DEFAULTS, ...remote.settings, positions: { ...(remote.settings.positions || {}) } }
    writeLocal()
  }

  loaded = true
  if (mediaQuery || state.theme === 'auto') {
    mediaQuery = mediaQuery || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)'))
    mediaQuery && mediaQuery.addEventListener && mediaQuery.addEventListener('change', () => state.theme === 'auto' && notify())
  }
  notify()
  return clone(state)
}

export function get() {
  return clone(state)
}

export function set(patch) {
  const next = { ...state, ...patch }
  if (patch.positions) next.positions = { ...state.positions, ...patch.positions }
  if (typeof next.opacity === 'number') next.opacity = Math.min(1, Math.max(0.3, next.opacity))
  if (!['auto', 'dark', 'light'].includes(next.theme)) next.theme = 'auto'
  state = next
  persist()
  notify()
}

export function setPanelPosition(key, pos) {
  set({ positions: { [key]: pos } })
}

export function getPanelPosition(key) {
  return state.positions[key] || null
}

export function resetPanelPositions() {
  state = { ...state, positions: {} }
  persist()
  notify()
}

export function registerPanel(host) {
  if (!host) return () => {}
  panels.add(host)
  applyTo(host)
  return () => panels.delete(host)
}

export function onChange(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function resolvedTheme() {
  return resolveTheme(state.theme)
}

export const Settings = {
  load, get, set, onChange,
  registerPanel, resolvedTheme,
  setPanelPosition, getPanelPosition, resetPanelPositions,
  DEFAULTS,
}

if (typeof window !== 'undefined') {
  window.DesignPokeSettings = Settings
}

export default Settings
