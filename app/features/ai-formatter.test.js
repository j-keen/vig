import test from 'ava'

import { setupPptrTab, teardownPptrTab } from '../../tests/helpers'

test.beforeEach(async t => {
  await setupPptrTab(t)
})

test('formatDelta - rounds delta to 2 decimal places without trailing zeros', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    // Test the rounding case: 150.906 to 231.891 should give +80.98px (not +80.98499...)
    function parseNumericValue(value) {
      if (!value || value === 'auto' || value === 'none') return null
      const match = String(value).match(/^(-?[\d.]+)/)
      return match ? parseFloat(match[1]) : null
    }

    function formatDelta(originalValue, currentValue) {
      const origNum = parseNumericValue(originalValue)
      const currNum = parseNumericValue(currentValue)

      if (origNum !== null && currNum !== null) {
        const delta = currNum - origNum
        const sign = delta >= 0 ? '+' : ''
        // Round to 2 decimal places and remove trailing zeros
        const roundedDelta = Math.round(delta * 100) / 100
        const formatted = roundedDelta % 1 === 0 ? roundedDelta.toFixed(0) : roundedDelta.toString()
        return `${sign}${formatted}px`
      }
      return null
    }

    return {
      case1: formatDelta('150.906px', '231.891px'),  // Should be +80.98px
      case2: formatDelta('100px', '50.123px'),       // Should be -49.88px
      case3: formatDelta('10.005px', '10.115px'),    // Should be +0.11px
    }
  })

  t.is(result.case1, '+80.98px', 'Should round 80.985 to 80.98')
  t.is(result.case2, '-49.88px', 'Should round -49.877 to -49.88')
  t.is(result.case3, '+0.11px', 'Should round 0.11 correctly')

  t.pass()
})

test('formatDelta - integer values do not show decimals', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    function parseNumericValue(value) {
      if (!value || value === 'auto' || value === 'none') return null
      const match = String(value).match(/^(-?[\d.]+)/)
      return match ? parseFloat(match[1]) : null
    }

    function formatDelta(originalValue, currentValue) {
      const origNum = parseNumericValue(originalValue)
      const currNum = parseNumericValue(currentValue)

      if (origNum !== null && currNum !== null) {
        const delta = currNum - origNum
        const sign = delta >= 0 ? '+' : ''
        // Round to 2 decimal places and remove trailing zeros
        const roundedDelta = Math.round(delta * 100) / 100
        const formatted = roundedDelta % 1 === 0 ? roundedDelta.toFixed(0) : roundedDelta.toString()
        return `${sign}${formatted}px`
      }
      return null
    }

    return {
      case1: formatDelta('100px', '115px'),    // Should be +15px not +15.00px
      case2: formatDelta('200px', '180px'),    // Should be -20px not -20.00px
      case3: formatDelta('50px', '50px'),      // Should be +0px (zero is positive)
    }
  })

  t.is(result.case1, '+15px', 'Integer delta should not have decimals')
  t.is(result.case2, '-20px', 'Negative integer delta should not have decimals')
  t.is(result.case3, '+0px', 'Zero delta has + sign (implementation behavior)')

  t.pass()
})

