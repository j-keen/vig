import $ from 'blingblingjs'
import { preferredNotation } from '../color'
import {
  htmlStringToDom, camelToDash,
  getStyles, getShadowValues, getTextShadowValues,
} from '../../utilities/'
import { AIFormatter } from '../ai-formatter'

export function createClipboardHandlers({ getSelected }) {

  const on_copy = async e => {
    const selected = getSelected()
    // if user has selected text, dont try to copy an element
    if (window.getSelection().toString().length)
      return

    if (selected[0] && window.node_clipboard !== selected[0]) {
      e.preventDefault()

      // AI 친화적 식별자로 복사 (간결한 형식)
      const identifier = AIFormatter.getIdentifier(selected[0])
      window.copy_backup = identifier
      e.clipboardData.setData('text/plain', identifier)

      const {state} = await navigator.permissions.query({name:'clipboard-write'})

      if (state === 'granted')
        await navigator.clipboard.writeText(identifier)
    }
  }

  const on_cut = e => {
    const selected = getSelected()
    if (selected[0] && window.node_clipboard !== selected[0]) {
      let $node = selected[0].cloneNode(true)
      $node.removeAttribute('data-selected')
      window.copy_backup = $node.outerHTML
      e.clipboardData.setData('text/html', window.copy_backup)
      selected[0].remove()
    }
  }

  const on_paste = async (e, index = 0) => {
    const selected = getSelected()
    const clipData = e.clipboardData.getData('text/html')
    const globalClipboard = await navigator.clipboard.readText()
    const potentialHTML = clipData || globalClipboard || window.copy_backup

    if (selected.length && potentialHTML) {
      e.preventDefault()

      selected.forEach(el =>
        el.appendChild(
          htmlStringToDom(potentialHTML)))
    }
  }

  const on_copy_styles = async e => {
    const selected = getSelected()
    e.preventDefault()

    window.copied_styles = selected.map(el =>
      getStyles(el))

    try {
      const colormode = $('vis-bug').attr('color-mode')

      const styles = window.copied_styles[0]
        .map(({prop,value}) => {
          if (prop.includes('color') || prop.includes('background-color') || prop.includes('border-color') || prop.includes('Color') || prop.includes('fill') || prop.includes('stroke'))
            value = preferredNotation(value, colormode)

          if (prop.includes('boxShadow')) {
            const [, color, x, y, blur, spread] = getShadowValues(value)
            value = `${preferredNotation(color, colormode)} ${x} ${y} ${blur} ${spread}`
          }

          if (prop.includes('textShadow')) {
            const [, color, x, y, blur] = getTextShadowValues(value)
            value = `${preferredNotation(color, colormode)} ${x} ${y} ${blur}`
          }
          return {prop,value}
        })
        .reduce((message, item) =>
          [...message, `${camelToDash(item.prop)}: ${item.value};`]
        , []).join('\n')

      const {state} = await navigator.permissions.query({name:'clipboard-write'})

      if (styles && state === 'granted') {
        await navigator.clipboard.writeText(styles)
      }
    } catch(e) {
      console.warn(e)
    }
  }

  const on_paste_styles = async (e, index = 0) => {
    const selected = getSelected()
    if (window.copied_styles) {
      selected.forEach(el => {
        window.copied_styles[index]
          .map(({prop, value}) =>
            el.style[prop] = value)

        index >= window.copied_styles.length - 1
          ? index = 0
          : index++
      })
    }
    else {
      const potentialStyles = await navigator.clipboard.readText()

      if (selected.length && potentialStyles)
        selected.forEach(el =>
          el.style = potentialStyles)
    }
  }

  return { on_copy, on_cut, on_paste, on_copy_styles, on_paste_styles }
}
