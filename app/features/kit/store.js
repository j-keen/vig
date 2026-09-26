// 내 킷 저장소
//   builtin(읽기 전용, id 'builtin:' 접두사) + 사용자 아이템
//
// 저장 위치: 확장 환경에서는 inject.js 브릿지(postMessage)를 통해 chrome.storage.local (전역),
//            샌드박스/브릿지 없음이면 localStorage (사이트별) 로 폴백.
//            (설정 저장소 settings.js 와 동일한 패턴)

import { BUILTIN_KIT } from './builtin'

const STORAGE_KEY = 'designpoke.kit'

let userItems = []
let loaded = false
const listeners = new Set()

const clone = obj => JSON.parse(JSON.stringify(obj))

// ---- 저장 브릿지 (settings.js 와 동일한 패턴) --------------------------------

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
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed : []
  } catch (e) { return [] }
}

const writeLocal = items => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch (e) {}
}

const persist = () => {
  writeLocal(userItems)
  bridgeRequest('VISBUG_KIT_SET', { items: clone(userItems) }, 100)
}

const notify = () => {
  const snapshot = list()
  listeners.forEach(cb => { try { cb(snapshot) } catch (e) { console.error(e) } })
}

// ---- 내부 헬퍼 --------------------------------------------------------------

function isBuiltinId(id) {
  return typeof id === 'string' && id.startsWith('builtin:')
}

function normalizeBuiltinItem(item) {
  const id = isBuiltinId(item.id) ? item.id : `builtin:${item.id}`
  return { ...item, id, builtin: true }
}

function isValidItem(item) {
  return !!item
    && typeof item === 'object'
    && typeof item.id === 'string' && item.id.length > 0
    && typeof item.name === 'string'
    && typeof item.html === 'string'
    && !!item.css && typeof item.css === 'object' && !Array.isArray(item.css)
    && !!item.size && typeof item.size === 'object'
    && typeof item.size.w === 'number' && typeof item.size.h === 'number'
    && !!item.source && typeof item.source === 'object'
}

function normalizeItem(item) {
  return {
    id: item.id,
    name: item.name,
    group: item.group != null ? item.group : null,
    kind: ['style', 'block', 'auto'].includes(item.kind) ? item.kind : 'auto',
    tags: Array.isArray(item.tags) ? item.tags.slice() : [],
    html: item.html,
    css: { ...item.css },
    classes: item.classes || '',
    size: { w: item.size.w, h: item.size.h },
    source: {
      url: (item.source && item.source.url) || '',
      selector: (item.source && item.source.selector) || '',
      file: null,
    },
    createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
  }
}

function makeId() {
  return 'kit:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ---- 공개 API ---------------------------------------------------------------

export async function load() {
  if (loaded) return list()

  userItems = readLocal()

  const remote = await bridgeRequest('VISBUG_KIT_GET', {})
  if (remote && Array.isArray(remote.items)) {
    userItems = remote.items
    writeLocal(userItems)
  }

  loaded = true
  notify()
  return list()
}

export function list() {
  const builtin = BUILTIN_KIT.map(normalizeBuiltinItem)
  const sortedUser = [...userItems].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  return [...builtin, ...sortedUser]
}

export function get(id) {
  return list().find(it => it.id === id) || null
}

export function add(item) {
  const created = normalizeItem({ ...item, id: makeId(), createdAt: Date.now() })
  userItems.push(created)
  persist()
  notify()
  return { ...created }
}

export function update(id, patch) {
  if (isBuiltinId(id)) return null

  const idx = userItems.findIndex(it => it.id === id)
  if (idx === -1) return null

  const merged = normalizeItem({
    ...userItems[idx],
    ...patch,
    id: userItems[idx].id,
    createdAt: userItems[idx].createdAt,
  })
  userItems[idx] = merged
  persist()
  notify()
  return { ...merged }
}

export function remove(id) {
  if (isBuiltinId(id)) return false

  const idx = userItems.findIndex(it => it.id === id)
  if (idx === -1) return false

  userItems.splice(idx, 1)
  persist()
  notify()
  return true
}

export function variantsOf(item) {
  if (!item) return []
  if (!item.group) return [item]
  return list().filter(it => it.group === item.group)
}

export function exportJSON() {
  return JSON.stringify({ version: 1, items: userItems.map(it => ({ ...it })) })
}

export function importJSON(text) {
  let added = 0
  let skipped = 0

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    return { added, skipped }
  }

  const items = parsed && Array.isArray(parsed.items)
    ? parsed.items
    : (Array.isArray(parsed) ? parsed : [])

  const builtinIds = new Set(BUILTIN_KIT.map(it => (isBuiltinId(it.id) ? it.id : `builtin:${it.id}`)))

  items.forEach(raw => {
    if (!isValidItem(raw) || isBuiltinId(raw.id) || builtinIds.has(raw.id)) {
      skipped++
      return
    }

    const exists = userItems.some(it => it.id === raw.id)
    if (exists) {
      skipped++
      return
    }

    userItems.push(normalizeItem(raw))
    added++
  })

  if (added > 0) {
    persist()
    notify()
  }

  return { added, skipped }
}

export function onChange(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export default {
  load, list, get, add, update, remove, variantsOf,
  exportJSON, importJSON, onChange,
}
