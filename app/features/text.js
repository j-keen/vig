import $ from 'blingblingjs'
import hotkeys from 'hotkeys-js'
import { showHideNodeLabel } from '../utilities/'
import { ChangeTracker } from './change-tracker'
import '../components/text-toolbar/text-toolbar.element'

const removeEditability = ({target}) => {
  ChangeTracker.updateCurrentText(target)
  target.removeAttribute('contenteditable')
  target.removeAttribute('spellcheck')
  target.removeEventListener('blur', removeEditability)
  target.removeEventListener('keydown', stopBubbling)
  hotkeys.unbind('escape,esc')
}

const stopBubbling = e => e.key != 'Escape' && e.stopPropagation()

const cleanup = (e, handler) => {
  $('[spellcheck="true"]').forEach(target => removeEditability({target}))
  window.getSelection().empty()
}

// ---- Mini floating text toolbar (Canva-style) ----------------------------
// A single <visbug-text-toolbar> is created lazily and reused. It's shown
// whenever EditText runs (text tool selection) and also, via
// TextToolbarFeature, whenever any text-bearing element is plainly selected.

let toolbarEl = null

function ensureToolbar() {
  if (!toolbarEl || !toolbarEl.isConnected) {
    toolbarEl = document.querySelector('visbug-text-toolbar')
      || document.createElement('visbug-text-toolbar')
    if (!toolbarEl.isConnected) document.body.appendChild(toolbarEl)
  }
  return toolbarEl
}

function isVisBugNode(el) {
  if (!el || !el.tagName) return true
  const tag = el.tagName.toLowerCase()
  return tag === 'vis-bug' || tag.startsWith('visbug')
}

function hasDirectText(el) {
  if (!el || !el.childNodes) return false
  return Array.from(el.childNodes).some(node =>
    node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0)
}

export function EditText(elements) {
  if (!elements.length) return

  elements.map(el => {
    let $el = $(el)

    ChangeTracker.captureOriginalText(el)

    $el.attr({
      contenteditable: true,
      spellcheck: true,
    })
    el.focus()
    showHideNodeLabel(el, true)

    $el.on('keydown', stopBubbling)
    $el.on('blur', removeEditability)
  })

  hotkeys('escape,esc', cleanup)

  ensureToolbar().showFor(elements)
}

// Registers a background selection watcher so the mini toolbar also shows
// up for a plain selection (no text-tool / contenteditable needed) whenever
// the selected element has non-empty direct text. Call once from
// vis-bug.element.js: `this.textToolbarFeature = TextToolbarFeature(this)`,
// and call the returned cleanup function on disconnectedCallback.
export function TextToolbarFeature(visbug) {
  const toolbar = ensureToolbar()

  const onSelected = elements => {
    const textEls = (elements || []).filter(el => !isVisBugNode(el) && hasDirectText(el))

    if (textEls.length) toolbar.showFor(textEls)
    else toolbar.hide()
  }

  visbug.selectorEngine.onSelectedUpdate(onSelected)

  return () => {
    visbug.selectorEngine.removeSelectedCallback(onSelected)
    toolbar.hide()
  }
}