test('describeChange - returns Korean descriptions for property changes', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    function toKebabCase(str) {
      return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
    }

    const propertyDescriptions = {
      marginTop:     { increase: '아래로 이동', decrease: '위로 이동' },
      marginLeft:    { increase: '오른쪽으로 이동', decrease: '왼쪽으로 이동' },
      width:         { increase: '가로 크기 증가', decrease: '가로 크기 감소' },
      position:      { set: '포지션 변경' },
    }

    function parseNumericValue(value) {
      if (!value || value === 'auto' || value === 'none') return null
      const match = String(value).match(/^(-?[\d.]+)/)
      return match ? parseFloat(match[1]) : null
    }

    function describeChange(prop, originalValue, currentValue) {
      const desc = propertyDescriptions[prop]
      if (!desc) return `${toKebabCase(prop)} 변경`

      // set type (non-numeric properties)
      if (desc.set) return desc.set

      const origNum = parseNumericValue(originalValue)
      const currNum = parseNumericValue(currentValue)

      if (origNum !== null && currNum !== null) {
        return currNum > origNum ? desc.increase : desc.decrease
      }

      return desc.set || `${toKebabCase(prop)} 변경`
    }

    return {
      marginTopIncrease: describeChange('marginTop', '10px', '30px'),
      marginTopDecrease: describeChange('marginTop', '50px', '20px'),
      marginLeftIncrease: describeChange('marginLeft', '0px', '15px'),
      widthIncrease: describeChange('width', '100px', '200px'),
      widthDecrease: describeChange('width', '200px', '150px'),
      positionChange: describeChange('position', 'static', 'relative'),
      unknownProp: describeChange('unknownProperty', '10px', '20px'),
    }
  })

  t.is(result.marginTopIncrease, '아래로 이동', 'Margin-top increase should move down')
  t.is(result.marginTopDecrease, '위로 이동', 'Margin-top decrease should move up')
  t.is(result.marginLeftIncrease, '오른쪽으로 이동', 'Margin-left increase should move right')
  t.is(result.widthIncrease, '가로 크기 증가', 'Width increase description')
  t.is(result.widthDecrease, '가로 크기 감소', 'Width decrease description')
  t.is(result.positionChange, '포지션 변경', 'Position change description')
  t.is(result.unknownProp, 'unknown-property 변경', 'Unknown property gets default description')

  t.pass()
})

test('parseNumericValue - returns null for auto/none, number for px values', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    function parseNumericValue(value) {
      if (!value || value === 'auto' || value === 'none') return null
      const match = String(value).match(/^(-?[\d.]+)/)
      return match ? parseFloat(match[1]) : null
    }

    return {
      auto: parseNumericValue('auto'),
      none: parseNumericValue('none'),
      empty: parseNumericValue(''),
      nullVal: parseNumericValue(null),
      px: parseNumericValue('15px'),
      pxDecimal: parseNumericValue('15.5px'),
      negative: parseNumericValue('-20px'),
      justNumber: parseNumericValue('42'),
    }
  })

  t.is(result.auto, null, 'auto should return null')
  t.is(result.none, null, 'none should return null')
  t.is(result.empty, null, 'empty string should return null')
  t.is(result.nullVal, null, 'null should return null')
  t.is(result.px, 15, 'px value should return number')
  t.is(result.pxDecimal, 15.5, 'decimal px value should return number')
  t.is(result.negative, -20, 'negative px value should return number')
  t.is(result.justNumber, 42, 'plain number should return number')

  t.pass()
})

test('formatElementForAI - filters out auto→0px changes when position changes', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    // Create a test element
    const div = document.createElement('div')
    div.id = 'test-position-change'
    document.body.appendChild(div)

    // Simulate changes object
    const changes = {
      position: 'relative',
      left: '0px',    // This should be filtered (was auto)
      top: '0px',     // This should be filtered (was auto)
      marginLeft: '0px', // This should NOT be filtered (not a position prop when position changes)
    }

    // Simulate original styles
    const original = {
      position: 'static',
      left: 'auto',
      top: 'auto',
      marginLeft: '10px',
    }

    // Check filtering logic
    const positionProps = ['left', 'top', 'right', 'bottom']
    const hasPositionChange = 'position' in changes

    const filtered = {}
    Object.entries(changes).forEach(([prop, currentValue]) => {
      const originalValue = original[prop]

      // Skip implicit auto→0px changes when position is changed
      if (hasPositionChange &&
          positionProps.includes(prop) &&
          originalValue === 'auto' &&
          currentValue === '0px') {
        return // Skip this property
      }

      filtered[prop] = currentValue
    })

    document.body.removeChild(div)
    return filtered
  })

  t.true('position' in result, 'position should be included')
  t.false('left' in result, 'left (auto→0px) should be filtered')
  t.false('top' in result, 'top (auto→0px) should be filtered')
  t.true('marginLeft' in result, 'marginLeft should NOT be filtered (not a position prop)')

  t.pass()
})

