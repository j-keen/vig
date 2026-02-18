import { getStyle } from '../../utilities/'
import { createClassname } from '../../utilities/'

export const handleLabelText = (el, activeTool) => {
  switch(activeTool) {
    case 'align':
      return getStyle(el, 'display')

    default:
      return `
        <a node>${el.nodeName.toLowerCase()}</a>
        <a>${el.id && '#' + el.id}</a>
        ${createClassname(el).split('.')
          .filter(name => name != '')
          .reduce((links, name) => `
            ${links}
            <a>.${name}</a>
          `, '')
        }
      `
  }
}
