import test from 'ava'
import {
  cssColorToHex,
  formatTrackedValue,
  captureOriginalText,
  updateCurrentText,
  getAllChanges,
  getChanges,
  hasChanges,
  getTrackedCount,
  clearAll,
  undo,
  redo,
} from './change-tracker'

function fakeEl(text, extras = {}) {
  return Object.assign({
    tagName: 'DIV',
    textContent: text,
    innerText: text,
    className: '',
    id: extras.id || '',
  }, extras)
}

test.beforeEach(() => {
  clearAll()
})

test.serial('cssColorToHex converts rgb/rgba to #rrggbb / #rrggbbaa', t => {
  t.is(cssColorToHex('rgb(255, 0, 0)'), '#ff0000')
  t.is(cssColorToHex('rgb(0, 128, 255)'), '#0080ff')
  t.is(cssColorToHex('rgba(255, 0, 0, 1)'), '#ff0000')
  t.is(cssColorToHex('rgba(255, 0, 0, 0.5)'), '#ff000080')
  t.is(cssColorToHex('rgb(0 0 0 / 0%)'), '#00000000')
  t.is(cssColorToHex('#abc'), '#aabbcc')
  t.is(cssColorToHex('#ff00aa'), '#ff00aa')
  t.is(cssColorToHex('transparent'), '#00000000')
  t.is(cssColorToHex('blue'), 'blue')
})

test.serial('formatTrackedValue hex-converts color props only', t => {
  t.is(formatTrackedValue('color', 'rgb(0, 0, 0)'), '#000000')
  t.is(formatTrackedValue('backgroundColor', 'rgba(255,255,255,0.5)'), '#ffffff80')
  t.is(formatTrackedValue('fontSize', '16px'), '16px')
  t.is(formatTrackedValue('width', '100px'), '100px')
})

test.serial('text change is tracked, counted, and merged into getAllChanges', t => {
  const el = fakeEl('hello')
  captureOriginalText(el)
  t.false(hasChanges())

  el.textContent = 'world'
  el.innerText = 'world'
  updateCurrentText(el)

  t.true(hasChanges())
  t.is(getTrackedCount(), 1)

  const changes = getChanges(el)
  t.is(changes._text.original, 'hello')
  t.is(changes._text.current, 'world')

  const all = getAllChanges()
  t.is(all.size, 1)
  t.is(all.get(el)._text.current, 'world')
})

test.serial('unchanged text does not create a tracked item', t => {
  const el = fakeEl('same')
  captureOriginalText(el)
  updateCurrentText(el)
  t.false(hasChanges())
  t.is(getAllChanges().size, 0)
})

test.serial('text undo restores original and redo re-applies', t => {
  const el = fakeEl('before')
  captureOriginalText(el)
  el.textContent = 'after'
  el.innerText = 'after'
  updateCurrentText(el)

  const undone = undo()
  t.is(undone.type, 'text')
  t.is(el.textContent, 'before')
  t.false(hasChanges())

  const redone = redo()
  t.is(redone.type, 'text')
  t.is(el.textContent, 'after')
  t.true(hasChanges())
})

test.serial('clearAll drops text changes', t => {
  const el = fakeEl('a')
  captureOriginalText(el)
  el.textContent = 'b'
  updateCurrentText(el)
  t.true(hasChanges())
  clearAll()
  t.false(hasChanges())
  t.is(getTrackedCount(), 0)
})