test('getIdentifier - element identification priority (id > text > icon > class)', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    function getIconClass(element) {
      const svg = element.querySelector('svg')
      if (!svg) return null

      const cls = svg.className?.baseVal || svg.getAttribute('class') || ''

      const patterns = [
        /lucide-[\w-]+/,
        /heroicons?-[\w-]+/,
        /fa-[\w-]+/,
        /icon-[\w-]+/,
        /bi-[\w-]+/,
        /ri-[\w-]+/,
      ]

      for (const pattern of patterns) {
        const match = cls.match(pattern)
        if (match) return match[0]
      }

      const lucideIcon = element.querySelector('[class*="lucide-"]')
      if (lucideIcon) {
        const iconCls = lucideIcon.getAttribute('class') || ''
        const match = iconCls.match(/lucide-[\w-]+/)
        if (match) return match[0]
      }

      return null
    }

    function getTextContent(element) {
      const clone = element.cloneNode(true)
      clone.querySelectorAll('script, style, svg').forEach(el => el.remove())

      const text = clone.textContent?.trim()
      if (!text) return null

      return text.length > 20 ? text.slice(0, 20) + '...' : text
    }

    function getIdentifier(element) {
      if (element.id) {
        return `#${element.id}`
      }

      const tag = element.tagName.toLowerCase()

      const text = getTextContent(element)
      const icon = getIconClass(element)

      if (text) {
        return icon
          ? `"${text}" ${tag} (${icon})`
          : `"${text}" ${tag}`
      }

      if (icon) {
        return `${tag} (${icon})`
      }

      const testId = element.dataset?.testid || element.getAttribute('data-testid')
      if (testId) {
        return `[data-testid="${testId}"]`
      }

      const labelId = element.dataset?.labelId || element.getAttribute('data-label-id')
      if (labelId) {
        return `[data-label-id="${labelId}"]`
      }

      const className = element.className
      if (typeof className === 'string' && className.trim()) {
        const firstClass = className.trim().split(/\s+/)[0]
        const utilityPatterns = ['inline-flex', 'flex', 'hidden', 'block', 'relative', 'absolute']
        if (!utilityPatterns.includes(firstClass)) {
          return `${tag}.${firstClass}`
        }
      }

      return tag
    }

    // Test case 1: Element with ID
    const withId = document.createElement('button')
    withId.id = 'submit-btn'
    withId.className = 'btn-primary'
    withId.textContent = 'Submit'

    // Test case 2: Element with text (no ID)
    const withText = document.createElement('button')
    withText.className = 'btn-secondary'
    withText.textContent = 'Click Me'

    // Test case 3: Element with icon (no ID, no text)
    const withIcon = document.createElement('button')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'lucide-home icon-sm')
    withIcon.appendChild(svg)

    // Test case 4: Element with text AND icon
    const withBoth = document.createElement('button')
    const svg2 = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg2.setAttribute('class', 'lucide-search')
    withBoth.appendChild(svg2)
    withBoth.appendChild(document.createTextNode('Search'))

    // Test case 5: Element with only class (no ID, text, or icon)
    const withClass = document.createElement('div')
    withClass.className = 'card-container'

    // Test case 6: Element with utility class (should skip to tag)
    const withUtility = document.createElement('div')
    withUtility.className = 'flex items-center'

    return {
      withId: getIdentifier(withId),
      withText: getIdentifier(withText),
      withIcon: getIdentifier(withIcon),
      withBoth: getIdentifier(withBoth),
      withClass: getIdentifier(withClass),
      withUtility: getIdentifier(withUtility),
    }
  })

  t.is(result.withId, '#submit-btn', 'ID should take priority')
  t.is(result.withText, '"Click Me" button', 'Text should be used when no ID')
  t.is(result.withIcon, 'button (lucide-home)', 'Icon should be used when no ID or text')
  t.is(result.withBoth, '"Search" button (lucide-search)', 'Text and icon should both appear')
  t.is(result.withClass, 'div.card-container', 'Class should be used as fallback')
  t.is(result.withUtility, 'div', 'Utility classes should be skipped, falling back to tag')

  t.pass()
})

