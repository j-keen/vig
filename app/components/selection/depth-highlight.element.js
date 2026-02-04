import { Handles } from './handles.element'
import { HandlesStyles, DepthHighlightStyles } from '../styles.store'
import { isFixed } from '../../utilities/'

export class DepthHighlight extends Handles {

  constructor() {
    super()
    this.styles = [HandlesStyles, DepthHighlightStyles]
  }

  connectedCallback() {
    this.$shadow.adoptedStyleSheets = this.styles
    this.setAttribute('popover', 'manual')
    this.showPopover && this.showPopover()
  }

  disconnectedCallback() {
    if (this.hidePopover) {
      try { this.hidePopover() } catch(e) {}
    }
  }

  set position({el, node_label_id, isPrimary, depthLabel}) {
    const rect = el.getBoundingClientRect()
    const fixed = isFixed(el)

    if (isPrimary) {
      this.setAttribute('data-depth-primary', '')
    } else {
      this.removeAttribute('data-depth-primary')
    }

    this.$shadow.innerHTML = this.renderDepth(rect, node_label_id, fixed, depthLabel)
  }

  set locked(isLocked) {
    if (isLocked) {
      this.setAttribute('data-depth-locked', '')
    } else {
      this.removeAttribute('data-depth-locked')
    }
  }

  renderDepth({ width, height, top, left }, node_label_id, isFixed, depthLabel) {
    this.style.setProperty('--top', `${top + (isFixed ? 0 : window.scrollY)}px`)
    this.style.setProperty('--left', `${left}px`)
    this.style.setProperty('--position', isFixed ? 'fixed' : 'absolute')
    this.style.setProperty('--width', `${width}px`)
    this.style.setProperty('--height', `${height}px`)

    return `
      ${depthLabel ? `<span class="depth-label">${depthLabel}</span>` : ''}
      <svg
        width="${width}" height="${height}"
        viewBox="0 0 ${width} ${height}"
      >
        <rect fill="none" width="100%" height="100%"></rect>
      </svg>
    `
  }
}

customElements.define('visbug-depth-highlight', DepthHighlight)
