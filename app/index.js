import VisBug from './components/vis-bug/vis-bug.element'
import { metaKey } from './utilities'

const mobileInfo = document.getElementById('mobile-info')
if ('ontouchstart' in document.documentElement && mobileInfo)
  mobileInfo.style.display = ''

if (metaKey === 'ctrl')
  [...document.querySelectorAll('kbd')]
    .forEach(node => {
      node.textContent = node.textContent.replace('cmd','ctrl')
      node.textContent = node.textContent.replace('opt','alt')
    })