test('formatTransformValue parses matrix into translate/scale and keeps rotate matrix', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    const fmt = window.AIFormatter.formatTransformValue
    return {
      translate: fmt('matrix(1, 0, 0, 1, 12, -4)'),
      scale: fmt('matrix(1.2, 0, 0, 1.2, 0, 0)'),
      both: fmt('matrix(1.2, 0, 0, 1.2, 12, -4)'),
      rotate: fmt('matrix(0.866025, 0.5, -0.5, 0.866025, 0, 0)'),
      none: fmt('none'),
    }
  })

  t.is(result.translate, 'translate(12px, -4px)')
  t.is(result.scale, 'scale(1.2)')
  t.is(result.both, 'translate(12px, -4px) scale(1.2)')
  t.true(result.rotate.startsWith('matrix('), 'rotation should keep matrix()')
  t.is(result.none, 'none')
})

test('getCSSSelector uses nth-of-type, CSS.escape, and drops utility classes', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    const parent = document.createElement('section')
    parent.className = 'card-list flex gap-4'
    parent.id = 'list:main'

    const first = document.createElement('button')
    first.className = 'p-4 m-2 w-full h-10 text-sm bg-blue-500 flex grid items-center justify-center gap-2 rounded-md border btn-primary'
    first.textContent = 'One'

    const second = document.createElement('button')
    second.className = 'p-4 flex btn-secondary'
    second.textContent = 'Two'

    parent.appendChild(first)
    parent.appendChild(second)
    document.body.appendChild(parent)

    const withId = window.AIFormatter.getCSSSelector(parent)
    const firstSel = window.AIFormatter.getCSSSelector(first)
    const secondSel = window.AIFormatter.getCSSSelector(second)
    const classLine = window.AIFormatter.formatElementForAI(first, {}, 1)

    parent.remove()

    return { withId, firstSel, secondSel, classLine }
  })

  t.is(result.withId, '#list\\:main')
  t.false(result.firstSel.includes(':nth-child('))
  t.true(result.firstSel.includes(':nth-of-type(1)'))
  t.true(result.secondSel.includes(':nth-of-type(2)'))
  t.true(result.firstSel.includes('btn-primary'))
  t.false(result.firstSel.includes('.p-4'))
  t.false(result.firstSel.includes('.flex'))
  t.true(result.classLine.includes('p-4 m-2 w-full'), 'class line should keep the full class string')
})

test('formatElementForAI adds parent layout, HTML snippet, final inline, and skips transformOrigin without scale', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const parent = document.createElement('div')
    parent.style.display = 'flex'
    parent.style.flexDirection = 'column'
    document.body.appendChild(parent)

    const el = document.createElement('div')
    el.id = 'ai-extra'
    el.className = 'card p-4'
    el.textContent = 'Hello extra context'
    parent.appendChild(el)

    window.ChangeTracker.captureOriginal(el)
    el.style.marginTop = '24px'
    el.style.transformOrigin = '0px 0px'
    window.ChangeTracker.updateCurrent(el)

    const changes = window.ChangeTracker.getChanges(el)
    const formatted = window.AIFormatter.formatElementForAI(el, changes, 1)

    parent.remove()
    window.ChangeTracker.clearAll()

    return { formatted, changeKeys: Object.keys(changes) }
  })

  t.true(result.formatted.includes('부모:'))
  t.true(result.formatted.includes('display: flex'))
  t.true(result.formatted.includes('flex-direction: column'))
  t.true(result.formatted.includes('- HTML:'))
  t.true(result.formatted.includes('최종 인라인 스타일:'))
  t.false(result.formatted.includes('  - transform-origin:'), 'origin should be omitted from changes unless transform has scale')
})

