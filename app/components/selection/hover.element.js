import { Handles } from './handles.element'
import { HandlesStyles, HoverStyles } from '../styles.store'

export class Hover extends Handles {

  constructor() {
    super()
    this.styles = [HandlesStyles, HoverStyles]
  }

  connectedCallback() {
    this.$shadow.adoptedStyleSheets = this.styles

    // Allow wheel events to pass through hover overlay to enable scrolling
    this.addEventListener('wheel', e => {
      // Don't prevent default - let wheel events bubble to the page
    }, { passive: true })
  }

  disconnectedCallback() {}

  render({ width, height, top, left }, node_label_id, isFixed) {
    this.style.setProperty('--top', `${top + (isFixed ? 0 : window.scrollY)}px`)
    this.style.setProperty('--left', `${left}px`)
    this.style.setProperty('--position', isFixed ? 'fixed' : 'absolute')

    return `
      <svg
        width="${width}" height="${height}"
        viewBox="0 0 ${width} ${height}"
      >
        <rect fill="none" width="100%" height="100%"></rect>
    `
  }
}

customElements.define('visbug-hover', Hover)
