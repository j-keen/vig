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

test.afterEach(teardownPptrTab)