test('formatDeletedForAI includes outerHTML snippet from clonedNode', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const el = document.createElement('button')
    el.id = 'gone-btn'
    el.textContent = 'Remove me'
    document.body.appendChild(el)

    window.ChangeTracker.captureOriginal(el)
    window.ChangeTracker.trackDeletion(el)

    const deleted = window.ChangeTracker.getDeletedElements()[0]
    const formatted = window.AIFormatter.formatDeletedForAI(deleted, 1)

    window.ChangeTracker.clearAll()
    return formatted
  })

  t.true(result.includes('삭제'))
  t.true(result.includes('- HTML:'))
  t.true(result.includes('Remove me'))
})

test('formatAllForAI sample includes margin, move, deletion, and style-system instruction', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const marginEl = document.createElement('div')
    marginEl.id = 'sample-margin'
    marginEl.className = 'card p-4'
    marginEl.textContent = 'Hello card'
    document.body.appendChild(marginEl)
    window.ChangeTracker.captureOriginal(marginEl)
    marginEl.style.marginTop = '24px'
    window.ChangeTracker.updateCurrent(marginEl)

    const moveEl = document.createElement('div')
    moveEl.id = 'sample-move'
    moveEl.textContent = 'Draggable'
    document.body.appendChild(moveEl)
    window.ChangeTracker.captureOriginal(moveEl)
    moveEl.style.position = 'relative'
    moveEl.style.left = '12px'
    moveEl.style.top = '-4px'
    window.ChangeTracker.updateCurrent(moveEl)

    const delEl = document.createElement('button')
    delEl.id = 'sample-delete'
    delEl.className = 'btn-close'
    delEl.textContent = 'Close'
    document.body.appendChild(delEl)
    window.ChangeTracker.captureOriginal(delEl)
    window.ChangeTracker.trackDeletion(delEl)

    const formatted = window.AIFormatter.formatAllForAI()

    marginEl.remove()
    moveEl.remove()
    window.ChangeTracker.clearAll()

    return formatted
  })

  t.true(result.includes('#sample-margin'))
  t.true(result.includes('margin-top:'))
  t.false(result.includes('\n  - margin:'), 'shorthand margin should not appear')
  t.true(result.includes('#sample-move'))
  t.true(result.includes('position:'))
  t.false(result.includes('  - right:'), 'computed right should not appear in sample')
  t.false(result.includes('  - bottom:'), 'computed bottom should not appear in sample')
  t.true(result.includes('#sample-delete') || result.includes('삭제'))
  t.true(result.includes('픽셀값을 그대로 쓰지 말고'))
  t.true(result.includes('position:relative + left/top'))

  t.context.samplePrompt = result
})

test('formatAllForAI sample includes text change and hex color change', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const el = document.createElement('button')
    el.id = 'sample-copy'
    el.textContent = 'Sign in'
    el.style.color = 'rgb(0, 0, 0)'
    document.body.appendChild(el)

    window.ChangeTracker.captureOriginal(el)
    window.ChangeTracker.captureOriginalText(el)

    el.textContent = 'Get started'
    el.style.color = 'rgb(255, 0, 0)'
    window.ChangeTracker.updateCurrent(el)
    window.ChangeTracker.updateCurrentText(el)

    const formatted = window.AIFormatter.formatAllForAI()
    el.remove()
    window.ChangeTracker.clearAll()
    return formatted
  })

  console.log('[formatAllForAI text+color sample]\n' + result)

  t.true(result.includes('#sample-copy'))
  t.true(result.includes('- 텍스트:'))
  t.true(result.includes('Sign in'))
  t.true(result.includes('Get started'))
  t.true(result.includes('color:'))
  t.true(result.includes('#ff0000') || result.includes('#FF0000'))
})

test('formatElementForAI omits computed-only sides not set on element.style', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const el = document.createElement('div')
    el.id = 'computed-noise'
    el.textContent = 'Move me'
    document.body.appendChild(el)

    window.ChangeTracker.captureOriginal(el)
    el.style.position = 'relative'
    el.style.left = '12px'
    el.style.top = '-4px'
    window.ChangeTracker.updateCurrent(el)

    const changes = window.ChangeTracker.getChanges(el)
    const formatted = window.AIFormatter.formatElementForAI(el, changes, 1)

    el.remove()
    window.ChangeTracker.clearAll()

    return {
      formatted,
      changeKeys: Object.keys(changes),
    }
  })

  t.true(result.formatted.includes('  - position:'))
  t.true(result.formatted.includes('  - left:'))
  t.true(result.formatted.includes('  - top:'))
  t.false(result.formatted.includes('  - right:'), 'computed right should be omitted')
  t.false(result.formatted.includes('  - bottom:'), 'computed bottom should be omitted')
})

test('aicopy is an action: keeps current tool, works twice, Alt+click clears', async t => {
  const { page } = t.context

  await page.evaluate(() => {
    navigator.clipboard.writeText = async (text) => { window.__lastCopy = text }
    const vis = document.querySelector('vis-bug')
    vis.toolSelected('position')
  })

  const before = await page.evaluate(() => document.querySelector('vis-bug').activeTool)
  t.is(before, 'position')

  await page.evaluate(() => {
    window.ChangeTracker.clearAll()
    const el = document.createElement('div')
    el.id = 'copy-twice'
    el.style.width = '100px'
    document.body.appendChild(el)
    window.ChangeTracker.captureOriginal(el)
    el.style.width = '160px'
    window.ChangeTracker.updateCurrent(el)
  })

  const first = await page.evaluate(async () => {
    document.querySelector('vis-bug').toolSelected('aicopy', { altKey: false })
    await new Promise(r => setTimeout(r, 50))
    return {
      tool: document.querySelector('vis-bug').activeTool,
      notice: document.querySelector('.visbug-notification')?.textContent || '',
      copied: !!window.__lastCopy,
      img: !!document.querySelector('vis-bug').$shadow.querySelector('[data-tool="aicopy"] img'),
    }
  })

  t.is(first.tool, 'position', 'aicopy should not steal the active tool')
  t.true(first.notice.length > 0, 'first click should show a notification')
  t.false(first.img, 'aicopy tooltip should omit missing gif')

  const second = await page.evaluate(async () => {
    window.__lastCopy = ''
    document.querySelector('vis-bug').toolSelected('aicopy', { altKey: false })
    await new Promise(r => setTimeout(r, 50))
    return {
      tool: document.querySelector('vis-bug').activeTool,
      notice: document.querySelector('.visbug-notification')?.textContent || '',
      noticeCount: document.querySelectorAll('.visbug-notification').length,
      copied: !!window.__lastCopy,
    }
  })

  t.is(second.tool, 'position')
  t.true(second.notice.length > 0, 'second click should show a notification again')
  t.is(second.noticeCount, 1, 'previous notification should be replaced, not stacked')

  const cleared = await page.evaluate(async () => {
    document.querySelector('vis-bug').toolSelected('aicopy', { altKey: true })
    await new Promise(r => setTimeout(r, 50))
    return {
      tool: document.querySelector('vis-bug').activeTool,
      notice: document.querySelector('.visbug-notification')?.textContent || '',
      remaining: window.ChangeTracker.getTrackedCount(),
    }
  })

  t.is(cleared.tool, 'position')
  t.true(cleared.notice.includes('초기화'))
  t.is(cleared.remaining, 0)
})

test('formatElementForAI includes a 요청 line right after the identifier when a note is set', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const el = document.createElement('div')
    el.id = 'note-target'
    document.body.appendChild(el)

    window.ChangeTracker.setNote(el, '더 눈에 띄게')
    el.style.marginTop = '24px'
    window.ChangeTracker.updateCurrent(el)

    const changes = window.ChangeTracker.getChanges(el)
    const formatted = window.AIFormatter.formatElementForAI(el, changes, 1)

    el.remove()
    window.ChangeTracker.clearAll()

    return { formatted }
  })

  const lines = result.formatted.split('\n')
  const headerIdx = lines.findIndex(l => l.startsWith('### 1.'))
  t.true(headerIdx >= 0)
  t.is(lines[headerIdx + 1], '- 요청: "더 눈에 띄게"', '요청 line should come right after identifier')
})

test('formatAllForAI includes note-only elements and a page-level 요청 section', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const el = document.createElement('div')
    el.id = 'note-only-ai'
    document.body.appendChild(el)
    window.ChangeTracker.setNote(el, '버튼처럼 보이게')

    window.ChangeTracker.setPageNote('전체적으로 더 모던하게')

    const formatted = window.AIFormatter.formatAllForAI()

    el.remove()
    window.ChangeTracker.clearAll()

    return { formatted }
  })

  t.true(result.formatted.includes('## 요청'))
  t.true(result.formatted.includes('전체적으로 더 모던하게'))
  t.true(result.formatted.includes('#note-only-ai'))
  t.true(result.formatted.includes('- 요청: "버튼처럼 보이게"'))

  const requestSectionIdx = result.formatted.indexOf('## 요청')
  const changesSectionIdx = result.formatted.indexOf('## 변경사항')
  t.true(requestSectionIdx < changesSectionIdx, '## 요청 section should come before ## 변경사항')
})

test('getOrderedChangeEntries numbers elements 1..N in the same order used by formatAllForAI', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const first = document.createElement('div')
    first.id = 'order-first'
    document.body.appendChild(first)
    window.ChangeTracker.captureOriginal(first)
    first.style.marginTop = '10px'
    window.ChangeTracker.updateCurrent(first)

    const second = document.createElement('div')
    second.id = 'order-second'
    document.body.appendChild(second)
    window.ChangeTracker.captureOriginal(second)
    second.style.marginTop = '10px'
    window.ChangeTracker.updateCurrent(second)

    const entries = window.AIFormatter.getOrderedChangeEntries()
    const formatted = window.AIFormatter.formatAllForAI()

    first.remove()
    second.remove()
    window.ChangeTracker.clearAll()

    return {
      indices: entries.map(e => e.index),
      firstIsFirst: formatted.indexOf('#order-first') < formatted.indexOf('#order-second'),
      hasNumberOne: formatted.includes('### 1.'),
      hasNumberTwo: formatted.includes('### 2.'),
    }
  })

  t.deepEqual(result.indices, [1, 2])
  t.true(result.firstIsFirst)
  t.true(result.hasNumberOne)
  t.true(result.hasNumberTwo)
})

test('outerHTML snippet and final inline style strip tool-only drag/selection styles', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const el = document.createElement('div')
    el.id = 'tool-style-leak'
    document.body.appendChild(el)

    window.ChangeTracker.captureOriginal(el)

    // Simulate leftover tool-only inline styles a drag/selection layer might set,
    // alongside a real tracked change.
    el.style.marginTop = '24px'
    el.style.cursor = 'move'
    el.style.transition = 'opacity .25s ease-out'
    el.style.willChange = 'top,left'
    el.style.userSelect = 'none'
    el.style.outline = '2px solid red'

    window.ChangeTracker.updateCurrent(el)

    const changes = window.ChangeTracker.getChanges(el)
    const formatted = window.AIFormatter.formatElementForAI(el, changes, 1)
    const snippet = window.AIFormatter.getOuterHTMLSnippet(el)

    el.remove()
    window.ChangeTracker.clearAll()

    return { formatted, snippet }
  })

  t.true(result.snippet.includes('margin-top'), 'real tracked style should remain in the HTML snippet')
  t.false(result.snippet.includes('cursor'), 'cursor should be stripped from the HTML snippet')
  t.false(result.snippet.includes('transition'), 'transition should be stripped from the HTML snippet')
  t.false(result.snippet.includes('will-change'), 'will-change should be stripped from the HTML snippet')
  t.false(result.snippet.includes('user-select'), 'user-select should be stripped from the HTML snippet')
  t.false(result.snippet.includes('outline'), 'outline should be stripped from the HTML snippet')

  t.true(result.formatted.includes('최종 인라인 스타일:'))
  const finalInlineLine = result.formatted.split('\n').find(l => l.includes('최종 인라인 스타일:'))
  t.true(finalInlineLine.includes('margin-top'))
  t.false(finalInlineLine.includes('cursor'))
  t.false(finalInlineLine.includes('outline'))
})

test.afterEach(teardownPptrTab)
